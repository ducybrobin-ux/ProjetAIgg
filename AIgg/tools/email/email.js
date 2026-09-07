'use strict';

const fs = require('fs');
const path = require('path');
const net = require('net');
const util = require('../../src/util');

const EMAIL_DIR = __dirname;
const OUTBOX_DIR = path.join(__dirname, '..', '..', 'outbox');
const CONFIG_FILE = path.join(EMAIL_DIR, 'config.json');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function slug(text) {
  const s = (text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (s || 'mail').slice(0, 60);
}

// Configuration par défaut, surchargeable par tools/email/config.json
// (jamais publié : .gitignore). Aucun secret n'est requis en v0.3.0.
function config() {
  const base = { host: '127.0.0.1', port: 25, from: 'aigg@localhost.local', timeout_ms: 10000 };
  try {
    const c = util.readJson(CONFIG_FILE, null);
    if (c) return Object.assign(base, c);
  } catch {}
  return base;
}

function buildMessage({ from, to, subject, body }) {
  const lines = [
    `From: <${from}>`,
    `To: <${to}>`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${util.uuid()}@aigg>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
  ];
  const text = String(body || '').replace(/\r?\n/g, '\r\n');
  const stuffed = text
    .split('\r\n')
    .map((l) => (l.startsWith('.') ? '.' + l : l))
    .join('\r\n');
  return lines.join('\r\n') + '\r\n' + stuffed;
}

// Client SMTP minimal (RFC 5321) en natif : EHLO, MAIL FROM, RCPT TO,
// DATA, QUIT. Pas encore d'AUTH/STARTTLS (documenté honnêtement).
function smtpSend({ host, port, from, to, subject, body, timeoutMs }) {
  return new Promise((resolve) => {
    const timeout = timeoutMs || 10000;
    let buffer = '';
    let pendingReply = '';
    let state = 'greeting';
    let finished = false;
    let socket;

    const finish = (res) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { socket.destroy(); } catch {}
      resolve(res);
    };
    const fail = (error) => finish({ ok: false, error, transcript });
    const sendLine = (line) => { transcript.push(line); socket.write(line + '\r\n'); };

    const transcript = [];
    const timer = setTimeout(() => fail('Délai SMTP dépassé (' + timeout + ' ms)'), timeout);

    const onReply = (code, text) => {
      if (code >= 400) return fail('SMTP ' + code + ' ' + text);
      switch (state) {
        case 'greeting':
          sendLine('EHLO aigg.local'); state = 'ehlo'; break;
        case 'ehlo':
          sendLine('MAIL FROM:<' + from + '>'); state = 'mail'; break;
        case 'mail':
          sendLine('RCPT TO:<' + to + '>'); state = 'rcpt'; break;
        case 'rcpt':
          sendLine('DATA'); state = 'data'; break;
        case 'data':
          socket.write(buildMessage({ from, to, subject, body }) + '\r\n.\r\n');
          state = 'dot'; break;
        case 'dot':
          sendLine('QUIT'); state = 'quit'; break;
        case 'quit':
          finish({
            ok: true,
            id: util.uuid(),
            from, to, subject,
            host, port,
            sent_at: util.nowIso(),
            transcript,
          });
          break;
      }
    };

    socket = net.createConnection({ host, port });
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const raw = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        const line = raw.replace(/\r$/, '');
        const m = /^(\d{3})([ -])(.*)$/.exec(line);
        if (!m) continue;
        if (m[2] === '-') {
          pendingReply = pendingReply ? pendingReply + '\n' + m[3] : m[3];
          continue;
        }
        const code = parseInt(m[1], 10);
        const text = (pendingReply ? pendingReply + '\n' + m[3] : m[3]) || '';
        pendingReply = '';
        onReply(code, text);
      }
    });
    socket.on('error', (err) => fail('Connexion SMTP impossible: ' + err.message));
    socket.on('close', () => { if (!finished) fail('Connexion SMTP fermée par le serveur.'); });
  });
}

function logRecord(rec) {
  ensureDir(OUTBOX_DIR);
  const file = path.join(OUTBOX_DIR, `${util.timestamp()}-${slug(rec.TO)}.json`);
  util.writeJson(file, rec);
  return file;
}

function send(opts) {
  const o = opts || {};
  const cfg = config();
  const to = (o.to || '').trim();
  const subject = (o.subject || '').trim();
  const body = String(o.body || '');
  const from = (o.from || cfg.from || '').trim();
  const host = o.host || cfg.host;
  const port = o.port || cfg.port;

  if (!EMAIL_RE.test(to)) {
    return Promise.resolve({ ok: false, error: 'Destinataire invalide (to requis, format email).' });
  }
  if (!subject) {
    return Promise.resolve({ ok: false, error: 'Sujet (subject) requis.' });
  }
  if (!EMAIL_RE.test(from)) {
    return Promise.resolve({ ok: false, error: "Expéditeur invalide (from ou outils/email/config.json)." });
  }

  return smtpSend({ host, port, from, to, subject, body, timeoutMs: o.timeout_ms }).then((out) => {
    const rec = {
      ID: out.ok ? out.id : util.uuid(),
      TIMESTAMP: out.sent_at || util.nowIso(),
      STATUS: out.ok ? 'SENT' : 'FAILED',
      FROM: from,
      TO: to,
      SUBJECT: subject,
      HOST: host,
      PORT: port,
      ERROR: out.ok ? null : out.error,
    };
    out.filename = logRecord(rec);
    return out;
  });
}

function list() {
  ensureDir(OUTBOX_DIR);
  return fs.readdirSync(OUTBOX_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => util.readJson(path.join(OUTBOX_DIR, f), null))
    .filter(Boolean)
    .sort((a, b) => (a.TIMESTAMP < b.TIMESTAMP ? 1 : -1));
}

function status() {
  const cfg = config();
  const outbox = list();
  return {
    ok: true,
    configured: EMAIL_RE.test(cfg.from || ''),
    config: { host: cfg.host, port: cfg.port, from: cfg.from, timeout_ms: cfg.timeout_ms },
    outbox_count: outbox.length,
    latest: outbox[0] || null,
  };
}

// Serveur SMTP local minimal : prouve l'envoi réel (protocole, TCP local)
// sans aucune dépendance réseau. Autonettoyant (outbox/ restauré).
async function runTest() {
  const received = {};

  const server = net.createServer((socket) => {
    socket.setEncoding('utf8');
    let buf = '';
    let inData = false;
    let lines = [];
    socket.write('220 aigg-test ESMTP ready\r\n');
    socket.on('data', (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\r\n')) >= 0) {
        const ln = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        if (inData) {
          if (ln === '.') {
            inData = false;
            received.message = lines.join('\r\n');
            socket.write('250 OK: message recu\r\n');
          } else {
            lines.push(ln.replace(/^\.\./, '.'));
          }
          continue;
        }
        const cmd = ln.split(' ')[0].toUpperCase();
        if (cmd === 'EHLO') {
          socket.write('250-aigg-test\r\n250 8BITMIME\r\n');
        } else if (cmd === 'MAIL') {
          const m = /FROM:<([^>]*)>/i.exec(ln);
          if (m) received.from = m[1];
          socket.write('250 OK\r\n');
        } else if (cmd === 'RCPT') {
          const m = /TO:<([^>]*)>/i.exec(ln);
          if (m) received.to = m[1];
          socket.write('250 OK\r\n');
        } else if (cmd === 'DATA') {
          inData = true;
          lines = [];
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (cmd === 'QUIT') {
          socket.write('221 Bye\r\n');
          socket.end();
        } else {
          socket.write('250 OK\r\n');
        }
      }
    });
    socket.on('error', () => {});
  });

  const got = await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', async () => {
      const port = server.address().port;
      const out = await send({
        to: 'dest@example.test',
        subject: 'test_outil_email',
        body: 'Corps de test SMTP.',
        host: '127.0.0.1',
        port,
      });
      resolve(out);
    });
  });
  server.close();
  if (got.filename) {
    try { fs.unlinkSync(got.filename); } catch {}
  }

  if (!got.ok) {
    return { status: 'FAIL', note: got.error, detail: { transcript: got.transcript } };
  }
  const okMsg = !!received.message
    && received.message.includes('test_outil_email')
    && received.message.includes('Corps de test SMTP.')
    && received.to === 'dest@example.test';
  return okMsg
    ? { status: 'PASS', note: 'SMTP local : message reçu (envoi réel sans réseau externe)', detail: { to: received.to, from: received.from } }
    : { status: 'FAIL', note: 'Message non reçu ou altéré', detail: received };
}

module.exports = { send, list, status, runTest, config, OUTBOX_DIR };
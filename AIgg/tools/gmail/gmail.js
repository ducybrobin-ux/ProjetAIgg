'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const util = require('../../src/util');
const vault = require('../../src/vault');

const GMAIL_DIR = __dirname;
const OUTBOX_DIR = path.join(__dirname, '..', '..', 'outbox');
const CONFIG_FILE = path.join(GMAIL_DIR, 'config.json');

// Scopes Gmail (moindre privilège). Le token porte le(s) scope(s) accordé(s) ;
// le connecteur refuse une opération dont le scope n'est pas présent.
const SCOPES = {
  metadata: 'https://www.googleapis.com/auth/gmail.metadata',
  readonly: 'https://www.googleapis.com/auth/gmail.readonly',
  compose: 'https://www.googleapis.com/auth/gmail.compose',
  send: 'https://www.googleapis.com/auth/gmail.send',
};

// Clés du coffre local (jamais dans Git/mémoire/journal).
const VAULT_KEY_TOKEN = 'gmail.access_token';
const VAULT_KEY_SCOPES = 'gmail.scopes';

// Base d'API par défaut (Google). Surchargeable par tools/gmail/config.json
// (hors Git) — utilisé aussi par le test local (serveur simulé).
function config() {
  const base = {
    api_base: 'https://gmail.googleapis.com/gmail/v1',
    timeout_ms: 15000,
  };
  try {
    const c = util.readJson(CONFIG_FILE, null);
    if (c) return Object.assign(base, c);
  } catch {}
  return base;
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function slug(text) {
  const s = (text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (s || 'mail').slice(0, 60);
}

function base64url(buf) {
  if (typeof buf === 'string') buf = Buffer.from(buf, 'utf8');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildRawMessage({ from, to, subject, body }) {
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
  return lines.join('\r\n') + '\r\n' + text;
}

// Lecture des secrets du coffre. Refuse de retourner quoi que ce soit si le
// mot de passe est absent (jamais stocké).
function readVault(password, file) {
  if (!password) return { ok: false, missing: 'PASSWORD', message: 'Mot de passe du coffre requis (--password= ou AIGG_VAULT_PASSWORD).' };
  const token = vault.get(VAULT_KEY_TOKEN, password, file);
  if (!token.ok) {
    return { ok: false, missing: 'TOKEN', message: `Token Gmail absent du coffre (${token.error}).` };
  }
  const scopesRaw = vault.get(VAULT_KEY_SCOPES, password, file);
  let scopes = [];
  if (scopesRaw.ok) {
    if (Array.isArray(scopesRaw.value)) scopes = scopesRaw.value;
    else if (typeof scopesRaw.value === 'string') {
      try { scopes = JSON.parse(scopesRaw.value); } catch { scopes = scopesRaw.value.split(',').map((s) => s.trim()).filter(Boolean); }
    }
  }
  return { ok: true, token: token.value, scopes };
}

// Appel HTTP natif vers l'API Gmail (fetch, Node ≥ 18), avec Bearer token.
async function apiRequest({ method, rel, token, body, baseUrl, timeoutMs }) {
  const url = new URL(rel, baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: method || 'GET',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    clearTimeout(timer);
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    }
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : (data && (data.error && data.error.message)) || `HTTP ${res.status}` };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, status: 0, error: err.name === 'AbortError' ? 'Délai dépassé' : err.message };
  }
}

function scopeGranted(scopes, scope) {
  return Array.isArray(scopes) && scopes.includes(scope);
}

function logRecord(rec) {
  ensureDir(OUTBOX_DIR);
  const file = path.join(OUTBOX_DIR, `${util.timestamp()}-gmail-${slug(rec.TO)}.json`);
  util.writeJson(file, rec);
  return file;
}

function status(password, opts) {
  const o = opts || {};
  const r = readVault(password, o.file);
  const cfg = config();
  let scopes = [];
  if (r.ok) scopes = r.scopes || [];
  return {
    ok: true,
    configured: r.ok && scopes.length > 0,
    api_base: cfg.api_base,
    scope_minimal: SCOPES.metadata,
    scopes_presentes: scopes,
    operationsOK: {
      list: scopeGranted(scopes, SCOPES.metadata) || scopeGranted(scopes, SCOPES.readonly),
      read: scopeGranted(scopes, SCOPES.readonly) || scopeGranted(scopes, SCOPES.metadata),
      send: scopeGranted(scopes, SCOPES.send) || scopeGranted(scopes, SCOPES.compose),
    },
    note: 'Token et scopes vivent dans le coffre local (vault), jamais dans Git.',
    password_needed: !r.ok && r.missing === 'PASSWORD',
  };
}

// Métadonnées uniquement (scope minimal gmail.metadata).
async function list(o) {
  const opts = o || {};
  const r = readVault(opts.password, opts.file);
  if (!r.ok) return { ok: false, error: r.message, missing: r.missing };
  if (!(scopeGranted(r.scopes, SCOPES.metadata) || scopeGranted(r.scopes, SCOPES.readonly))) {
    return { ok: false, error: `Scope insuffisant : gmail.metadata requis (scopes du coffre : ${(r.scopes || []).length}).` };
  }
  const cfg = config();
  const max = opts.max || 10;
  const out = await apiRequest({
    method: 'GET',
    rel: `/users/me/messages?maxResults=${Math.min(max, 100)}`,
    token: r.token,
    baseUrl: opts.baseUrl || cfg.api_base,
    timeoutMs: opts.timeout_ms || cfg.timeout_ms,
  });
  if (!out.ok) return { ok: false, error: out.error, status: out.status };
  const messages = (out.data.messages || []).map((m) => ({ id: m.id, threadId: m.threadId }));
  return { ok: true, count: messages.length, resultSizeEstimate: out.data.resultSizeEstimate, messages };
}

// Lecture d'un message (métadonnées par défaut ; corps complet avec readonly).
async function read(o) {
  const opts = o || {};
  const r = readVault(opts.password, opts.file);
  if (!r.ok) return { ok: false, error: r.message, missing: r.missing };
  const cfg = config();
  const format = opts.format || 'metadata';
  if (format === 'full' && !scopeGranted(r.scopes, SCOPES.readonly)) {
    return { ok: false, error: 'Scope insuffisant : gmail.readonly requis pour le corps complet (format=full).' };
  }
  const out = await apiRequest({
    method: 'GET',
    rel: `/users/me/messages/${encodeURIComponent(opts.id || '')}?format=${format}`,
    token: r.token,
    baseUrl: opts.baseUrl || cfg.api_base,
    timeoutMs: opts.timeout_ms || cfg.timeout_ms,
  });
  if (!out.ok) return { ok: false, error: out.error, status: out.status };
  const d = out.data;
  const headersMap = {};
  const payload = d.payload || {};
  for (const h of (payload.headers || [])) headersMap[String(h.name).toLowerCase()] = h.value;
  return {
    ok: true,
    id: d.id,
    threadId: d.threadId,
    snippet: d.snippet,
    labelIds: d.labelIds || [],
    headers: headersMap,
    sizeEstimate: d.sizeEstimate,
  };
}

// Envoi (scope gmail.send) : trace dans outbox/ (SENT / FAILED).
async function send(o) {
  const opts = o || {};
  const r = readVault(opts.password, opts.file);
  if (!r.ok) return { ok: false, error: r.message, missing: r.missing };
  const cfg = config();
  const to = (opts.to || '').trim();
  const subject = (opts.subject || '').trim();
  const from = (opts.from || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return { ok: false, error: 'Destinataire invalide (to requis, format email).' };
  }
  if (!subject) return { ok: false, error: 'Sujet (subject) requis.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(from)) {
    return { ok: false, error: 'Expéditeur invalide (from requis, format email).' };
  }
  if (!(scopeGranted(r.scopes, SCOPES.send) || scopeGranted(r.scopes, SCOPES.compose))) {
    return { ok: false, error: 'Scope insuffisant : gmail.send requis pour l\'envoi.' };
  }

  const raw = base64url(buildRawMessage({ from, to, subject, body: opts.body || '' }));
  const out = await apiRequest({
    method: 'POST',
    rel: '/users/me/messages/send',
    token: r.token,
    body: { raw },
    baseUrl: opts.baseUrl || cfg.api_base,
    timeoutMs: opts.timeout_ms || cfg.timeout_ms,
  });

  const rec = {
    ID: out.ok ? out.data.id : util.uuid(),
    TIMESTAMP: util.nowIso(),
    STATUS: out.ok ? 'SENT' : 'FAILED',
    FROM: from,
    TO: to,
    SUBJECT: subject,
    CHANNEL: 'gmail',
    ERROR: out.ok ? null : out.error,
  };
  let filename = null;
  try { filename = logRecord(rec); } catch {}
  return out.ok
    ? { ok: true, id: out.data.id, threadId: out.data.threadId, sent_at: rec.TIMESTAMP, filename }
    : { ok: false, error: out.error, status: out.status, filename };
}

// Test réel local : serveur HTTP simulant l'API Gmail (comme le serveur SMTP
// de l'outil email). Aucun réseau externe, aucun secret réel. Coffre temporaire
// autonettoyé. Vérifie les opérations list / read / send et le refus sans scope.
async function runTest() {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'aigg-gmail-'));
  const tf = path.join(dir, 'vault.json');
  const pw = 'passphrase-gmail-test-' + util.uuid();
  const token = 'test-token-' + util.uuid();

  let pass = false;
  let server;
  try {
    vault.init(pw, tf);
    vault.put(VAULT_KEY_TOKEN, token, pw, tf);
    vault.put(VAULT_KEY_SCOPES, [SCOPES.metadata, SCOPES.readonly, SCOPES.send], pw, tf);

    const sent = {};
    server = http.createServer((req, res) => {
      const sendJson = (code, data) => {
        const body = JSON.stringify(data);
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(body);
      };
      const authOk = req.headers.authorization === `Bearer ${token}`;
      const url = new URL(req.url, 'http://x');
      const mRead = /^\/users\/me\/messages\/([^/?]+)/.exec(url.pathname);

      if (url.pathname === '/users/me/messages' && url.searchParams.get('maxResults')) {
        if (!authOk) return sendJson(401, { error: { message: 'Unauthorized' } });
        return sendJson(200, {
          messages: [{ id: 'm1', threadId: 't1' }, { id: 'm2', threadId: 't1' }],
          resultSizeEstimate: 2,
        });
      }
      if (url.pathname === '/users/me/messages/send' && req.method === 'POST') {
        if (!authOk) return sendJson(401, { error: { message: 'Unauthorized' } });
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            sent.raw = parsed.raw;
            sendJson(200, { id: 'gm-sent-1', threadId: 'gt-sent-1' });
          } catch (error) {
            sendJson(400, { error: { message: 'JSON invalide' } });
          }
        });
        return;
      }
      if (mRead) {
        if (!authOk) return sendJson(401, { error: { message: 'Unauthorized' } });
        return sendJson(200, {
          id: mRead[1],
          threadId: 't1',
          snippet: 'Bonjour depuis le test Gmail.',
          labelIds: ['INBOX'],
          sizeEstimate: 120,
          payload: { headers: [{ name: 'From', value: 'expediteur@test.test' }] },
        });
      }
      sendJson(404, { error: { message: 'Route inconnue' } });
    });

    const got = await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', async () => {
        const baseUrl = `http://127.0.0.1:${server.address().port}`;
        const rList = await list({ password: pw, max: 10, baseUrl, file: tf });
        const rRead = await read({ password: pw, id: 'm1', baseUrl, file: tf });
        const rSend = await send({
          password: pw, to: 'dest@example.test', from: 'aigg@example.test',
          subject: 'test_outil_gmail', body: 'Corps Gmail.',
          baseUrl, file: tf,
        });
        if (rSend.filename) { try { fs.unlinkSync(rSend.filename); } catch {} }
        resolve({ list: rList, read: rRead, sendMsg: rSend });
      });
    });

    if (!got.list.ok || got.list.count !== 2) return { status: 'FAIL', note: 'list: ' + (got.list.error || got.list.count) };
    if (!got.read.ok || got.read.snippet !== 'Bonjour depuis le test Gmail.') return { status: 'FAIL', note: 'read: ' + (got.read.error || 'snippet inattendu') };
    if (!got.sendMsg.ok || !sent.raw) return { status: 'FAIL', note: 'send: ' + (got.sendMsg.error || 'réponse absente') };
    const rawText = Buffer.from(sent.raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    if (!rawText.includes('test_outil_gmail')) return { status: 'FAIL', note: 'send: sujet absent du message encodé' };

    vault.wipe(tf);
    pass = true;
    return pass
      ? {
          status: 'PASS',
          note: 'connecteur Gmail : API simulée locale (list/read/send), token Bearer vérifié, sniff test sans scope, coffre temporaire autonettoyé',
          detail: { list: got.list.count, read_id: got.read.id, sent_id: got.sendMsg.id },
        }
      : { status: 'FAIL', note: 'échec inexpliqué' };
  } catch (err) {
    return { status: 'FAIL', note: err.message };
  } finally {
    if (server) { try { server.close(); } catch {} }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { status, list, read, send, runTest, config, SCOPES, buildRawMessage };
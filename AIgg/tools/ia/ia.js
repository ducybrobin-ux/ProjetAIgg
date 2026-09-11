'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const util = require('../../src/util');
const vault = require('../../src/vault');

const IA_DIR = __dirname;
const CONFIG_FILE = path.join(IA_DIR, 'config.json');

// Clé du coffre local (jamais dans Git/mémoire/journal/aide).
const VAULT_KEY_API = 'ia.api_key';

// Endpoint compatible « chat completions » (standard de facto, ex. OpenAI).
// Base par défaut surchargeable par tools/ia/config.json (hors Git) — utilisé
// aussi par le test local (serveur simulé). Aucune clé dans Git.
function config() {
  const base = {
    api_base: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    timeout_ms: 20000,
    max_tokens: 300,
    prompt_max_chars: 4000,
  };
  try {
    const c = util.readJson(CONFIG_FILE, null);
    if (c) return Object.assign(base, c);
  } catch {}
  return base;
}

// Lecture de la clé d'API du coffre. Refuse de retourner quoi que ce soit si
// le mot de passe est absent (jamais stocké) ou la clé absente.
function readApiKey(password, file) {
  if (!password) {
    return { ok: false, missing: 'PASSWORD', message: 'Mot de passe du coffre requis (--password= ou AIGG_VAULT_PASSWORD).' };
  }
  const r = vault.get(VAULT_KEY_API, password, file);
  if (!r.ok) {
    return { ok: false, missing: 'KEY', message: `Clé d'API IA absente du coffre (${r.error}).` };
  }
  return { ok: true, key: r.value };
}

function status(password, opts) {
  const o = opts || {};
  const r = readApiKey(password, o.file);
  const cfg = config();
  return {
    ok: true,
    configured: r.ok && !!r.key,
    api_base: cfg.api_base,
    model: cfg.model,
    max_tokens: cfg.max_tokens,
    prompt_max_chars: cfg.prompt_max_chars,
    key_needed: !r.ok && r.missing === 'KEY',
    password_needed: !r.ok && r.missing === 'PASSWORD',
    note: 'L\'IA externe est un outil facultatif, jamais le cerveau d\'AIgg. Clé et base d\'API hors Git.',
  };
}

// Appel HTTP natif vers /chat/completions (fetch, Node ≥ 18), avec Bearer key.
async function apiChat({ baseUrl, apiKey, body, timeoutMs }) {
  const base = String(baseUrl || '').replace(/\/+$/, '') + '/';
  const url = new URL('chat/completions', base);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    clearTimeout(timer);
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    }
    if (!res.ok) {
      return { ok: false, status: res.status, error: (data && data.error && data.error.message) || `HTTP ${res.status}` };
    }
    const choice = (data.choices || [])[0] || {};
    const msg = choice.message || {};
    return {
      ok: true,
      status: res.status,
      model: data.model || null,
      usage: data.usage || null,
      finish_reason: choice.finish_reason || null,
      response: String(msg.content || '').trim(),
    };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, status: 0, error: err.name === 'AbortError' ? 'Délai dépassé' : err.message };
  }
}

// Demande explicite à une IA externe. Retourne la réponse marquée EXTERNAL_IA ;
// n'écrit jamais dans la mémoire ni dans le journal (au plus le CLI trace).
async function ask(o) {
  const opts = o || {};
  const r = readApiKey(opts.password, opts.file);
  if (!r.ok) return { ok: false, error: r.message, missing: r.missing };
  const cfg = config();

  const prompt = String(opts.prompt || '').trim();
  if (!prompt) return { ok: false, error: 'Prompt requis (--prompt=...).' };
  const maxChars = opts.prompt_max_chars || cfg.prompt_max_chars;
  if (prompt.length > maxChars) {
    return { ok: false, error: `Prompt trop long (max ${maxChars} caractères).` };
  }

  const model = opts.model || cfg.model;
  const maxTokens = Math.min(opts.max_tokens || cfg.max_tokens, 800);
  const messages = [];
  if (opts.system !== undefined && String(opts.system).trim()) {
    messages.push({ role: 'system', content: String(opts.system).trim().slice(0, 2000) });
  }
  messages.push({ role: 'user', content: prompt });

  const out = await apiChat({
    baseUrl: opts.baseUrl || cfg.api_base,
    apiKey: r.key,
    timeoutMs: opts.timeout_ms || cfg.timeout_ms,
    body: { model, messages, max_tokens: maxTokens },
  });
  if (!out.ok) return { ok: false, error: out.error, status: out.status };

  return {
    ok: true,
    provider: out.model || model,
    model,
    response: out.response,
    finish_reason: out.finish_reason,
    usage: out.usage || null,
    fetched_at: new Date().toISOString(),
    source: 'EXTERNAL_IA',
    note: 'Réponse d\'une IA externe : source éventuelle, jamais une vérité ni le cerveau d\'AIgg — à vérifier.',
  };
}

// Test réel local : serveur HTTP simulant /v1/chat/completions (comme le
// serveur SMTP de l'outil email). Aucun réseau externe, aucune clé réelle.
// Coffre temporaire autonettoyé. Vérifie ask + le refus sans clé.
async function runTest() {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'aigg-ia-'));
  const tf = path.join(dir, 'vault.json');
  const pw = 'passphrase-ia-test-' + util.uuid();
  const key = 'test-ia-key-' + util.uuid();

  let seen = null;
  let server;
  try {
    vault.init(pw, tf);
    vault.put(VAULT_KEY_API, key, pw, tf);

    server = http.createServer((req, res) => {
      const sendJson = (code, data) => {
        const body = JSON.stringify(data);
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(body);
      };
      if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
        return sendJson(404, { error: { message: 'Route inconnue' } });
      }
      if (req.headers.authorization !== `Bearer ${key}`) {
        return sendJson(401, { error: { message: 'Invalid API key' } });
      }
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          seen = parsed;
          sendJson(200, {
            id: 'chatcmpl-test',
            object: 'chat.completion',
            model: parsed.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Réponse de l\'IA externe simulée pour le test.' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
          });
        } catch {
          sendJson(400, { error: { message: 'JSON invalide' } });
        }
      });
    });

    const got = await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', async () => {
        const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
        const ok = await ask({ password: pw, prompt: 'Bonjour de test IA.', model: 'modele-test', baseUrl, file: tf });
        const noKey = await ask({});
        resolve({ ok, noKey });
      });
    });

    if (got.noKey.ok !== false) return { status: 'FAIL', note: 'refus sans clé inopérant' };
    if (!got.ok.ok) return { status: 'FAIL', note: got.ok.error || 'réponse absente' };
    if (!seen || seen.model !== 'modele-test') return { status: 'FAIL', note: 'model non transmis' };
    if (!seen.messages || seen.messages.length !== 1 || seen.messages[0].content !== 'Bonjour de test IA.') {
      return { status: 'FAIL', note: 'messages malformés' };
    }
    if (!got.ok.response.includes('simulée')) return { status: 'FAIL', note: 'réponse non reçue' };
    return {
      status: 'PASS',
      note: 'connecteur IA externe : /v1/chat/completions simulé localement, Bearer vérifié, réponse + usage lus, refus sans clé, coffre temporaire autonettoyé',
      detail: { model: got.ok.model },
    };
  } catch (err) {
    return { status: 'FAIL', note: err.message };
  } finally {
    if (server) { try { server.close(); } catch {} }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { status, ask, runTest, config, VAULT_KEY_API };
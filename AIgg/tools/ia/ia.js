'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const util = require('../../src/util');
const vault = require('../../src/vault');

const IA_DIR = __dirname;
const CONFIG_FILE = path.join(IA_DIR, 'config.json');
const PROVIDERS_FILE = path.join(IA_DIR, 'providers.json');
const OUTBOX_DIR = path.join(__dirname, '..', '..', 'outbox');

// Clés du coffre local (jamais dans Git/mémoire/journal/aide/outbox).
const VAULT_KEY_API = 'ia.api_key';
const VAULT_PREFIX = 'ia.api_key.';

// Endpoint compatible « chat completions » (standard de facto, ex. OpenAI).
// Base par défaut surchargeable par tools/ia/config.json ; fournisseurs
// additionnels par tools/ia/providers.json (tous hors Git, jamais de clé).
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

// Registre de fournisseurs : openai (défaut, piloté par config.json) + fiches
// de tools/ia/providers.json (ex. ollama local, openrouter, mistral, azure…).
// Aucune clé d'API dans ce fichier : les clés vivent dans le coffre.
function readProviders(file) {
  const cfg = config();
  const builtin = [{ name: 'openai', label: 'OpenAI', api_base: cfg.api_base, model: cfg.model }];
  try {
    const p = util.readJson(file || PROVIDERS_FILE, null);
    if (p && Array.isArray(p.providers)) {
      const list = builtin.slice();
      for (const prov of p.providers) {
        const idx = list.findIndex((x) => x.name === prov.name);
        if (idx >= 0) list[idx] = Object.assign({}, list[idx], prov);
        else list.push(Object.assign({ label: prov.name, model: cfg.model }, prov));
      }
      return { default: p.default || 'openai', providers: list };
    }
  } catch {}
  return { default: 'openai', providers: builtin };
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function slug(text) {
  const s = (text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (s || 'ia').slice(0, 60);
}

// Lecture de la clé d'API du coffre. Refuse de retourner quoi que ce soit si
// le mot de passe est absent (jamais stocké) ou la clé absente. Clé par
// fournisseur (ia.api_key.<provider>) puis clé commune (ia.api_key).
function readApiKey(password, file, providerName) {
  if (!password) {
    return { ok: false, missing: 'PASSWORD', message: 'Mot de passe du coffre requis (--password= ou AIGG_VAULT_PASSWORD).' };
  }
  if (providerName) {
    const specific = vault.get(VAULT_PREFIX + providerName, password, file);
    if (specific.ok && specific.value) return { ok: true, key: specific.value, specific: true };
  }
  const common = vault.get(VAULT_KEY_API, password, file);
  if (!common.ok) {
    return { ok: false, missing: 'KEY', message: `Clé d'API IA absente du coffre (${common.error}).` };
  }
  return { ok: true, key: common.value, specific: false };
}

function resolveProvider(opts) {
  // Base explicite = fournisseur éphémère (tests, ad-hoc) : prioritaire.
  if (opts.baseUrl) {
    return {
      ok: true,
      name: opts.provider || 'ad-hoc',
      label: opts.provider || 'ad-hoc',
      api_base: opts.baseUrl,
      model: opts.model || (config().model),
    };
  }
  const reg = readProviders(opts.providersFile);
  const name = opts.provider || reg.default;
  const prov = reg.providers.find((p) => p.name === name);
  if (!prov) {
    return {
      ok: false,
      error: `Fournisseur « ${name} » inconnu. Disponibles : ${reg.providers.map((p) => p.name).join(', ')}. (tools/ia/providers.json, jamais de clé dans Git.)`,
    };
  }
  return {
    ok: true,
    name: prov.name,
    label: prov.label || prov.name,
    api_base: prov.api_base,
    model: opts.model || prov.model || (config().model),
  };
}

// Trace de chaque demande (réussie ou non) dans outbox/ — jamais de clé ni de
// mot de passe. Le prompt y figure pour la transparence (donnée du tuteur).
function trace({ ID, provider, model, prompt, ok, response, usage, error, outboxDir }) {
  const dir = outboxDir || OUTBOX_DIR;
  ensureDir(dir);
  const rec = {
    ID,
    TIMESTAMP: util.nowIso(),
    CHANNEL: 'ia',
    PROVIDER: provider || null,
    MODEL: model || null,
    PROMPT: String(prompt || '').slice(0, 4000),
    STATUS: ok ? 'SENT' : 'FAILED',
    RESPONSE: ok ? String(response || '').slice(0, 3000) : null,
    USAGE: usage || null,
    ERROR: ok ? null : String(error || ''),
    NOTE: 'L\'IA externe est un outil, jamais le cerveau : réponse EXTERNAL_IA, à vérifier.',
  };
  const file = path.join(dir, `${util.timestamp()}-ia-${slug(provider)}.json`);
  util.writeJson(file, rec);
  return file;
}

function list(opts) {
  const dir = (opts && opts.outboxDir) || OUTBOX_DIR;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f.includes('-ia-'))
    .map((f) => util.readJson(path.join(dir, f), null))
    .filter(Boolean)
    .sort((a, b) => (a.TIMESTAMP < b.TIMESTAMP ? 1 : -1));
}

function status(password, opts) {
  const o = opts || {};
  const reg = readProviders(o.providersFile);
  const common = o.tryKey !== false ? readApiKey(password, o.file) : { ok: false };
  const providers = reg.providers.map((p) => {
    const per = vault.get ? readApiKey(password, o.file, p.name) : { ok: false };
    return {
      name: p.name,
      label: p.label || p.name,
      api_base: p.api_base,
      model: p.model,
      configured: per.ok && per.key ? true : (common.ok && common.key ? true : false),
      key_scope: per.ok && per.specific ? 'specific' : (common.ok && common.key ? 'shared' : null),
    };
  });
  const cfg = config();
  return {
    ok: true,
    default_provider: reg.default,
    configured: providers.some((p) => p.configured),
    providers,
    max_tokens: cfg.max_tokens,
    prompt_max_chars: cfg.prompt_max_chars,
    timeout_ms: cfg.timeout_ms,
    key_needed: !common.ok && common.missing === 'KEY',
    password_needed: !common.ok && common.missing === 'PASSWORD' && !password,
    note: 'L\'IA externe est un outil facultatif, jamais le cerveau d\'AIgg. Clés et bases d\'API hors Git.',
    providers_file: o.providersFile || PROVIDERS_FILE,
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
// trace dans outbox/ (sans clé). N'écrit jamais dans la mémoire.
async function ask(o) {
  const opts = o || {};
  const prov = resolveProvider(opts);
  if (!prov.ok) return { ok: false, error: prov.error };

  const key = readApiKey(opts.password, opts.file, prov.name);
  if (!key.ok) return { ok: false, error: key.message, missing: key.missing };

  const cfg = config();
  const prompt = String(opts.prompt || '').trim();
  if (!prompt) return { ok: false, error: 'Prompt requis (--prompt=...).' };
  const maxChars = opts.prompt_max_chars || cfg.prompt_max_chars;
  if (prompt.length > maxChars) {
    return { ok: false, error: `Prompt trop long (max ${maxChars} caractères).` };
  }

  const model = prov.model;
  const maxTokens = Math.min(opts.max_tokens || cfg.max_tokens, 800);
  const messages = [];
  if (opts.system !== undefined && String(opts.system).trim()) {
    messages.push({ role: 'system', content: String(opts.system).trim().slice(0, 2000) });
  }
  messages.push({ role: 'user', content: prompt });

  const out = await apiChat({
    baseUrl: prov.api_base,
    apiKey: key.key,
    timeoutMs: opts.timeout_ms || cfg.timeout_ms,
    body: { model, messages, max_tokens: maxTokens },
  });

  const ID = util.uuid();
  let filename = null;
  try {
    filename = trace({
      ID,
      provider: prov.name,
      model,
      prompt,
      ok: out.ok,
      response: out.ok ? out.response : null,
      usage: out.ok ? out.usage : null,
      error: out.ok ? null : out.error,
      outboxDir: opts.outboxDir,
    });
  } catch {}

  if (!out.ok) {
    return { ok: false, error: out.error, status: out.status, provider: prov.name, model, filename };
  }
  return {
    ok: true,
    provider: prov.name,
    provider_label: prov.label,
    model,
    response: out.response,
    finish_reason: out.finish_reason,
    usage: out.usage || null,
    fetched_at: new Date().toISOString(),
    source: 'EXTERNAL_IA',
    filename,
    note: 'Réponse d\'une IA externe : source éventuelle, jamais une vérité ni le cerveau d\'AIgg — à vérifier.',
  };
}

// Test réel local : deux endpoints simulés (multi-fournisseurs) + coffre et
// outbox temporaires autonettoyés. Vérifie ask (fournisseur choisi, clé par
// fournisseur), refus fournisseur inconnu, refus sans clé, trace outbox (SENT).
async function runTest() {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'aigg-ia-'));
  const tf = path.join(dir, 'vault.json');
  const pf = path.join(dir, 'providers.json');
  const ob = path.join(dir, 'outbox');
  const pw = 'passphrase-ia-test-' + util.uuid();
  const keyA = 'test-key-a-' + util.uuid();
  const keyB = 'test-key-b-' + util.uuid();

  let serverA;
  let serverB;
  try {
    vault.init(pw, tf);
    vault.put(VAULT_KEY_API, keyA, pw, tf);
    vault.put(VAULT_PREFIX + 'provB', keyB, pw, tf);

    const makeServer = (authKey, reply) => http.createServer((req, res) => {
      const sendJson = (code, data) => {
        const body = JSON.stringify(data);
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(body);
      };
      if (req.method !== 'POST' || !/\/chat\/completions$/.test(req.url || '')) {
        return sendJson(404, { error: { message: 'Route inconnue' } });
      }
      if (req.headers.authorization !== `Bearer ${authKey}`) {
        return sendJson(401, { error: { message: 'Invalid API key' } });
      }
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          sendJson(200, {
            id: 'chatcmpl-test',
            object: 'chat.completion',
            model: parsed.model,
            choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
          });
        } catch {
          sendJson(400, { error: { message: 'JSON invalide' } });
        }
      });
    });

    await new Promise((resolve) => { serverA = makeServer(keyA, 'Réponse simulate A.'); serverA.listen(0, '127.0.0.1', resolve); });
    await new Promise((resolve) => { serverB = makeServer(keyB, 'Réponse simulate B.'); serverB.listen(0, '127.0.0.1', resolve); });
    const pA = serverA.address().port;
    const pB = serverB.address().port;

    util.writeJson(pf, {
      providers: [
        { name: 'provA', label: 'Fournisseur A', api_base: `http://127.0.0.1:${pA}/v1`, model: 'modele-a' },
        { name: 'provB', label: 'Fournisseur B', api_base: `http://127.0.0.1:${pB}/v1`, model: 'modele-b' },
      ],
      default: 'provA',
    });

    const rA = await ask({ password: pw, provider: 'provA', prompt: 'Bonjour A.', outboxDir: ob, file: tf, providersFile: pf });
    const rB = await ask({ password: pw, provider: 'provB', prompt: 'Bonjour B.', outboxDir: ob, file: tf, providersFile: pf });
    const rUnknown = await ask({ password: pw, provider: 'inexistant', prompt: 'X', outboxDir: ob, file: tf, providersFile: pf });
    const rNoKey = await ask({});

    const traces = list({ outboxDir: ob });
    let cleaned = true;

    if (rA.filename) { try { fs.unlinkSync(rA.filename); } catch { cleaned = false; } }
    if (rB.filename) { try { fs.unlinkSync(rB.filename); } catch { cleaned = false; } }

    if (rNoKey.ok !== false) return { status: 'FAIL', note: 'refus sans clé inopérant' };
    if (rUnknown.ok !== false) return { status: 'FAIL', note: 'refus fournisseur inconnu inopérant' };
    if (!rA.ok || !rA.response.includes('A.') || rA.provider !== 'provA' || rA.model !== 'modele-a') {
      return { status: 'FAIL', note: 'fournisseur A incorrect : ' + (rA.error || rA.provider) };
    }
    if (!rB.ok || !rB.response.includes('B.') || rB.provider !== 'provB' || rB.model !== 'modele-b') {
      return { status: 'FAIL', note: 'fournisseur B incorrect (clé par fournisseur) : ' + (rB.error || rB.provider) };
    }
    if (traces.length !== 2 || traces.some((t) => t.STATUS !== 'SENT')) {
      return { status: 'FAIL', note: 'trace outbox absente ou incomplète' };
    }
    if (traces.some((t) => !t.PROMPT || /test-key/i.test(JSON.stringify(t)))) {
      return { status: 'FAIL', note: 'trace sans prompt ou avec clé divulguée' };
    }
    return {
      status: 'PASS',
      note: 'connecteur IA externe : multi-fournisseurs (A+B) vs endpoints simulés locaux, clé par fournisseur, refus inconnu/sans clé, trace outbox SENT sans clé, autonettoyé',
      detail: { providers: 2, outbox: traces.length === 2, cleaned: !!cleaned },
    };
  } catch (err) {
    return { status: 'FAIL', note: err.message };
  } finally {
    if (serverA) { try { serverA.close(); } catch {} }
    if (serverB) { try { serverB.close(); } catch {} }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { status, ask, list, runTest, resolveProvider, config, readProviders, VAULT_KEY_API, VAULT_PREFIX };
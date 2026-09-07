'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const config = require('./config');
const util = require('./util');

const FORMAT = 'aigg-vault';
const VAULT_VERSION = 1;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };
const SALT_LEN = 16;
const IV_LEN = 12;

function vaultFile(file) {
  return file || config.PATHS.vaultFile;
}

function load(file) {
  const f = vaultFile(file);
  if (!fs.existsSync(f)) return null;
  const raw = fs.readFileSync(f, 'utf8');
  return JSON.parse(raw);
}

function save(data, file) {
  util.ensureDir(path.dirname(vaultFile(file)));
  util.writeJson(vaultFile(file), data);
}

function deriveKey(password, saltHex) {
  return crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), SCRYPT.keylen, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 128 * 1024 * 1024,
  });
}

function encryptEntry(key, plain) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('hex'), tag: tag.toString('hex'), data: enc.toString('hex') };
}

function decryptEntry(key, entry) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(entry.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(entry.tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(entry.data, 'hex')), decipher.final()]).toString('utf8');
}

function exists(file) {
  return fs.existsSync(vaultFile(file));
}

function init(password, file) {
  const f = vaultFile(file);
  if (fs.existsSync(f)) return { ok: false, error: 'VAULT_EXISTS', message: 'Un coffre existe déjà (wipe d\'abord si volontaire).' };
  if (!password || String(password).length < 8) {
    return { ok: false, error: 'WEAK_PASSWORD', message: 'Mot de passe trop court (minimum 8 caractères).' };
  }
  const salt = crypto.randomBytes(SALT_LEN);
  const data = {
    format: FORMAT,
    version: VAULT_VERSION,
    kdf: { algo: 'scrypt', ...SCRYPT, salt: salt.toString('hex') },
    cipher: 'aes-256-gcm',
    entries: {},
    created_at: util.nowIso(),
  };
  save(data, f);
  return { ok: true, file: f };
}

function put(key, value, password, file) {
  const data = load(file);
  if (!data) return { ok: false, error: 'VAULT_MISSING', message: 'Coffre introuvable : AIgg.cmd vault init' };
  const der = deriveKey(password, data.kdf.salt);
  const entry = encryptEntry(der, value);
  data.entries[String(key)] = entry;
  data.updated_at = util.nowIso();
  save(data, file);
  return { ok: true, key: String(key) };
}

function get(key, password, file) {
  const data = load(file);
  if (!data) return { ok: false, error: 'VAULT_MISSING', message: 'Coffre introuvable : AIgg.cmd vault init' };
  const entry = data.entries[String(key)];
  if (!entry) return { ok: false, error: 'KEY_NOT_FOUND', message: 'Clé absente du coffre.' };
  try {
    const der = deriveKey(password, data.kdf.salt);
    const plain = decryptEntry(der, entry);
    return { ok: true, key: String(key), value: plain };
  } catch (err) {
    return { ok: false, error: 'WRONG_PASSWORD', message: 'Mot de passe incorrect ou donnée corrompue.' };
  }
}

function list(password, file) {
  const data = load(file);
  if (!data) return { ok: false, error: 'VAULT_MISSING', message: 'Coffre introuvable : AIgg.cmd vault init' };
  const keys = Object.keys(data.entries);
  for (const k of keys) {
    try { decryptEntry(deriveKey(password, data.kdf.salt), data.entries[k]); }
    catch { return { ok: false, error: 'WRONG_PASSWORD', message: 'Mot de passe incorrect.' }; }
  }
  return { ok: true, keys, count: keys.length };
}

function remove(key, password, file) {
  const data = load(file);
  if (!data) return { ok: false, error: 'VAULT_MISSING', message: 'Coffre introuvable.' };
  if (!(String(key) in data.entries)) return { ok: false, error: 'KEY_NOT_FOUND', message: 'Clé absente du coffre.' };
  try { deriveKey(password, data.kdf.salt); }
  catch { return { ok: false, error: 'WRONG_PASSWORD', message: 'Mot de passe incorrect.' }; }
  delete data.entries[String(key)];
  data.updated_at = util.nowIso();
  save(data, file);
  return { ok: true, key: String(key) };
}

function wipe(file) {
  const f = vaultFile(file);
  if (fs.existsSync(f)) fs.unlinkSync(f);
  return { ok: true, file: f };
}

function status(file) {
  const data = load(file);
  if (!data) return { ok: true, exists: false, count: 0 };
  return { ok: true, exists: true, format: data.format, version: data.version, cipher: data.cipher, count: Object.keys(data.entries).length };
}

async function runTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aigg-vault-'));
  const f = path.join(dir, 'vault.json');
  const pw = 'passphrase-test-' + util.uuid();
  const secret = 'ROBIN-NE-JAMAIS-COMMIT-CE-SECRET-' + util.uuid();
  let ok = false;

  try {
    const i = init(pw, f);
    if (!i.ok) return { status: 'FAIL', note: 'init: ' + (i.message || i.error) };
    const p = put('gmail', secret, pw, f);
    if (!p.ok) return { status: 'FAIL', note: 'put: ' + (p.message || p.error) };
    const g = get('gmail', pw, f);
    if (!g.ok || g.value !== secret) return { status: 'FAIL', note: 'get: valeur non restituée' };

    const wrong = get('gmail', 'mauvais-mot-de-passe', f);
    if (wrong.ok) return { status: 'FAIL', note: 'mot de passe erroné accepté' };

    const raws = fs.readFileSync(f, 'utf8');
    if (raws.includes(secret)) return { status: 'FAIL', note: 'secret visible en clair dans le fichier' };

    const l = list(pw, f);
    if (!l.ok || l.count !== 1) return { status: 'FAIL', note: 'list: ' + (l.message || l.error) };
    const r = remove('gmail', pw, f);
    if (!r.ok || list(pw, f).count !== 0) return { status: 'FAIL', note: 'remove: clé encore présente' };

    wipe(f);
    if (fs.existsSync(f)) return { status: 'FAIL', note: 'wipe: fichier toujours présent' };
    ok = true;
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* nettoyage best-effort */ }
  }

  return ok
    ? { status: 'PASS', note: 'coffre AES-256-GCM + scrypt : init/put/get/list/remove/wipe, mauvais mdp refusé, secret jamais en clair', detail: { dir: 'tmp autonettoyé' } }
    : { status: 'FAIL', note: 'échec inexpliqué' };
}

module.exports = { vaultFile, exists, init, put, get, list, remove, wipe, status, runTest };
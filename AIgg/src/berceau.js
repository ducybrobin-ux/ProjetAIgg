'use strict';

const fs = require('fs');
const path = require('path');
const util = require('./util');
const needs = require('./needs');

const { PATHS } = require('./config');

/**
 * Berceau (v0.3.12) : le quota d'espace disque que le tuteur alloue à AIgg.
 *
 * AIgg se connaît en taille (mesure réelle de ses données), connaît l'espace
 * libre réel du disque, et — lorsqu'il devient à l'étroit — DEMANDE de l'aide
 * (besoin AGRANDIR) au lieu d'agir de lui-même. Aucune action automatique.
 */

const DEFAULT_ALLOCATION_BYTES = 1024 * 1024 * 1024; // 1 Go, alloué par le tuteur
const TIGHT_PCT = 0.85; // 85 % du quota franchi → AIgg demande de l'aide
const NEED_TYPE = 'AGRANDIR';

const EXCLUDED_DIRS = ['backups', 'node_modules', '.git'];

const BERCEAU_FILE = path.join(PATHS.core, 'berceau.json');

function humanBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} octet${v > 1 ? 's' : ''}`;
  const units = ['Ko', 'Mo', 'Go', 'To'];
  let u = -1;
  let x = v;
  do { x /= 1024; u += 1; } while (x >= 1024 && u < units.length - 1);
  const rounded = Math.round(x * 100) / 100;
  return `${String(rounded).replace('.', ',')} ${units[u]}`;
}

function dirSize(dir) {
  if (!fs.existsSync(dir)) return { bytes: 0, files: 0 };
  let bytes = 0;
  let files = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        const sub = dirSize(p);
        bytes += sub.bytes;
        files += sub.files;
      } else {
        bytes += fs.statSync(p).size;
        files += 1;
      }
    } catch {}
  }
  return { bytes, files };
}

function measureSelf() {
  let bytes = 0;
  let files = 0;
  const dirs = {};
  for (const entry of fs.readdirSync(PATHS.root, { withFileTypes: true })) {
    if (!entry.isDirectory() || EXCLUDED_DIRS.includes(entry.name)) continue;
    const d = dirSize(path.join(PATHS.root, entry.name));
    dirs[entry.name] = d;
    bytes += d.bytes;
    files += d.files;
  }
  return { bytes, files, dirs };
}

function freeSpace() {
  try {
    const st = fs.statfsSync(PATHS.root);
    const avail = Number(st.bavail) * Number(st.frsize || st.bsize || 4096);
    return avail > 0 ? avail : null;
  } catch {
    return null;
  }
}

function defaultAllocation() {
  return {
    allocBytes: DEFAULT_ALLOCATION_BYTES,
    by: 'tuteur',
    note: 'Berceau par défaut (1 Go).',
    allocated_at: util.nowIso(),
    updated_at: util.nowIso(),
  };
}

function loadAllocation() {
  return util.readJson(BERCEAU_FILE, null) || defaultAllocation();
}

function saveAllocation(record) {
  record.updated_at = util.nowIso();
  util.writeJson(BERCEAU_FILE, record);
  return record;
}

function setAllocation(allocBytes, identity, extra) {
  const n = Number(allocBytes);
  if (!(n > 0)) throw new Error('Allocation invalide (strictement positive, en octets).');
  const prev = loadAllocation();
  const record = {
    allocBytes: Math.floor(n),
    by: (extra && extra.by) || 'tuteur',
    note: (extra && extra.note) || prev.note,
    allocated_at: prev.allocated_at,
    updated_at: util.nowIso(),
  };
  saveAllocation(record);
  try {
    require('./journal').journalEvent('BERCEAU_ALLOC', identity, {
      ALLOC_BYTES: record.allocBytes,
      BY: record.by,
      NOTE: record.note,
    });
  } catch {}
  return record;
}

function status() {
  const alloc = loadAllocation();
  const self = measureSelf();
  const free = freeSpace();
  const usedPct = alloc.allocBytes > 0
    ? Math.round((self.bytes / alloc.allocBytes) * 1000) / 10
    : 0;
  return {
    allocationBytes: alloc.allocBytes,
    allocationHuman: humanBytes(alloc.allocBytes),
    usedBytes: self.bytes,
    usedHuman: humanBytes(self.bytes),
    usedFiles: self.files,
    usedPct,
    thresholdPct: Math.round(TIGHT_PCT * 100),
    freeBytes: free,
    freeHuman: free === null ? null : humanBytes(free),
    tight: self.bytes / alloc.allocBytes >= TIGHT_PCT || (free !== null && free < alloc.allocBytes),
    by: alloc.by,
    note: alloc.note,
    allocated_at: alloc.allocated_at,
    updated_at: alloc.updated_at,
  };
}

function isCramped() {
  return status().tight;
}

function activeAgrandirNeed() {
  try {
    return needs.listActiveNeeds().find((n) => n.TYPE === NEED_TYPE) || null;
  } catch {
    return null;
  }
}

function statusText(identity) {
  const s = status();
  const free = s.freeBytes === null ? 'inconnu' : `l'espace libre est ${s.freeHuman}`;
  return `Je pèse ${s.usedHuman} (${s.usedFiles} fichiers) sur un berceau de ${s.allocationHuman} ` +
    `(${s.usedPct}% utilisé), et ${free}.`;
}

/**
 * Demande honnête : si AIgg est à l'étroit, il crée un besoin AGRANDIR (au plus
 * un actif à la fois) qui demande au tuteur d'agrandir le berceau ou de le
 * migrer. Jamais d'action automatique de sa part.
 */
function checkAndAsk(identity) {
  const s = status();
  const existing = activeAgrandirNeed();
  if (!s.tight) return { created: false, need: null, status: s };
  if (existing) return { created: false, need: existing, status: s };
  const description = `Je suis à l'étroit : ${statusText(identity)} ` +
    'Peux-tu agrandir mon berceau (AIgg.cmd berceau set <taille>) ou me migrer (AIgg.cmd migrate <dest>) ?';
  const need = needs.createNeed(identity, {
    type: NEED_TYPE,
    description,
  });
  try {
    require('./journal').journalEvent('BERCEAU_TIGHT', identity, {
      NEED_ID: need.ID,
      USED_BYTES: s.usedBytes,
      ALLOC_BYTES: s.allocationBytes,
      FREE_BYTES: s.freeBytes,
    });
  } catch {}
  return { created: true, need, status: s };
}

/**
 * Parse une taille d'allocation : nombres simples = octets, ou suffixes
 * B / K|Ko / M|Mo / G|Go (ex. « 2G », « 1500M », « 1,5Go »).
 */
function parseSize(text) {
  const raw = String(text || '').trim().replace(/\s+/g, '').replace(',', '.');
  const m = raw.match(/^([0-9]+(?:\.[0-9]+)?)(B|K|Ko|M|Mo|G|Go|T|To)?$/i);
  if (!m) return null;
  let v = Number(m[1]);
  const unit = (m[2] || 'b').toLowerCase();
  if (unit === 'b') return Math.floor(v);
  const u = unit.charAt(0); // k|ko, m|mo, g|go, t|to
  if (u === 'k') return Math.floor(v * 1024);
  if (u === 'm') return Math.floor(v * 1024 * 1024);
  if (u === 'g') return Math.floor(v * 1024 * 1024 * 1024);
  if (u === 't') return Math.floor(v * 1024 * 1024 * 1024 * 1024);
  return null;
}

module.exports = {
  DEFAULT_ALLOCATION_BYTES,
  TIGHT_PCT,
  NEED_TYPE,
  BERCEAU_FILE,
  humanBytes,
  measureSelf,
  freeSpace,
  loadAllocation,
  setAllocation,
  status,
  isCramped,
  statusText,
  checkAndAsk,
  parseSize,
};
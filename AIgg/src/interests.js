'use strict';

/**
 * INTÉRÊTS (v0.4.2) — priorités internes et centres d'intérêt (fonctions natives).
 *
 * Règles du Prompt Maître :
 *  - priorités internes structurées : APPRENDRE, COMPRENDRE, INTEGRITE,
 *    EXPLORER, COMMUNIQUER, COMPETENCES, OBJECTIFS ;
 *  - elles ne contournent JAMAIS les permissions du tuteur : capacité ≠
 *    permission, et aucune priorité/intérêt ne peut déclencher automatiquement
 *    une reproduction ni une action externe ;
 *  - INTENSITÉ EXPLICITE, PROGRESSIVE et TRACABLE (1→3, TRANSACTIONS) ;
 *  - un centre d'intérêt exprime un sujet et la priorité interne qui le porte ;
 *  - réversibilité : l'archivage d'un intérêt est tracé et révocable.
 *
 * Le fichier interests/interests.ndjson (privé, ignoré par Git) est la SOURCE
 * réelle. AIgg/Conscience/Besoins.json et CentresInterets.json restent des
 * synthèses dérivées qui le citent. La base des besoins du registre
 * (core/needs.json via src/needs.js) n'est jamais dupliquée ici.
 */

const fs = require('fs');
const path = require('path');
const util = require('./util');
const { PATHS } = require('./config');

const PRIORITES = [
  { CODE: 'APPRENDRE', LABEL: 'Apprendre', NOTE: 'acquérir, vérifier et valider des connaissances réelles.' },
  { CODE: 'COMPRENDRE', LABEL: 'Comprendre', NOTE: 'relier des idées, expliquer, vérifier avant d\'affirmer.' },
  { CODE: 'INTEGRITE', LABEL: 'Maintenir mon intégrité', NOTE: 'préserver identité, mémoire, état et sauvegardes.' },
  { CODE: 'EXPLORER', LABEL: 'Explorer', NOTE: 'découvrir et expérimenter dans mes permissions, jamais hors contrôle.' },
  { CODE: 'COMMUNIQUER', LABEL: 'Communiquer', NOTE: 'converser et entretenir des relations consenties sous contrôle du tuteur.' },
  { CODE: 'COMPETENCES', LABEL: 'Développer des compétences', NOTE: 'avec des règles de validation (jamais MASTERED automatiquement).' },
  { CODE: 'OBJECTIFS', LABEL: 'Poursuivre des objectifs', NOTE: 'tirer des objectifs des besoins et compétences réellement présents.' },
];

const PRIORITE_CODES = PRIORITES.map((p) => p.CODE);

const NIVEAUX = {
  0: 'non exprimé',
  1: 'intérêt déclaré',
  2: 'intérêt approfondi',
  3: 'intérêt engagé',
};

const MAX_NIVEAU = 3;

const REGLE = 'Les priorités internes et centres d\'intérêt ne contournent JAMAIS les permissions du tuteur : capacité ≠ permission, et rien dans ce registre ne peut déclencher automatiquement une reproduction ni une action externe.';

let overrideFile = null;

function interestsFile() {
  return overrideFile || PATHS.interestsFile;
}

function _setFile(file) {
  overrideFile = file || null;
}

function readAll() {
  const file = interestsFile();
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function writeAll(rows) {
  util.ensureDir(path.dirname(interestsFile()));
  const tmp = `${interestsFile()}.tmp`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
  fs.renameSync(tmp, interestsFile());
}

function prioriteLabel(code) {
  const p = PRIORITES.find((x) => x.CODE === code);
  return p ? p.LABEL : null;
}

function list(opts) {
  const o = opts || {};
  let out = readAll().filter((r) => r.ACTIF !== false);
  if (o.priorite) out = out.filter((r) => r.PRIORITE === o.priorite);
  if (o.actif === false) out = out.filter((r) => r.ACTIF === false);
  return out.sort((a, b) => (a.CREE_LE < b.CREE_LE ? 1 : -1));
}

function find(id) {
  return readAll().find((r) => r.ID === id) || null;
}

function add(identity, fields) {
  const code = fields.PRIORITE;
  if (!PRIORITE_CODES.includes(code)) {
    throw new Error(`Priorité inconnue. Permis : ${PRIORITE_CODES.join(', ')}`);
  }
  if (!fields.SUJET) throw new Error('Sujet requis (--sujet=…).');
  const par = fields.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  const note = fields.NOTE || 'Intérêt déclaré explicitement.';
  const row = {
    ID: util.uuid(),
    AIgg_ID: identity ? identity.AIgg_ID : null,
    SUJET: fields.SUJET,
    PRIORITE: code,
    PRIORITE_LABEL: prioriteLabel(code),
    INTENSITE: 1,
    INTENSITE_LABEL: NIVEAUX[1],
    POURQUOI: fields.POURQUOI || null,
    ORIGINE: 'explicite',
    TRANSACTIONS: [{ DATE: util.nowIso(), ACTION: 'CREATION', PAR: par, NOTE: note }],
    ACTIF: true,
    CREE_LE: util.nowIso(),
    MISE_A_JOUR_LE: util.nowIso(),
  };
  writeAll(readAll().concat([row]));
  journalInterest(identity, 'INTEREST_ADDED', row, par);
  memorizeInterest(identity, row);
  return row;
}

function intensify(identity, id, fields) {
  const rows = readAll();
  const row = rows.find((r) => r.ID === id);
  if (!row) throw new Error('Intérêt introuvable.');
  if (row.ACTIF === false) throw new Error('Intérêt archivé : réversible via restore.');
  const par = fields.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  const next = row.INTENSITE + 1;
  if (next > MAX_NIVEAU) {
    throw new Error(`Intensité déjà au maximum (niveau ${MAX_NIVEAU} — « ${NIVEAUX[MAX_NIVEAU]} »).`);
  }
  row.INTENSITE = next;
  row.INTENSITE_LABEL = NIVEAUX[next];
  row.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: `INTENSITE:${next}`,
    PAR: par,
    NOTE: fields.NOTE || `Intérêt poursuivi explicitement à « ${NIVEAUX[next]} ».`,
  });
  row.MISE_A_JOUR_LE = util.nowIso();
  writeAll(rows);
  journalInterest(identity, 'INTEREST_INTENSIFIED', row, par);
  memorizeInterest(identity, row);
  return row;
}

function remove(identity, id, fields) {
  const rows = readAll();
  const row = rows.find((r) => r.ID === id);
  if (!row) throw new Error('Intérêt introuvable.');
  if (row.ACTIF === false) throw new Error('Intérêt déjà archivé.');
  const par = fields.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  row.ACTIF = false;
  row.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: 'ARCHIVE',
    PAR: par,
    NOTE: fields.RAISON || 'Intérêt archivé (révocable, trace conservée).',
  });
  row.MISE_A_JOUR_LE = util.nowIso();
  writeAll(rows);
  journalInterest(identity, 'INTEREST_ARCHIVED', row, par);
  return row;
}

function restore(identity, id, fields) {
  const rows = readAll();
  const row = rows.find((r) => r.ID === id);
  if (!row) throw new Error('Intérêt introuvable.');
  if (row.ACTIF) throw new Error('Intérêt déjà actif.');
  const par = fields.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  row.ACTIF = true;
  row.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: 'RESTORE',
    PAR: par,
    NOTE: fields.NOTE || 'Intérêt restauré (réversibilité).',
  });
  row.MISE_A_JOUR_LE = util.nowIso();
  writeAll(rows);
  journalInterest(identity, 'INTEREST_RESTORED', row, par);
  return row;
}

function log(id) {
  const row = find(id);
  if (!row) throw new Error('Intérêt introuvable.');
  return {
    INTEREST_ID: id,
    SUJET: row.SUJET,
    PRIORITE: row.PRIORITE,
    PRIORITE_LABEL: row.PRIORITE_LABEL,
    INTENSITE: { NIVEAU: row.INTENSITE, NIVEAU_LABEL: row.INTENSITE_LABEL, ORIGINE: row.ORIGINE },
    TRANSACTIONS: row.TRANSACTIONS,
  };
}

function status() {
  const rows = list();
  const parPriorite = {};
  for (const c of PRIORITE_CODES) parPriorite[c] = 0;
  for (const r of rows) parPriorite[r.PRIORITE] = (parPriorite[r.PRIORITE] || 0) + 1;
  return {
    TOTAL: rows.length,
    PAR_PRIORITE: parPriorite,
    FICHIER: interestsFile(),
    REGLE,
  };
}

function journalInterest(identity, event, row, par) {
  try {
    require('./journal').journalEvent(event, identity, {
      INTEREST_ID: row.ID,
      SUJET: row.SUJET,
      PRIORITE: row.PRIORITE,
      PAR: par,
    });
  } catch {}
}

function memorizeInterest(identity, row) {
  try {
    require('./memory').memorize(
      'knowledge',
      `Intérêt « ${row.SUJET} » — priorité interne ${row.PRIORITE} (« ${row.PRIORITE_LABEL} »), intensité ${row.INTENSITE} (« ${row.INTENSITE_LABEL} »).`,
      identity,
      { source: 'interests.js', status: 'confirmed', confidence: 0.9 }
    );
  } catch {}
}

module.exports = {
  PRIORITES,
  PRIORITE_CODES,
  NIVEAUX,
  MAX_NIVEAU,
  REGLE,
  interestsFile,
  _setFile,
  prioriteLabel,
  list,
  find,
  add,
  intensify,
  remove,
  restore,
  log,
  status,
};
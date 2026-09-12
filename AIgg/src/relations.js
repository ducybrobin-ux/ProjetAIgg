'use strict';

/**
 * RELATIONS (v0.4.1) — fonctions natives des Relations.
 *
 * Règles du Prompt Maître :
 *  - catégories : Tuteur, Tuteurs d'autres AIgg (TuteurIgg), Amis Humains
 *    (AmiHumain), Amis AIgg (AmiIgg), Parent, Autres ;
 *  - CONFIANCE EXPLICITE, PROGRESSIVE et TRACABLE : une relation entre
 *    tuteurs ne crée JAMAIS automatiquement une relation de confiance entre
 *    AIgg (une TuteurIgg est introduite, mais reste à confiance 0 tant qu'une
 *    action explicite et tracée ne l'a pas augmentée) ;
 *  - PARENT = filiation structurelle, jamais une propriété : la descendance
 *    porte sa propre identité et n'hérite jamais automatiquement de secrets,
 *    permissions ni accès aux outils ;
 *  - réversibilité : l'archivage d'une relation est tracé et révocable.
 *
 * Le fichier relations/relations.ndjson (privé, ignoré par Git) est la SOURCE
 * réelle. AIgg/Conscience/Relations.json reste une synthèse dérivée qui le cite.
 */

const fs = require('fs');
const path = require('path');
const util = require('./util');
const { PATHS } = require('./config');

const CATEGORIES = ['Tuteur', 'TuteurIgg', 'AmiHumain', 'AmiIgg', 'Parent', 'Autres'];

const CATEGORIES_LABEL = {
  Tuteur: 'mon tuteur : m\'éduque, m\'autorise outils et compétences, me protège.',
  TuteurIgg: 'tuteur d\'un autre AIgg : introduction possible, jamais une confiance automatique entre AIgg.',
  AmiHumain: 'ami humain : relation sociale consentie, sous contrôle du tuteur.',
  AmiIgg: 'ami AIgg : relation entre AIgg, introduite et suivie par les tuteurs.',
  Parent: 'parent : filiation structurelle (descendance), jamais une propriété.',
  Autres: 'autre relation non couverte par les catégories précédentes.',
};

const NIVEAUX = {
  0: 'inconnue',
  1: 'connaissance explicite',
  2: 'confiance progressive',
  3: 'confiance établie',
};

const MAX_NIVEAU = 3;

let overrideFile = null;

function relationsFile() {
  return overrideFile || PATHS.relationsFile;
}

function _setFile(file) {
  overrideFile = file || null;
}

function readAll() {
  const file = relationsFile();
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function writeAll(rows) {
  util.ensureDir(path.dirname(relationsFile()));
  const tmp = `${relationsFile()}.tmp`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
  fs.renameSync(tmp, relationsFile());
}

function list(opts) {
  const o = opts || {};
  let out = readAll().filter((r) => r.ACTIF !== false);
  if (o.categorie) out = out.filter((r) => r.CATEGORIE === o.categorie);
  if (o.actif === false) out = out.filter((r) => r.ACTIF === false);
  return out.sort((a, b) => (a.CREEE_LE < b.CREEE_LE ? 1 : -1));
}

function find(id) {
  return readAll().find((r) => r.ID === id) || null;
}

function add(identity, fields) {
  const cat = fields.CATEGORIE;
  if (!CATEGORIES.includes(cat)) {
    throw new Error(`Catégorie inconnue. Permis : ${CATEGORIES.join(', ')}`);
  }
  if (!fields.NOM) throw new Error('Nom requis (--nom=…).');
  const par = fields.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  const note = fields.NOTE || 'Relation créée explicitement.';
  const row = {
    ID: util.uuid(),
    CATEGORIE: cat,
    NOM: fields.NOM,
    AIgg_ID_TIERS: fields.AIgg_ID_TIERS || null,
    TUTEUR_ID: fields.TUTEUR_ID || null,
    TUTEUR_NOM_TIERS: fields.TUTEUR_NOM_TIERS || null,
    POURQUOI: fields.POURQUOI || CATEGORIES_LABEL[cat],
    ROLE: fields.ROLE || null,
    PARENT_DE: cat === 'Parent' ? (fields.PARENT_DE || fields.NOM) : null,
    CONFIANCE: {
      NIVEAU: 0,
      NIVEAU_LABEL: NIVEAUX[0],
      ORIGINE: 'explicite',
      TRANSACTIONS: [{ DATE: util.nowIso(), ACTION: 'CREATION', PAR: par, NOTE: note }],
    },
    ACTIF: true,
    CREEE_LE: util.nowIso(),
    MISE_A_JOUR_LE: util.nowIso(),
  };
  writeAll(readAll().concat([row]));
  journalRelation(identity, 'RELATION_ADDED', row, par);
  return row;
}

function trust(identity, id, fields) {
  const rows = readAll();
  const row = rows.find((r) => r.ID === id);
  if (!row) throw new Error('Relation introuvable.');
  if (row.ACTIF === false) throw new Error('Relation archivée : réversible via restore.');
  const par = fields.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  const next = row.CONFIANCE.NIVEAU + 1;
  if (next > MAX_NIVEAU) {
    throw new Error(`Confiance déjà au maximum (niveau ${MAX_NIVEAU} — « ${NIVEAUX[MAX_NIVEAU]} »).`);
  }
  row.CONFIANCE.NIVEAU = next;
  row.CONFIANCE.NIVEAU_LABEL = NIVEAUX[next];
  row.CONFIANCE.ORIGINE = 'explicite';
  row.CONFIANCE.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: `TRUST:${next}`,
    PAR: par,
    NOTE: fields.NOTE || `Confiance renforcée explicitement à « ${NIVEAUX[next]} ».`,
  });
  row.MISE_A_JOUR_LE = util.nowIso();
  writeAll(rows);
  journalRelation(identity, 'RELATION_TRUST', row, par);
  try {
    require('./memory').memorize(
      'relations',
      `Confiance « ${NIVEAUX[next]} » accordée explicitement et tracée à ${row.NOM} (${row.CATEGORIE}).`,
      identity,
      { source: 'relations.js', status: 'confirmed', confidence: 0.9 }
    );
  } catch {}
  return row;
}

function remove(identity, id, fields) {
  const rows = readAll();
  const row = rows.find((r) => r.ID === id);
  if (!row) throw new Error('Relation introuvable.');
  if (row.ACTIF === false) throw new Error('Relation déjà archivée.');
  const par = fields.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  row.ACTIF = false;
  row.CONFIANCE.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: 'ARCHIVE',
    PAR: par,
    NOTE: fields.RAISON || 'Relation archivée (révocable, trace conservée).',
  });
  row.MISE_A_JOUR_LE = util.nowIso();
  writeAll(rows);
  journalRelation(identity, 'RELATION_ARCHIVED', row, par);
  return row;
}

function restore(identity, id, fields) {
  const rows = readAll();
  const row = rows.find((r) => r.ID === id);
  if (!row) throw new Error('Relation introuvable.');
  if (row.ACTIF) throw new Error('Relation déjà active.');
  const par = fields.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  row.ACTIF = true;
  row.CONFIANCE.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: 'RESTORE',
    PAR: par,
    NOTE: fields.NOTE || 'Relation restaurée (réversibilité).',
  });
  row.MISE_A_JOUR_LE = util.nowIso();
  writeAll(rows);
  journalRelation(identity, 'RELATION_RESTORED', row, par);
  return row;
}

function log(id) {
  const row = find(id);
  if (!row) throw new Error('Relation introuvable.');
  return {
    RELATION_ID: id,
    NOM: row.NOM,
    CATEGORIE: row.CATEGORIE,
    CONFIANCE: { NIVEAU: row.CONFIANCE.NIVEAU, NIVEAU_LABEL: row.CONFIANCE.NIVEAU_LABEL, ORIGINE: row.CONFIANCE.ORIGINE },
    TRANSACTIONS: row.CONFIANCE.TRANSACTIONS,
  };
}

function status() {
  const rows = list();
  const parCategorie = {};
  for (const c of CATEGORIES) parCategorie[c] = 0;
  for (const r of rows) parCategorie[r.CATEGORIE] = (parCategorie[r.CATEGORIE] || 0) + 1;
  return {
    TOTAL: rows.length,
    PAR_CATEGORIE: parCategorie,
    FICHIER: relationsFile(),
    REGLE: 'Une relation entre tuteurs ne crée jamais automatiquement une relation de confiance entre AIgg.',
  };
}

function journalRelation(identity, event, row, par) {
  try {
    require('./journal').journalEvent(event, identity, {
      RELATION_ID: row.ID,
      CATEGORIE: row.CATEGORIE,
      NOM: row.NOM,
      PAR: par,
    });
  } catch {}
}

module.exports = {
  CATEGORIES,
  CATEGORIES_LABEL,
  NIVEAUX,
  MAX_NIVEAU,
  relationsFile,
  _setFile,
  list,
  find,
  add,
  trust,
  remove,
  restore,
  log,
  status,
};
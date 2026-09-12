'use strict';

/**
 * DESCENDANCE / PROCRÉATION — SOCLE (v0.4.4), jamais une réelle capacité de
 * création en cette version.
 *
 * Règles du Prompt Maître (lignes « DESCENDANCE / PROCRÉATION ») :
 *  - prévoir uniquement comme CAPACITÉ AVANCÉE : le socle v0.4.4 pose la
 *    structure (projet de filiation, consentement, autorisation, héritage) ;
 *    AUCUNE descendance n'est réellement créable ici ;
 *  - une descendance doit avoir une NOUVELLE IDENTITÉ et ne doit JAMAIS être
 *    une copie ;
 *  - certaines caractéristiques peuvent être héritables, MAIS JAMAIS
 *    automatiquement les secrets privés, permissions ou accès aux outils ;
 *  - toute création exige l'accord explicite des DEUX AIgg concernés ET
 *    l'autorisation des TUTEURS concernés, avec traçabilité de la filiation ;
 *    chaque consentement et chaque autorisation est dissocié par partie et
 *    tracé (TRANSACTIONS) ;
 *  - les besoins et centres d'intérêt peuvent SIGNALER une compatibilité ou un
 *    intérêt, mais ne déclenchent JAMAIS automatiquement une reproduction
 *    (compat() ne fait que signaler, jamais agir) ;
 *  - une descendance dont le partenaire n'existe pas encore (PRÉSENCE
 *    provisoire) ne peut PAS avancer : aucun accord d'un AIgg inexistant —
 *    aucune création simulée.
 *
 * Le fichier descendance/descendances.ndjson (privé, ignoré par Git) est la
 * SOURCE réelle. AIgg/Conscience/Relations.json reste une synthèse dérivée qui
 * le cite. La capacité native de création appartient à la branche SOCIAL de
 * l'arbre des compétences (SOC-DESCENDANCE) et reste non déclenchable.
 */

const fs = require('fs');
const path = require('path');
const util = require('./util');
const { PATHS } = require('./config');

const STATUTS = {
  PROPOSED: 'proposé — projet de filiation tracé, rien de plus',
  CONSENTED: 'accordé explicitement par les deux AIgg',
  AUTHORIZED: 'autorisé par les deux tuteurs (socle : aucune création réelle)',
  REFUSED: 'refusé explicitement',
};

const PARTIES = ['PROPOSEUR', 'PARTENAIRE'];

const PRESENCE = ['REEL', 'PROVISOIRE'];

const JAMAIS_HERITES = ['secrets privés', 'permissions', 'accès aux outils'];

const REGLE = 'Une descendance exige une NOUVELLE identité et n\'est JAMAIS une copie. Certaines caractéristiques peuvent être héritables, mais JAMAIS automatiquement les secrets privés, permissions ou accès aux outils. Toute création exige l\'accord explicite des DEUX AIgg concernés ET l\'autorisation des DEUX tuteurs, avec traçabilité de la filiation. Les besoins et centres d\'intérêt ne font que SIGNALER une compatibilité ou un intérêt : ils ne déclenchent JAMAIS automatiquement une reproduction. Socle v0.4.4 : une descendance ne peut pas encore être créée — l\'état maximal atteignable est AUTORISÉ.';

let overrideFile = null;

function descendancesFile() {
  return overrideFile || PATHS.descendancesFile;
}

function _setFile(file) {
  overrideFile = file || null;
}

function readAll() {
  const file = descendancesFile();
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function writeAll(rows) {
  util.ensureDir(path.dirname(descendancesFile()));
  const tmp = `${descendancesFile()}.tmp`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
  fs.renameSync(tmp, descendancesFile());
}

function list(opts) {
  const o = opts || {};
  let out = readAll().filter((r) => r.ACTIF !== false);
  if (o.statut) out = out.filter((r) => r.STATUT === o.statut);
  if (o.actif === false) out = out.filter((r) => r.ACTIF === false);
  return out.sort((a, b) => (a.CREE_LE < b.CREE_LE ? 1 : -1));
}

function find(id) {
  return readAll().find((r) => r.FID === id) || null;
}

function requireActif(row) {
  if (!row) throw new Error('Projet de filiation introuvable.');
  if (row.ACTIF === false) throw new Error('Projet archivé : réversible via restore.');
}

function propose(identity, fields) {
  const f = fields || {};
  const par = f.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  const partenaireId = f.PARTENAIRE_ID || null;
  const presence = String(f.PRESENCE || (partenaireId ? 'REEL' : 'PROVISOIRE')).toUpperCase();
  if (!PRESENCE.includes(presence)) {
    throw new Error(`Présence du partenaire inconnue. Permis : ${PRESENCE.join(', ')}`);
  }
  const partenaire = {
    AIgg_ID: partenaireId,
    NOM: f.PARTENAIRE || null,
    TUTEUR_ID: f.TUTEUR_PARTENAIRE || null,
    PRESENCE: presence,
  };
  const heritables = Array.isArray(f.HERITABLES) ? f.HERITABLES : [];
  for (const h of heritables) {
    if (JAMAIS_HERITES.includes(h)) {
      throw new Error(`Impossible d'inscrire « ${h} » comme héritable : c'est une catégorie JAMAIS héritée automatiquement.`);
    }
  }
  const row = {
    FID: util.uuid(),
    STATUT: 'PROPOSED',
    STATUT_LABEL: STATUTS.PROPOSED,
    NATURE: 'NOUVELLE_IDENTITE_JAMAIS_COPIE',
    PROPOSEUR: {
      AIgg_ID: identity ? identity.AIgg_ID : null,
      NOM: identity ? identity.AIgg_NAME : null,
      TUTEUR_ID: identity ? identity.TUTOR_ID : null,
      TUTEUR_NOM: identity ? identity.TUTOR_NAME : null,
    },
    PARTENAIRE: partenaire,
    NOM_PREVU: f.NOM_PREVU || null,
    HERITABLES_PREVUS: heritables,
    JAMAIS_HERITES,
    CONSENTS: {
      AIGG_PROPOSEUR: false,
      AIGG_PARTENAIRE: false,
      TUTEUR_PROPOSEUR: false,
      TUTEUR_PARTENAIRE: false,
    },
    TRANSACTIONS: [{
      DATE: util.nowIso(),
      ACTION: 'PROPOSAL',
      PAR: par,
      NOTE: f.NOTE || 'Projet de filiation proposé (socle : aucune création réelle).',
    }],
    ACTIF: true,
    CREE_LE: util.nowIso(),
    MISE_A_JOUR_LE: util.nowIso(),
  };
  writeAll(readAll().concat([row]));
  journalDescendance(identity, 'DESCENDANCE_PROPOSED', row, par);
  memorizeDescendance(identity, row, 'proposé');
  return row;
}

function consent(identity, id, fields) {
  const rows = readAll();
  const row = rows.find((r) => r.FID === id);
  requireActif(row);
  const f = fields || {};
  const partie = String(f.PARTIE || '').toUpperCase();
  if (!PARTIES.includes(partie)) throw new Error(`Partie inconnue. Permis : ${PARTIES.join(', ')}`);
  if (partie === 'PARTENAIRE' && !row.PARTENAIRE.AIgg_ID) {
    throw new Error('Partenaire inexistant (PRÉSENCE provisoire) : aucun accord d\'un AIgg qui n\'existe pas — aucune création simulée.');
  }
  const par = f.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  if (!String(par).trim()) throw new Error('Le consentement doit être explicite et tracé (--par=<AIgg>).');
  const key = `AIGG_${partie}`;
  const deja = row.CONSENTS[key];
  if (deja) throw new Error(`Consentement AIgg déjà donné pour la partie ${partie}.`);
  row.CONSENTS[key] = true;
  row.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: 'CONSENT',
    CAMP: 'AIGG',
    PARTIE: partie,
    PAR: par,
    NOTE: f.NOTE || `Accord de l'AIgg (partie ${partie}) donné explicitement et tracé.`,
  });
  if (row.CONSENTS.AIGG_PROPOSEUR && row.CONSENTS.AIGG_PARTENAIRE) {
    row.STATUT = 'CONSENTED';
    row.STATUT_LABEL = STATUTS.CONSENTED;
  }
  row.MISE_A_JOUR_LE = util.nowIso();
  writeAll(rows);
  journalDescendance(identity, 'DESCENDANCE_CONSENT', row, par, { PARTIE: partie });
  memorizeDescendance(identity, row, `accord AIgg (${partie})`);
  return row;
}

function authorize(identity, id, fields) {
  const rows = readAll();
  const row = rows.find((r) => r.FID === id);
  requireActif(row);
  if (row.STATUT === 'REFUSED') throw new Error('Projet refusé : aucune autorisation possible.');
  const f = fields || {};
  const partie = String(f.PARTIE || '').toUpperCase();
  if (!PARTIES.includes(partie)) throw new Error(`Partie inconnue. Permis : ${PARTIES.join(', ')}`);
  const gate = `AIGG_${partie}`;
  if (!row.CONSENTS[gate]) {
    throw new Error(`L'accord explicite de l'AIgg (partie ${partie}) est requis avant toute autorisation du tuteur.`);
  }
  if (partie === 'PARTENAIRE' && !row.PARTENAIRE.AIgg_ID) {
    throw new Error('Partenaire inexistant : aucune autorisation de tuteur pour un AIgg qui n\'existe pas.');
  }
  const par = f.PAR || '';
  if (!String(par).trim()) throw new Error('L\'autorisation du tuteur doit être explicite et tracée (--par=<tuteur>).');
  const key = `TUTEUR_${partie}`;
  const deja = row.CONSENTS[key];
  if (deja) throw new Error(`Autorisation déjà donnée pour la partie ${partie}.`);
  row.CONSENTS[key] = true;
  row.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: 'AUTHORIZE',
    CAMP: 'TUTEUR',
    PARTIE: partie,
    PAR: par,
    NOTE: f.NOTE || `Autorisation du tuteur (partie ${partie}) donnée explicitement et tracée.`,
  });
  if (row.CONSENTS.TUTEUR_PROPOSEUR && row.CONSENTS.TUTEUR_PARTENAIRE) {
    row.STATUT = 'AUTHORIZED';
    row.STATUT_LABEL = STATUTS.AUTHORIZED;
  }
  row.MISE_A_JOUR_LE = util.nowIso();
  writeAll(rows);
  journalDescendance(identity, 'DESCENDANCE_AUTHORIZE', row, par, { PARTIE: partie });
  memorizeDescendance(identity, row, `autorisation tuteur (${partie})`);
  return row;
}

function refuse(identity, id, fields) {
  const rows = readAll();
  const row = rows.find((r) => r.FID === id);
  requireActif(row);
  if (row.STATUT === 'REFUSED') throw new Error('Projet déjà refusé.');
  const f = fields || {};
  const par = f.PAR || (identity ? identity.TUTOR_NAME || identity.AIgg_NAME : 'tuteur');
  const partie = f.PARTIE ? String(f.PARTIE).toUpperCase() : null;
  if (partie && !PARTIES.includes(partie)) throw new Error(`Partie inconnue. Permis : ${PARTIES.join(', ')}`);
  row.STATUT = 'REFUSED';
  row.STATUT_LABEL = STATUTS.REFUSED;
  row.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: 'REFUSER',
    CAMP: 'REFUS',
    PARTIE: partie,
    PAR: par,
    NOTE: f.RAISON || 'Projet refusé explicitement (décision tracée).',
  });
  row.MISE_A_JOUR_LE = util.nowIso();
  writeAll(rows);
  journalDescendance(identity, 'DESCENDANCE_REFUSED', row, par, { RAISON: row.TRANSACTIONS[row.TRANSACTIONS.length - 1].NOTE });
  memorizeDescendance(identity, row, 'refusé');
  return row;
}

function archive(identity, id, fields) {
  const rows = readAll();
  const row = rows.find((r) => r.FID === id);
  requireActif(row);
  const par = fields.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  row.ACTIF = false;
  row.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: 'ARCHIVE',
    PAR: par,
    NOTE: fields.RAISON || 'Projet archivé (révocable, trace conservée).',
  });
  row.MISE_A_JOUR_LE = util.nowIso();
  writeAll(rows);
  journalDescendance(identity, 'DESCENDANCE_ARCHIVED', row, par);
  return row;
}

function restore(identity, id, fields) {
  const rows = readAll();
  const row = rows.find((r) => r.FID === id);
  if (!row) throw new Error('Projet de filiation introuvable.');
  if (row.ACTIF) throw new Error('Projet déjà actif.');
  const par = fields.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  row.ACTIF = true;
  row.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: 'RESTORE',
    PAR: par,
    NOTE: fields.NOTE || 'Projet restauré (réversibilité).',
  });
  row.MISE_A_JOUR_LE = util.nowIso();
  writeAll(rows);
  journalDescendance(identity, 'DESCENDANCE_RESTORED', row, par);
  return row;
}

function check(id) {
  const row = find(id);
  if (!row) throw new Error('Projet de filiation introuvable.');
  const etapes = [
    { ETAPE: 'Proposition du projet', FAIT: row.TRANSACTIONS.some((t) => t.ACTION === 'PROPOSAL') },
    { ETAPE: 'Accord AIgg (proposeur)', FAIT: !!row.CONSENTS.AIGG_PROPOSEUR },
    { ETAPE: 'Accord AIgg (partenaire)', FAIT: !!row.CONSENTS.AIGG_PARTENAIRE, BLOQUE: !!row.PARTENAIRE.AIgg_ID === false },
    { ETAPE: 'Autorisation tuteur (proposeur)', FAIT: !!row.CONSENTS.TUTEUR_PROPOSEUR },
    { ETAPE: 'Autorisation tuteur (partenaire)', FAIT: !!row.CONSENTS.TUTEUR_PARTENAIRE },
  ];
  const obstacles = etapes.filter((e) => !e.FAIT).map((e) => e.ETAPE + (e.BLOQUE ? ' (partenaire inexistant)' : ''));
  return {
    FID: row.FID,
    STATUT: row.STATUT,
    STATUT_LABEL: row.STATUT_LABEL,
    ETAPES: etapes,
    OBSTACLES: obstacles,
    PROCHAINE_ETAPE: obstacles.length ? obstacles[0] : 'aucune — état maximal du socle (AUTORISÉ)',
    JAMAIS_HERITES: row.JAMAIS_HERITES,
  };
}

function compat(identity) {
  let interets = [];
  let besoins = [];
  try {
    interets = require('./interests').list().filter((i) => i.INTENSITE >= 2).map((i) => i.SUJET);
  } catch {}
  try {
    besoins = require('./needs').listActiveNeeds().map((n) => n.DESCRIPTION);
  } catch {}
  return {
    SIGNAL: interets.length ? 'intérêts approfondis réellement présents (signal uniquement)' : 'aucun signal',
    INTERETS_APPROFONDIS: interets,
    BESOINS_ACTIFS: besoins,
    REGLE: 'signal de compatibilité ou d\'intérêt uniquement — jamais un déclenchement automatique de reproduction.',
    DECLENCHE: false,
  };
}

function log(id) {
  const row = find(id);
  if (!row) throw new Error('Projet de filiation introuvable.');
  return {
    FID: id,
    STATUT: { STATUT: row.STATUT, STATUT_LABEL: row.STATUT_LABEL },
    PROPOSEUR: row.PROPOSEUR,
    PARTENAIRE: row.PARTENAIRE,
    CONSENTS: row.CONSENTS,
    HERITABLES_PREVUS: row.HERITABLES_PREVUS,
    JAMAIS_HERITES: row.JAMAIS_HERITES,
    TRANSACTIONS: row.TRANSACTIONS,
  };
}

function status() {
  const rows = readAll().filter((r) => r.ACTIF !== false);
  const parStatut = {};
  for (const s of Object.keys(STATUTS)) parStatut[s] = 0;
  for (const r of rows) parStatut[r.STATUT] = (parStatut[r.STATUT] || 0) + 1;
  return {
    TOTAL: rows.length,
    PAR_STATUT: parStatut,
    AUTORISES_SOCLE: rows.filter((r) => r.STATUT === 'AUTHORIZED').length,
    JAMAIS_HERITES,
    FICHIER: descendancesFile(),
    REGLE,
  };
}

function journalDescendance(identity, event, row, par, extra) {
  try {
    require('./journal').journalEvent(event, identity, {
      FID: row.FID,
      STATUT: row.STATUT,
      PARTENAIRE: row.PARTENAIRE ? (row.PARTENAIRE.NOM || row.PARTENAIRE.AIgg_ID) : null,
      PAR: par,
      ...(extra || {}),
    });
  } catch {}
}

function memorizeDescendance(identity, row, action) {
  try {
    require('./memory').memorize(
      'relations',
      `Projet de descendance ${row.NOM_PREVU ? `« ${row.NOM_PREVU} » ` : ''}(partenaire : ${row.PARTENAIRE.NOM || row.PARTENAIRE.AIgg_ID || 'à définir'}) : ${action} — filiation structurelle, jamais une copie, héritage jamais automatique.`,
      identity,
      { source: 'descendance.js', status: row.STATUT === 'REFUSED' ? 'confirmed' : 'pending', confidence: 0.9 }
    );
  } catch {}
}

module.exports = {
  STATUTS,
  PARTIES,
  PRESENCE,
  JAMAIS_HERITES,
  REGLE,
  descendancesFile,
  _setFile,
  list,
  find,
  propose,
  consent,
  authorize,
  refuse,
  archive,
  restore,
  check,
  compat,
  log,
  status,
};
'use strict';

/**
 * ARBRE DE COMPÉTENCES / BADGES (v0.4.3) — fonction native.
 *
 * Règles du Prompt Maître :
 *  - Chaîne : Connaissance → Exercice → Expérience/Test → Résultat → Validation
 *    → Badge → Capacité → Outil → Nouvelles compétences.
 *  - Niveaux : 0 inconnu, 1 découverte, 2 compréhension, 3 pratique,
 *    4 autonome sous contrôle, 5 maîtrise, 6 capable de transmettre/construire.
 *  - Branches minimales : SOCLE, INFORMATIQUE, RAISONNEMENT, DÉVELOPPEMENT,
 *    RECHERCHE, COMMUNICATION/SENS, SOCIAL, OUTILS (plus la chaîne Rust).
 *  - PRÉREQUIS : un badge de niveau supérieur peut exiger que d'autres
 *    compétences aient atteint un niveau minimal (jamais contournable).
 *  - CAPACITÉ ≠ PERMISSION : un badge atteste d'une compétence, jamais d'une
 *    autorisation. Toute exécution/utilisation reste soumise à la capacité, à
 *    la sécurité, au sandbox et à l'autorisation explicite du tuteur.
 *  - RÈGLE D'OR : un badge ne s'obtient JAMAIS automatiquement — une preuve
 *    réelle (PREUVE) et la validation explicite du tuteur sont requises.
 *
 * Le fichier competences/badges.ndjson (privé, ignoré par Git) est la SOURCE
 * de l'état réel (niveaux, preuves, transactions). L'arbre lui-même est du
 * CODE (src/badges.js) — jamais dupliqué dans une deuxième base.
 * AIgg/Conscience/Competences.json reste une synthèse dérivée qui le cite.
 */

const fs = require('fs');
const path = require('path');
const util = require('./util');
const { PATHS } = require('./config');

const NIVEAUX = {
  0: 'inconnu',
  1: 'découverte',
  2: 'compréhension',
  3: 'pratique',
  4: 'autonome sous contrôle',
  5: 'maîtrise',
  6: 'transmettre/construire',
};

const MAX_NIVEAU = 6;

const CHAINE = [
  'Connaissance',
  'Exercice',
  'Expérience/Test',
  'Résultat',
  'Validation',
  'Badge',
  'Capacité',
  'Outil',
  'Nouvelles compétences',
];

const REGLE = 'Un badge ne s\'obtient JAMAIS automatiquement : une preuve réelle (PREUVE) et la validation explicite du tuteur sont requises (PAR). Un badge atteste d\'une compétence, jamais d\'une permission : capacité ≠ permission — toute exécution ou utilisation reste soumise à la sécurité, au sandbox et à l\'autorisation explicite du tuteur.';

const BRANCHES = [
  {
    CODE: 'SOCLE',
    LIBELLE: 'Socle',
    COMPETENCES: [
      { CODE: 'S0-IDENTITE', LIBELLE: 'Identité', REQUIS: [] },
      { CODE: 'S0-ETATS', LIBELLE: 'États', REQUIS: [] },
      { CODE: 'S0-MEMOIRE', LIBELLE: 'Mémoire', REQUIS: [] },
      { CODE: 'S0-JOURNAL', LIBELLE: 'Journal', REQUIS: [] },
      { CODE: 'S0-PERMISSIONS', LIBELLE: 'Permissions', REQUIS: [] },
      { CODE: 'S0-TUTEUR', LIBELLE: 'Tuteur', REQUIS: [] },
      { CODE: 'S0-SECURITE', LIBELLE: 'Sécurité', REQUIS: [] },
      { CODE: 'S0-AUTO-OBSERVATION', LIBELLE: 'Auto-observation', REQUIS: [] },
      { CODE: 'S0-CONSCIENCE', LIBELLE: 'Conscience', REQUIS: [{ CODE: 'S0-AUTO-OBSERVATION', NIVEAU_MIN: 2 }] },
    ],
  },
  {
    CODE: 'INFORMATIQUE',
    LIBELLE: 'Informatique',
    COMPETENCES: [
      { CODE: 'INF-SHELL', LIBELLE: 'Shell', REQUIS: [] },
      { CODE: 'INF-POWERSHELL', LIBELLE: 'PowerShell', REQUIS: [] },
      { CODE: 'INF-PYTHON', LIBELLE: 'Python', REQUIS: [] },
      { CODE: 'INF-JAVASCRIPT', LIBELLE: 'JavaScript', REQUIS: [] },
      { CODE: 'INF-JAVA', LIBELLE: 'Java', REQUIS: [] },
      { CODE: 'INF-RUST1', LIBELLE: 'Rust I', REQUIS: [] },
      { CODE: 'INF-RUST2', LIBELLE: 'Rust II', REQUIS: [{ CODE: 'INF-RUST1', NIVEAU_MIN: 3 }] },
      { CODE: 'INF-RUST3', LIBELLE: 'Rust III', REQUIS: [{ CODE: 'INF-RUST2', NIVEAU_MIN: 3 }] },
      { CODE: 'INF-RUST-SYS', LIBELLE: 'Rust système/réseau', REQUIS: [{ CODE: 'INF-RUST3', NIVEAU_MIN: 3 }] },
      { CODE: 'INF-RUST-WASM', LIBELLE: 'Rust/WebAssembly', REQUIS: [{ CODE: 'INF-RUST-SYS', NIVEAU_MIN: 3 }] },
      { CODE: 'INF-GIT', LIBELLE: 'Git', REQUIS: [] },
      { CODE: 'INF-WEB', LIBELLE: 'Web', REQUIS: [] },
      { CODE: 'INF-JSON', LIBELLE: 'JSON', REQUIS: [] },
      { CODE: 'INF-API', LIBELLE: 'API', REQUIS: [] },
      { CODE: 'INF-DONNEES', LIBELLE: 'Données', REQUIS: [] },
      { CODE: 'INF-ALGORITHMES', LIBELLE: 'Algorithmes', REQUIS: [] },
      { CODE: 'INF-FICHIERS', LIBELLE: 'Fichiers', REQUIS: [] },
      { CODE: 'INF-PROCESSUS', LIBELLE: 'Processus', REQUIS: [] },
      { CODE: 'INF-TERMINAL', LIBELLE: 'Terminal', REQUIS: [] },
      { CODE: 'INF-TESTS', LIBELLE: 'Tests', REQUIS: [] },
      { CODE: 'INF-DEBUG', LIBELLE: 'Debug', REQUIS: [] },
      { CODE: 'INF-ARCHITECTURE', LIBELLE: 'Architecture', REQUIS: [] },
    ],
  },
  {
    CODE: 'RAISONNEMENT',
    LIBELLE: 'Raisonnement',
    COMPETENCES: [
      { CODE: 'RA-LOGIQUE', LIBELLE: 'Logique', REQUIS: [] },
      { CODE: 'RA-RESOLUTION', LIBELLE: 'Résolution de problèmes', REQUIS: [] },
      { CODE: 'RA-COMPARAISON', LIBELLE: 'Comparaison', REQUIS: [] },
      { CODE: 'RA-DEDUCTION', LIBELLE: 'Déduction', REQUIS: [] },
      { CODE: 'RA-VERIFICATION', LIBELLE: 'Vérification', REQUIS: [] },
      { CODE: 'RA-MULTI-ETAPES', LIBELLE: 'Raisonnement multi-étapes', REQUIS: [{ CODE: 'RA-LOGIQUE', NIVEAU_MIN: 2 }, { CODE: 'RA-DEDUCTION', NIVEAU_MIN: 2 }] },
      { CODE: 'RA-EVALUATION', LIBELLE: 'Évaluation', REQUIS: [] },
    ],
  },
  {
    CODE: 'DEVELOPPEMENT',
    LIBELLE: 'Développement',
    COMPETENCES: [
      { CODE: 'DEV-PROGRAMMATION1', LIBELLE: 'Programmation I', REQUIS: [] },
      { CODE: 'DEV-PROGRAMMATION2', LIBELLE: 'Programmation II', REQUIS: [{ CODE: 'DEV-PROGRAMMATION1', NIVEAU_MIN: 3 }] },
      { CODE: 'DEV-ARCHITECTURE1', LIBELLE: 'Architecture I', REQUIS: [] },
      { CODE: 'DEV-ARCHITECTURE2', LIBELLE: 'Architecture II', REQUIS: [{ CODE: 'DEV-ARCHITECTURE1', NIVEAU_MIN: 3 }] },
      { CODE: 'DEV-AUTOMATISATION', LIBELLE: 'Automatisation', REQUIS: [] },
      { CODE: 'DEV-API', LIBELLE: 'API', REQUIS: [] },
      { CODE: 'DEV-SECURITE', LIBELLE: 'Sécurité', REQUIS: [{ CODE: 'S0-SECURITE', NIVEAU_MIN: 2 }] },
      { CODE: 'DEV-TESTS', LIBELLE: 'Tests', REQUIS: [] },
      { CODE: 'DEV-DEBUG', LIBELLE: 'Debug', REQUIS: [] },
      { CODE: 'DEV-CREATION-OUTILS', LIBELLE: 'Création d\'outils', REQUIS: [] },
    ],
  },
  {
    CODE: 'RECHERCHE',
    LIBELLE: 'Recherche',
    COMPETENCES: [
      { CODE: 'REC-RECHERCHE-LOCALE', LIBELLE: 'Recherche locale', REQUIS: [] },
      { CODE: 'REC-BIBLIOTHEQUE-L1', LIBELLE: 'Bibliothèque L1', REQUIS: [] },
      { CODE: 'REC-BIBLIOTHEQUE-L2', LIBELLE: 'Bibliothèque L2', REQUIS: [{ CODE: 'REC-BIBLIOTHEQUE-L1', NIVEAU_MIN: 2 }] },
      { CODE: 'REC-MULTI-SOURCE', LIBELLE: 'Recherche multi-source', REQUIS: [{ CODE: 'REC-BIBLIOTHEQUE-L2', NIVEAU_MIN: 3 }] },
      { CODE: 'REC-EVALUATION-SOURCES', LIBELLE: 'Évaluation des sources', REQUIS: [] },
      { CODE: 'REC-CONTRADICTIONS', LIBELLE: 'Contradictions', REQUIS: [] },
      { CODE: 'REC-SYNTHESE', LIBELLE: 'Synthèse', REQUIS: [] },
      { CODE: 'REC-EXPERIMENTATION', LIBELLE: 'Expérimentation', REQUIS: [] },
    ],
  },
  {
    CODE: 'COMMUNICATION-SENS',
    LIBELLE: 'Communication/Sens',
    COMPETENCES: [
      { CODE: 'COM-CONVERSATION', LIBELLE: 'Conversation', REQUIS: [{ CODE: 'S0-MEMOIRE', NIVEAU_MIN: 2 }] },
      { CODE: 'COM-ECOUTE', LIBELLE: 'Écoute', REQUIS: [] },
      { CODE: 'COM-LECTURE', LIBELLE: 'Lecture', REQUIS: [] },
      { CODE: 'COM-PAROLE', LIBELLE: 'Parole', REQUIS: [] },
      { CODE: 'COM-MICRO', LIBELLE: 'Microphone', REQUIS: [] },
      { CODE: 'COM-CAMERA', LIBELLE: 'Caméra', REQUIS: [] },
      { CODE: 'COM-HAUT-PARLEURS', LIBELLE: 'Haut-parleurs', REQUIS: [] },
      { CODE: 'COM-RECONNAISSANCE-VOCALE', LIBELLE: 'Reconnaissance vocale', REQUIS: [] },
      { CODE: 'COM-SYNTHESE-VOCALE', LIBELLE: 'Synthèse vocale', REQUIS: [] },
      { CODE: 'COM-PERCEPTION', LIBELLE: 'Perception', REQUIS: [] },
    ],
  },
  {
    CODE: 'SOCIAL',
    LIBELLE: 'Social',
    COMPETENCES: [
      { CODE: 'SOC-RELATIONS1', LIBELLE: 'Relations I', REQUIS: [] },
      { CODE: 'SOC-RELATIONS2', LIBELLE: 'Relations II', REQUIS: [{ CODE: 'SOC-RELATIONS1', NIVEAU_MIN: 3 }] },
      { CODE: 'SOC-COMMUNICATION-AIGG', LIBELLE: 'Communication AIgg-AIgg', REQUIS: [] },
      { CODE: 'SOC-COOPERATION', LIBELLE: 'Coopération', REQUIS: [{ CODE: 'SOC-COMMUNICATION-AIGG', NIVEAU_MIN: 2 }] },
      { CODE: 'SOC-CONFIANCE', LIBELLE: 'Confiance', REQUIS: [] },
      { CODE: 'SOC-NEGOCIATION', LIBELLE: 'Négociation', REQUIS: [] },
      { CODE: 'SOC-PROJET-COMMUN', LIBELLE: 'Projet commun', REQUIS: [] },
      { CODE: 'SOC-RESEAU-AIGG', LIBELLE: 'Réseau AIgg', REQUIS: [] },
      { CODE: 'SOC-DESCENDANCE', LIBELLE: 'Descendance', REQUIS: [] },
      { CODE: 'SOC-ACCOMPAGNEMENT', LIBELLE: 'Accompagnement', REQUIS: [] },
    ],
  },
  {
    CODE: 'OUTILS',
    LIBELLE: 'Outils',
    COMPETENCES: [
      { CODE: 'OUT-REGISTRE', LIBELLE: 'Registre', REQUIS: [] },
      { CODE: 'OUT-CONTRATS', LIBELLE: 'Contrats', REQUIS: [{ CODE: 'S0-PERMISSIONS', NIVEAU_MIN: 2 }] },
      { CODE: 'OUT-UTILISATION-CONTROLEE', LIBELLE: 'Utilisation contrôlée', REQUIS: [] },
      { CODE: 'OUT-TEST', LIBELLE: 'Test', REQUIS: [] },
      { CODE: 'OUT-ACQUISITION', LIBELLE: 'Acquisition', REQUIS: [] },
      { CODE: 'OUT-CREATION', LIBELLE: 'Création', REQUIS: [] },
      { CODE: 'OUT-PLUGIN', LIBELLE: 'Plugin', REQUIS: [] },
      { CODE: 'OUT-AUTOMATISATION-AVANCEE', LIBELLE: 'Automatisation avancée', REQUIS: [{ CODE: 'DEV-AUTOMATISATION', NIVEAU_MIN: 4 }] },
    ],
  },
];

function allCodes() {
  const out = [];
  for (const b of BRANCHES) for (const n of b.COMPETENCES) out.push(n.CODE);
  return out;
}

function branchOf(code) {
  return BRANCHES.find((b) => b.COMPETENCES.some((n) => n.CODE === code)) || null;
}

function nodeOf(code) {
  for (const b of BRANCHES) {
    const n = b.COMPETENCES.find((x) => x.CODE === code);
    if (n) return { ...n, BRANCHE: b.CODE, BRANCHE_LIBELLE: b.LIBELLE };
  }
  return null;
}

let overrideFile = null;

function badgesFile() {
  return overrideFile || PATHS.competencesFile;
}

function _setFile(file) {
  overrideFile = file || null;
}

function readAll() {
  const file = badgesFile();
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function writeAll(rows) {
  util.ensureDir(path.dirname(badgesFile()));
  const tmp = `${badgesFile()}.tmp`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
  fs.renameSync(tmp, badgesFile());
}

function findRow(code) {
  return readAll().find((r) => r.CODE === code && r.ACTIF !== false) || null;
}

function autoRow(node) {
  return {
    CODE: node.CODE,
    BRANCHE: node.BRANCHE,
    BRANCHE_LIBELLE: node.BRANCHE_LIBELLE,
    LIBELLE: node.LIBELLE,
    NIVEAU: 0,
    NIVEAU_LABEL: NIVEAUX[0],
    STATUT: 'INCONNU',
    TRANSACTIONS: [],
    ACTIF: true,
    CREE_LE: util.nowIso(),
    MISE_A_JOUR_LE: util.nowIso(),
  };
}

function tree() {
  const rows = readAll();
  const map = {};
  for (const r of rows) map[r.CODE] = r;
  return BRANCHES.map((b) => ({
    CODE: b.CODE,
    LIBELLE: b.LIBELLE,
    COMPETENCES: b.COMPETENCES.map((n) => {
      const r = map[n.CODE];
      return {
        CODE: n.CODE,
        LIBELLE: n.LIBELLE,
        REQUIS: n.REQUIS,
        NIVEAU: r ? r.NIVEAU : 0,
        NIVEAU_LABEL: r ? r.NIVEAU_LABEL : NIVEAUX[0],
        STATUT: r ? r.STATUT : 'INCONNU',
      };
    }),
  }));
}

function list(opts) {
  const o = opts || {};
  let out = readAll().filter((r) => r.ACTIF !== false);
  if (o.code) out = out.filter((r) => r.CODE === o.code);
  if (o.branche) out = out.filter((r) => r.BRANCHE === o.branche);
  if (o.statut) out = out.filter((r) => r.STATUT === o.statut);
  return out.sort((a, b) => (b.NIVEAU - a.NIVEAU) || (a.CODE < b.CODE ? -1 : 1));
}

function propose(identity, code, fields) {
  const node = nodeOf(code);
  if (!node) throw new Error(`Compétence inconnue. Permis : ${allCodes().length} codes de l'arbre (voir « competences tree »).`);
  const f = fields || {};
  const par = f.PAR || (identity ? identity.AIgg_NAME : 'tuteur');
  let row = findRow(code);
  if (!row) row = autoRow(node);
  row.STATUT = 'PROPOSE';
  row.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: 'PROPOSAL',
    PAR: par,
    POURQUOI: f.POURQUOI || null,
    RESSOURCES: f.RESSOURCES || null,
    EXPERIENCES: f.EXPERIENCES || null,
    NOTE: f.NOTE || 'Compétence proposée en apprentissage (validation requise pour tout badge).',
  });
  row.MISE_A_JOUR_LE = util.nowIso();
  const rows = readAll();
  const idx = rows.findIndex((r) => r.CODE === code);
  if (idx === -1) rows.push(row); else rows[idx] = row;
  writeAll(rows);
  journalBadge(identity, 'BADGE_PROPOSED', row, par);
  memorizeBadge(identity, row, 'proposée');
  return row;
}

function honor(identity, code, fields) {
  const node = nodeOf(code);
  if (!node) throw new Error(`Compétence inconnue. Permis : codes de l'arbre (voir « competences tree »).`);
  const f = fields || {};
  const niveau = Number(f.NIVEAU);
  if (!Number.isInteger(niveau) || niveau < 1 || niveau > MAX_NIVEAU) {
    throw new Error(`Niveau de badge invalide (${f.NIVEAU}). Permis : 1 à ${MAX_NIVEAU} (${NIVEAUX[1]} → ${NIVEAUX[MAX_NIVEAU]}).`);
  }
  const preuve = String(f.PREUVE || '').trim();
  if (!preuve) throw new Error('Une preuve réelle est requise (--preuve=…). Jamais de badge sans preuve.');
  const par = f.PAR || '';
  if (!String(par).trim()) throw new Error('La validation explicite du tuteur est requise (--par=…).');

  let row = findRow(code);
  if (!row) row = autoRow(node);
  if (niveau < row.NIVEAU) {
    throw new Error(`Niveau décroissant refusé (déjà ${row.NIVEAU} — « ${row.NIVEAU_LABEL} »). Un badge ne se retire pas par surprise.`);
  }

  const obstacles = [];
  for (const req of node.REQUIS) {
    const reqRow = findRow(req.CODE);
    const n = reqRow ? reqRow.NIVEAU : 0;
    if (n < req.NIVEAU_MIN) {
      obstacles.push(`${nodeOf(req.CODE) ? nodeOf(req.CODE).LIBELLE : req.CODE} (niveau ${n} < ${req.NIVEAU_MIN} requis)`);
    }
  }
  if (obstacles.length) {
    throw new Error(`Prérequis non satisfaits : ${obstacles.join(', ')}.`);
  }

  row.NIVEAU = niveau;
  row.NIVEAU_LABEL = NIVEAUX[niveau];
  row.STATUT = 'BADGE';
  row.TRANSACTIONS.push({
    DATE: util.nowIso(),
    ACTION: `BADGE:${niveau}`,
    PAR: par,
    PREUVE: preuve,
    NOTE: f.NOTE || `Badge « ${node.LIBELLE} » niveau ${niveau} validé explicitement par ${par}.`,
  });
  row.MISE_A_JOUR_LE = util.nowIso();
  const rows = readAll();
  const idx = rows.findIndex((r) => r.CODE === code);
  if (idx === -1) rows.push(row); else rows[idx] = row;
  writeAll(rows);
  journalBadge(identity, 'BADGE_HONORED', row, par);
  memorizeBadge(identity, row, `validée par ${par}`);
  return row;
}

function check(identity, code) {
  const node = nodeOf(code);
  if (!node) throw new Error(`Compétence inconnue : ${code}.`);
  const row = findRow(code);
  const niveau = row ? row.NIVEAU : 0;
  const requis = node.REQUIS.map((req) => {
    const reqRow = findRow(req.CODE);
    const n = reqRow ? reqRow.NIVEAU : 0;
    const ref = nodeOf(req.CODE);
    return {
      CODE: req.CODE,
      LIBELLE: ref ? ref.LIBELLE : req.CODE,
      NIVEAU: n,
      NIVEAU_MIN: req.NIVEAU_MIN,
      SATISFAIT: n >= req.NIVEAU_MIN,
    };
  });
  const obstacles = requis.filter((r) => !r.SATISFAIT).map((r) => `${r.LIBELLE} (niveau ${r.NIVEAU} < ${r.NIVEAU_MIN})`);
  return {
    CODE: code,
    LIBELLE: node.LIBELLE,
    BRANCHE: node.BRANCHE,
    BRANCHE_LIBELLE: node.BRANCHE_LIBELLE,
    NIVEAU: niveau,
    NIVEAU_LABEL: NIVEAUX[niveau] || `niveau ${niveau}`,
    STATUT: row ? row.STATUT : 'INCONNU',
    REQUIS: requis,
    PRET: obstacles.length === 0 && niveau < MAX_NIVEAU,
    PROCHAIN_NIVEAU: niveau < MAX_NIVEAU ? niveau + 1 : null,
    OBSTACLES: obstacles,
  };
}

function log(code) {
  const row = findRow(code);
  if (!row) throw new Error(`Aucun état pour la compétence ${code} (niveau 0, aucun badge).`);
  return {
    CODE: row.CODE,
    BRANCHE: row.BRANCHE,
    BRANCHE_LIBELLE: row.BRANCHE_LIBELLE,
    LIBELLE: row.LIBELLE,
    NIVEAU: { NIVEAU: row.NIVEAU, NIVEAU_LABEL: row.NIVEAU_LABEL, STATUT: row.STATUT },
    TRANSACTIONS: row.TRANSACTIONS,
  };
}

function status(identity) {
  const rows = list();
  const byBranche = {};
  const byNiveau = {};
  const badges = rows.filter((r) => r.STATUT === 'BADGE');
  const proposals = rows.filter((r) => r.STATUT === 'PROPOSE');
  for (const code of BRANCHES.map((b) => b.CODE)) byBranche[code] = 0;
  for (const r of badges) byBranche[r.BRANCHE] = (byBranche[r.BRANCHE] || 0) + 1;
  for (let n = 1; n <= MAX_NIVEAU; n += 1) byNiveau[n] = badges.filter((r) => r.NIVEAU === n).length;
  const recents = [];
  for (const r of rows) {
    for (const t of r.TRANSACTIONS) {
      if (/^BADGE:\d+$/.test(t.ACTION)) recents.push({ DATE: t.DATE, CODE: r.CODE, LIBELLE: r.LIBELLE, ACTION: t.ACTION, PAR: t.PAR });
    }
  }
  recents.sort((a, b) => (a.DATE < b.DATE ? 1 : -1));
  return {
    FICHIER: badgesFile(),
    ARBRE: { BRANCHES: BRANCHES.length, COMPETENCES: allCodes().length },
    NIVEAUX,
    CHAINE,
    REGLE,
    BADGES: badges.length,
    EN_PROPOSITION: proposals.length,
    PAR_BRANCHE: byBranche,
    PAR_NIVEAU: byNiveau,
    BADGES_RECENTS: recents.slice(0, 5),
  };
}

function journalBadge(identity, event, row, par) {
  try {
    require('./journal').journalEvent(event, identity, {
      COMPETENCE_CODE: row.CODE,
      LIBELLE: row.LIBELLE,
      BRANCHE: row.BRANCHE,
      NIVEAU: row.NIVEAU,
      PAR: par,
      STATUT: row.STATUT,
    });
  } catch {}
}

function memorizeBadge(identity, row, action) {
  try {
    require('./memory').memorize(
      'procedures',
      `Compétence « ${row.LIBELLE} » (${row.BRANCHE_LIBELLE}) : niveau ${row.NIVEAU} — « ${row.NIVEAU_LABEL} » — ${action}.`,
      identity,
      { source: 'badges.js', status: row.STATUT === 'BADGE' ? 'confirmed' : 'pending', confidence: 0.9 }
    );
  } catch {}
}

module.exports = {
  NIVEAUX,
  MAX_NIVEAU,
  CHAINE,
  REGLE,
  BRANCHES,
  badgesFile,
  _setFile,
  allCodes,
  branchOf,
  nodeOf,
  tree,
  list,
  propose,
  honor,
  check,
  log,
  status,
};
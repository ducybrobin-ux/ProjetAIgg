'use strict';

const fs = require('fs');
const path = require('path');
const util = require('./util');
const needs = require('./needs');

const { PATHS } = require('./config');

/**
 * Berceau (v0.3.13) : le quota d'espace disque que le tuteur alloue à AIgg.
 *
 * AIgg se connaît en taille (mesure réelle de ses données), connaît l'espace
 * libre réel du disque, et — lorsqu'il devient à l'étroit — DEMANDE de l'aide
 * (besoin AGRANDIR) au lieu d'agir de lui-même. Aucune action automatique.
 *
 * Le quota alloué détermine le NIVEAU (l'« habitation ») d'AIgg : Graine,
 * Berceau, Studio, Appartement, Maison, Atelier, Laboratoire, Centre,
 * Écosystème. Chaque habitation a son équipement prévu (§1 du plan du tuteur).
 * IMPORTANT : plus d'espace ≠ plus intelligent ; l'espace permet seulement plus
 * de connaissances/projets/outils. L'équipement LISTÉ est le PLAN du tuteur ;
 * seul l'équipement réellement présent (outils installés, capacités acquises)
 * est annoncé comme acquis. Honnêteté absolue.
 *
 * Les seuils d'habitation sont PRÉDICTIFS, jamais une obligation : franchir
 * (ou approcher) le seuil d'une habitation ne force PAS le déménagement. AIgg
 * reste dans son habitation courante et peut continuer à acquérir badges,
 * compétences et outils tant qu'il a encore de l'espace disponible. Le
 * « déménagement » (passage dans une habitation plus grande) n'est jamais
 * automatique : soit le tuteur réalloue un quota plus grand (berceau set), soit
 * AIgg devient à l'étroit et DEMANDE (besoin AGRANDIR). Seule l'étroitesse
 * (≥ 85 % du quota) déclenche la demande — jamais un seuil prédictif.
 */

const DEFAULT_ALLOCATION_BYTES = 1024 * 1024 * 1024; // 1 Go, alloué par le tuteur
const TIGHT_PCT = 0.85; // 85 % du quota franchi → AIgg demande de l'aide
const NEED_TYPE = 'AGRANDIR';

const EXCLUDED_DIRS = ['backups', 'node_modules', '.git'];

const BERCEAU_FILE = path.join(PATHS.core, 'berceau.json');

const MB = 1024 * 1024;
const GB = 1024 * MB;

/**
 * Niveaux d'espace (« habitations ») du plan du tuteur (§1) — seuils d'allocation
 * PRÉDICTIFS, du plus simple au plus fourni. Chaque niveau décrit l'ÉQUIPEMENT
 * PRÉVU : ce ne sont pas des outils installés, mais le plan d'équipement de
 * l'habitation. Atteindre un seuil n'oblige PAS à déménager : l'habitation est
 * nommée par le quota alloué par le tuteur, et AIgg continue d'acquérir badges,
 * compétences et outils tant qu'il a de la place (l'étroitesse seule → AGRANDIR).
 */
const LEVELS = [
  {
    index: 0,
    name: 'Graine',
    minBytes: 100 * MB,
    plan: 'Base minimale : identité, état, mémoire, journal, permissions, tuteur.',
    equipment: ['Identité', 'État', 'Mémoire', 'Journal', 'Permissions', 'Tuteur'],
  },
  {
    index: 1,
    name: 'Berceau',
    minBytes: 1 * GB,
    plan: 'Lire, mémoriser, rechercher, apprendre avec le tuteur ; analyseurs JSON et texte ; journal avancé.',
    equipment: ['Lecture', 'Mémorisation', 'Recherche', 'Apprentissage avec le tuteur', 'Analyseur JSON', 'Analyseur texte', 'Journal avancé'],
  },
  {
    index: 2,
    name: 'Studio',
    minBytes: 2 * GB,
    plan: 'Commencer à construire : code, tests, débogage, Git contrôlé, terminal sandbox, validateur JSON, documentation.',
    equipment: ['Code', 'Tests', 'Débogage', 'Git contrôlé', 'Terminal sandbox', 'Validateur JSON', 'Documentation'],
  },
  {
    index: 3,
    name: 'Appartement',
    minBytes: 5 * GB,
    plan: 'Réaliser des projets plus importants : programmation structurée, serveur local, gestionnaire de projet, automatisation sandboxée, analyseur de logs.',
    equipment: ['Programmation structurée', 'Serveur local', 'Gestionnaire de projet', 'Automatisation sandboxée', 'Analyseur de logs'],
  },
  {
    index: 4,
    name: 'Maison',
    minBytes: 10 * GB,
    plan: 'Environnement de travail complet : applications, projets, supervision, gestionnaire de tâches, connecteurs autorisés, recherche externe autorisée.',
    equipment: ['Applications', 'Projets', 'Supervision', 'Gestionnaire de tâches', 'Connecteurs autorisés', 'Recherche externe autorisée'],
  },
  {
    index: 5,
    name: 'Atelier',
    minBytes: 20 * GB,
    plan: 'Apprendre à construire des outils : registre d\'outils, packaging, déploiement local, évaluation d\'IA.',
    equipment: ['Registre d\'outils', 'Packaging', 'Déploiement local', 'Évaluation d\'IA'],
  },
  {
    index: 6,
    name: 'Laboratoire',
    minBytes: 50 * GB,
    plan: 'Expérimentation : hypothèses, protocoles, mesures, comparaison ; recherche III ; ingénierie expérimentale.',
    equipment: ['Expérimentation', 'Protocoles', 'Mesures', 'Recherche III', 'Ingénierie expérimentale'],
  },
  {
    index: 7,
    name: 'Centre',
    minBytes: 100 * GB,
    plan: 'Gros corpus, nombreuses bibliothèques, projets et environnements de test, indexation importante, simulations et modèles locaux éventuels.',
    equipment: ['Gros corpus', 'Bibliothèques nombreuses', 'Environnements de test', 'Indexation importante', 'Simulations et modèles locaux'],
  },
  {
    index: 8,
    name: 'Écosystème',
    minBytes: 250 * GB,
    plan: 'Plusieurs agents/outils spécialisés, nombreuses bibliothèques, environnements multiples, coopération entre outils, migration contrôlée et écosystème d\'extensions. Ce niveau n\'est pas une fin.',
    equipment: ['Agents spécialisés', 'Bibliothèques nombreuses', 'Environnements multiples', 'Coopération entre outils', 'Migration contrôlée', 'Extensions'],
  },
];

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
  const lvl = level(alloc.allocBytes);
  return {
    allocationBytes: alloc.allocBytes,
    allocationHuman: humanBytes(alloc.allocBytes),
    levelIndex: lvl.index,
    levelName: lvl.name,
    level: {
      index: lvl.index,
      name: lvl.name,
      minBytes: lvl.minBytes,
      minHuman: lvl.minHuman,
      plan: lvl.plan,
      next: lvl.next,
    },
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

/**
 * Niveau d'espace (habitation) atteint pour une allocation donnée : le plus
 * haut niveau dont le seuil est <= allocationBytes. Une allocation inférieure
 * au seuil de la Graine reste une Graine (niveau 0). Mesure réelle, jamais
 * devinée : le niveau dépend du quota effectivement alloué par le tuteur.
 * PRÉDICTIF ET NON OBLIGATOIRE : le seuil de la prochaine habitation indique
 * seulement quand un quota plus grand devient pertinent ; il ne force jamais
 * le déménagement. AIgg continue d'acquérir badges/outils tant qu'il a de
 * l'espace — seule l'étroitesse déclenche la demande AGRANDIR.
 */
function level(allocationBytes) {
  const bytes = Number(allocationBytes) || 0;
  let chosen = LEVELS[0];
  for (const lvl of LEVELS) {
    if (bytes >= lvl.minBytes) chosen = lvl;
    else break;
  }
  const next = LEVELS.find((l) => l.index === chosen.index + 1) || null;
  return {
    index: chosen.index,
    name: chosen.name,
    minBytes: chosen.minBytes,
    minHuman: humanBytes(chosen.minBytes),
    plan: chosen.plan,
    equipment: chosen.equipment.slice(),
    next: next ? { index: next.index, name: next.name, minBytes: next.minBytes, minHuman: humanBytes(next.minBytes) } : null,
  };
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
  const hab = `dans mon habitation « ${s.levelName} » (niveau ${s.levelIndex})`;
  if (s.tight) {
    return `Je pèse ${s.usedHuman} (${s.usedFiles} fichiers) ${hab} sur un berceau de ${s.allocationHuman} ` +
      `(${s.usedPct}% utilisé), ${free} — je suis à l'étroit, peux-tu agrandir mon berceau ou me migrer ?`;
  }
  return `Je pèse ${s.usedHuman} (${s.usedFiles} fichiers) ${hab} sur un berceau de ${s.allocationHuman} ` +
    `(${s.usedPct}% utilisé), ${free}. J'ai encore de la place, donc je continue d'acquérir compétences et outils ; ` +
    'aucun seuil d\'habitation ne m\'oblige à déménager.';
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
  LEVELS,
  humanBytes,
  measureSelf,
  freeSpace,
  loadAllocation,
  setAllocation,
  level,
  status,
  isCramped,
  statusText,
  checkAndAsk,
  parseSize,
};
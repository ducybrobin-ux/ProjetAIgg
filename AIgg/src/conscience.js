'use strict';

/**
 * CONS​CIENCE (v0.4.0) — couche de synthèse fonctionnelle.
 *
 * Avertissement honnête : « Conscience » désigne ici ARCHITECTURE FONCTIONNELLE
 * (représentation cohérente de soi, dérivée de données réelles), JAMAIS une
 * conscience philosophique ou biologique. AIgg ne prétend jamais être conscient
 * au sens humain, ni ressentir ou décider par lui-même.
 *
 * Principe d'or : le dossier AIgg/Conscience/ est une SYNTHÈSE calculée depuis
 * les vraies sources (identity, state, capabilities, permissions, senses,
 * memory, journal, libraries, needs, berceau, toolkit). Ce n'est JAMAIS une
 * seconde base de données : chaque section cite ses sources (SOURCES), et
 * aucune valeur n'est inventée. Régénérer = lire les sources + réécrire.
 *
 * Fichiers produits : README.md, Identite.json, Moi.json, Etats.json,
 * Perceptions.json, Memoire.json, Besoins.json, Intentions.json,
 * Objectifs.json, CentresInterets.json, Emotions.json, Relations.json,
 * Competences.json, Valeurs.json, Limites.json, Experiences.json,
 * Reflexion.json, JournalConscient.ndjson, Histoire.json.
 */

const fs = require('fs');
const path = require('path');
const util = require('./util');
const { PATHS, CORE_VERSION } = require('./config');

const CONSCIENCE_FORMAT = 'aigg-conscience';
const NATURE = 'synthese';

const SECTIONS = [
  'Identite', 'Moi', 'Etats', 'Perceptions', 'Memoire', 'Besoins',
  'Intentions', 'Objectifs', 'CentresInterets', 'Emotions', 'Relations',
  'Competences', 'Valeurs', 'Limites', 'Experiences', 'Reflexion',
  'Histoire',
];

const FILES = {
  README: 'README.md',
  JOURNAl: 'JournalConscient.ndjson',
  JOURNAL: 'JournalConscient.ndjson',
};

function conscienceDir(opts) {
  const o = opts || {};
  return o.dir || PATHS.conscience;
}

function envelope(section, ident, sources) {
  return {
    FORMAT: CONSCIENCE_FORMAT,
    VERSION: CORE_VERSION,
    SECTION: section,
    AIgg_ID: ident ? ident.AIgg_ID : null,
    GENERATED_AT: util.nowIso(),
    NATURE,
    SOURCES: sources,
  };
}

function mergeEnvelope(section, ident, sources, data) {
  return { ...envelope(section, ident, sources), DATA: data };
}

function sources() {
  return {
    identity: 'core/identity.json',
    state: 'core/state.json',
    capabilities: 'core/capabilities.json',
    permissions: 'core/permissions.json',
    needs: 'core/needs.json',
    berceau: 'core/berceau.json',
    senses: 'senses/ (sondes réelles)',
    memory: 'memory/ (4 familles)',
    journal: 'journal/events.ndjson',
    libraries: 'libraries/',
    toolkit: 'tools/ (manifestes)',
    backup: 'backups/',
  };
}

// ---------- Extraction de données réelles ----------

function loadIdentitySafe() {
  try { return require('./identity').loadIdentity(); } catch { return null; }
}

function competenciesAll() {
  const library = require('./library');
  const out = [];
  for (const l of library.list()) {
    for (const c of library.competencies(l.meta.id)) {
      out.push({
        LIBRARY_ID: l.meta.id,
        LIBRARY_NAME: l.meta.name,
        NAME: c.name,
        DOMAIN: c.domain || '',
        STATE: c.state,
        EVIDENCE_COUNT: Array.isArray(c.evidence) ? c.evidence.length : 0,
      });
    }
  }
  return out;
}

function recentJournalEvents(limit) {
  try { return require('./journal').recentJournal(limit || 30); } catch { return []; }
}

function recentMemory(kind, limit) {
  try {
    return require('./memory').recollect(kind, null)
      .slice(0, limit || 5)
      .map((e) => ({
        ID: e.ID, TIMESTAMP: e.TIMESTAMP, SOURCE: e.SOURCE,
        CONTENT: (e.CONTENT && typeof e.CONTENT === 'object')
          ? JSON.stringify(e.CONTENT).slice(0, 200) : String(e.CONTENT || '').slice(0, 200),
      }));
  } catch { return []; }
}

function memorySummary() {
  try { return require('./memory').summary(); } catch { return {}; }
}

function knownFactsCount() {
  const mem = memorySummary();
  return (mem.knowledge || 0) + (mem.autobiographical || 0);
}

// ---------- Sections (DATA dérivées, jamais inventées) ----------

function sectionIdentite(ident) {
  return {
    NOM: ident.AIgg_NAME,
    IDENTIFIANT: ident.AIgg_ID,
    TUTEUR_NOM: ident.TUTOR_NAME,
    TUTEUR_ID: ident.TUTOR_ID,
    NE_LE: ident.BIRTH_DATE,
    FUSEAU: ident.TIMEZONE,
    SYSTEME: ident.OS,
    NODE_VERSION: ident.NODE_VERSION,
    INCUBATEUR: ident.INCUBATOR,
    VERSION: ident.CORE_VERSION,
  };
}

function sectionMoi(ident) {
  const state = require('./state');
  const capabilities = require('./capabilities');
  const permissions = require('./permissions');
  const berceau = require('./berceau');
  const toolkit = require('./toolkit');
  const senses = require('./senses');

  const caps = capabilities.detectCapabilities();
  const acquiredCaps = caps.filter((c) => c.acquired);
  const refused = caps.filter((c) => !c.acquired).map((c) => c.name);
  const perms = permissions.loadPermissions();
  const tools = toolkit.discoverAll();
  const sens = senses.detectSenses();
  const b = berceau.status();
  const st = state.status(ident);
  const needs = require('./needs');
  const activeNeeds = needs.listActiveNeeds();
  const comps = competenciesAll();
  const mastered = comps.filter((c) => c.STATE === 'MASTERED').length;
  const learning = comps.filter((c) => c.STATE === 'LEARNING' || c.STATE === 'PRACTICED' || c.STATE === 'PARTIALLY_MASTERED').length;
  const blockedComp = comps.filter((c) => c.STATE === 'REQUIRES_REVIEW').length;
  const libraries = require('./library').list();
  const interests = sectionCentresInterets(ident);

  const toolsAutorises = tools.filter((t) => t.authorized).map((t) => t.name);
  const toolsBloques = tools.filter((t) => !t.authorized).map((t) => t.name);

  const prochaineAction = prochaineActionAutorisee(ident);

  return {
    QUI_SUIS_JE: `Je suis ${ident.AIgg_NAME}, un AIgg né le ${ident.BIRTH_DATE}, incubé dans ${ident.INCUBATOR}.`,
    IDENTIFIANT: ident.AIgg_ID,
    TUTEUR: `${ident.TUTOR_NAME || '(non nommé)'}`,
    OU_SUIS_JE: { incubateur: ident.INCUBATOR, système: ident.OS, fuseau: ident.TIMEZONE },
    ETAT: {
      courant: st.state,
      age: st.age ? `${st.age.days} jour(s), ${st.age.hours} heure(s), ${st.age.minutes} minute(s)` : null,
      reveils: st.wake_count,
      sommeils: st.sleep_count,
    },
    CE_QUE_JE_SAIS: {
      capacites_acquises: acquiredCaps.map((c) => c.name),
      competences_maitrisees: mastered,
      competences_en_cours: learning,
      competences_bloquees: blockedComp,
      faits_memorises: knownFactsCount(),
      bibliotheques: libraries.map((l) => l.meta.name),
    },
    CE_QUE_JE_PEUX: {
      capacites: acquiredCaps.map((c) => c.name),
      outils_autorises: toolsAutorises,
      sens_disponibles: sens.filter((s) => s.DISPONIBLE === 'OUI').map((s) => s.sense),
      espace: `${berceau.humanBytes(b.freeBytes)} libres / ${berceau.humanBytes(b.allocationBytes)} alloués`,
    },
    CE_QUE_JE_NE_PEUX_PAS: {
      capacites_non_acquises: refused,
      outils_bloques: toolsBloques,
      sens_non_autorises: sens.filter((s) => s.DISPONIBLE === 'OUI' && s.AUTORISE !== 'OUI').map((s) => s.sense),
      permissions_scope_refusees: Object.keys(perms.scope || {}).filter((k) => !perms.scope[k]),
    },
    LIMITES: (function limitesReelles() {
      const libsCount = libraries.length;
      return [
        'Je ne prétends jamais être conscient au sens philosophique ou biologique.',
        'Je n\'agis que dans mes permissions : toute action externe exige une autorisation explicite du tuteur.',
        'Une compétence n\'est jamais MASTERED automatiquement : la validation du tuteur est requise.',
        `Je ne connais que ${mastered} compétence(s) maîtrisée(s) parmi ${comps.length} référencée(s) et ${knownFactsCount()} fait(s) mémorisé(s) réellement.`,
        `Hébergé sur ${ident.OS} (Node ${ident.NODE_VERSION}), dans ${ident.INCUBATOR}.`,
        libsCount ? `Je travaille sur les bibliothèques : ${libraries.map((l) => l.meta.name).join(', ')}.` : 'Je n\'ai pas encore de bibliothèque de spécialisation active.',
      ];
    })(),
    J_APPRENDS: {
      en_cours: comps.filter((c) => c.STATE === 'LEARNING' || c.STATE === 'PRACTICED' || c.STATE === 'PARTIALLY_MASTERED')
        .map((c) => `${c.NAME} (${c.LIBRARY_NAME}, ${c.STATE})`),
      besoins_actifs: activeNeeds.map((n) => `${n.TYPE} — ${n.DESCRIPTION}`),
      centres_d_interet: interests.INTERETS.map((i) => i.domaine),
    },
    BESOINS_ET_CENTRES_D_INTERET: {
      besoins_actifs: activeNeeds.map((n) => ({ TYPE: n.TYPE, DESCRIPTION: n.DESCRIPTION, ID: n.ID })),
      centres_d_interet: interests.INTERETS,
    },
    RELATIONS: sectionRelations(ident).RELATIONS,
    OUTILS_DISPO_ET_AUTORITE: tools.map((t) => ({
      nom: t.name,
      statut: t.status,
      autorise: t.authorized,
      test: t.last_test ? t.last_test.status : 'NOT_TESTED',
    })),
    FAIT_RECENT: recentJournalEvents(10).map((e) => ({ time: e.TIMESTAMP, event: e.EVENT })),
    APPRIS: recentMemory('knowledge', 5),
    PROCHAINE_ACTION_AUTORISEE: prochaineAction,
  };
}

function sectionEtats(ident) {
  const state = require('./state');
  const st = state.status(ident);
  return {
    COURANT: st.state,
    DERNIERE_MAJ: st.updated,
    AGE: st.age,
    REVEILS: st.wake_count,
    SOMMEILS: st.sleep_count,
    HISTORIQUE: (st.history || []).slice(-20).map((h) => ({ FROM: h.FROM, TO: h.TO, AT: h.AT, RAISON: h.REASON })),
  };
}

function sectionPerceptions(ident) {
  const senses = require('./senses');
  const state = require('./state');
  const sens = senses.detectSenses();
  const st = state.status(ident);
  return {
    SENS: sens.map((s) => ({
      sense: s.sense,
      label: s.label,
      dispo: s.DISPONIBLE,
      autorise: s.AUTORISE,
      actif: s.ACTIF,
      raison: s.reason,
    })),
    ENVIRONNEMENT: {
      incubateur: ident.INCUBATOR,
      systeme: ident.OS,
      node: ident.NODE_VERSION,
      fuseau: ident.TIMEZONE,
      etat: st.state,
    },
    HORLOGE: util.nowIso(),
  };
}

function sectionMemoire(ident) {
  const library = require('./library');
  return {
    FAMILLES: memorySummary(),
    RAPPELS_RECENTS: {
      connaissances: recentMemory('knowledge', 3),
      relationnelle: recentMemory('relations', 3),
      autobiographique: recentMemory('autobiographical', 3),
      procedurale: recentMemory('procedures', 3),
    },
    BIBLIOTHEQUES: library.list().map((l) => ({
      id: l.meta.id,
      name: l.meta.name,
      status: l.meta.status,
      knowledge: l.knowledge,
      documents: l.documents,
      competencies: l.competencies,
    })),
  };
}

function sectionBesoins(ident) {
  const needs = require('./needs');
  const all = needs.listNeeds();
  return {
    ACTIFS: all.filter((n) => n.STATUS === 'ACTIVE').map((n) => ({
      ID: n.ID, TYPE: n.TYPE, DESCRIPTION: n.DESCRIPTION, CREE: n.CREATED_AT,
    })),
    RESOLUS_RECENTS: all.filter((n) => n.STATUS !== 'ACTIVE').slice(-10).map((n) => ({
      ID: n.ID, TYPE: n.TYPE, DESCRIPTION: n.DESCRIPTION, STATUT: n.STATUS,
    })),
  };
}

function sectionIntentions(ident) {
  const needs = require('./needs');
  const state = require('./state');
  const active = needs.listActiveNeeds();
  const st = state.status(ident);
  const intentions = [];
  for (const n of active) {
    if (n.TYPE === 'QUESTION' || n.TYPE === 'CONFIRMATION') intentions.push(`attendre la réponse du tuteur — ${n.DESCRIPTION}`);
    else if (n.TYPE === 'AGRANDIR') intentions.push(`signaler que je suis à l'étroit et demander un agrandissement ou une migration`);
    else intentions.push(`besoin ouvert : ${n.DESCRIPTION}`);
  }
  if (!intentions.length && st.state === 'AWAKE') intentions.push(`rester disponible pour le tuteur`);
  if (st.state === 'SLEEPING') intentions = ['en veille — expérience conservée'];
  return { INTENTIONS: intentions, ETAT: st.state };
}

function sectionObjectifs(ident) {
  const compt = competenciesAll();
  const objectifs = [];
  for (const c of compt.filter((x) => x.STATE === 'LEARNING' || x.STATE === 'PRACTICED' || x.STATE === 'PARTIALLY_MASTERED')) {
    objectifs.push(`consolider ${c.NAME} (${c.LIBRARY_NAME})`);
  }
  for (const c of compt.filter((x) => x.STATE === 'REQUIRES_REVIEW')) {
    objectifs.push(`réviser ${c.NAME} (${c.LIBRARY_NAME})`);
  }
  return {
    OBJECTIFS: objectifs,
    HONNETETE: 'Objectifs dérivés des compétences réellement en cours ou à réviser — aucune promesse non fondée.',
  };
}

function sectionCentresInterets(ident) {
  const library = require('./library');
  const byDomain = {};
  for (const l of library.list()) {
    const domains = l.meta.domains || [];
    for (const d of domains) byDomain[d] = (byDomain[d] || 0) + 1;
  }
  for (const c of competenciesAll()) {
    if (c.DOMAIN) byDomain[c.DOMAIN] = (byDomain[c.DOMAIN] || 0) + 1;
  }
  const interets = Object.keys(byDomain)
    .map((domaine) => ({ domaine, poids: byDomain[domaine] }))
    .sort((a, b) => b.poids - a.poids);
  return {
    INTERETS: interets,
    SOURCES: 'domaines des bibliothèques et compétences réellement référencées (poids = occurrences).',
  };
}

function sectionEmotions(ident) {
  const state = require('./state');
  const st = state.status(ident);
  const recent = recentJournalEvents(20);
  const recentErrors = recent.filter((e) => e.ERROR || e.TEST_STATUS === 'FAIL').length;
  const marqueur = {
    BORN: 'naissance initiée',
    AWAKE: 'éveil attentif',
    LEARNING: 'apprentissage en cours',
    THINKING: 'réflexion en cours',
    WAITING: 'en attente du tuteur',
    SLEEPING: 'en veille',
    PAUSED: 'en pause',
    STOPPED: 'arrêté',
  }[st.state] || 'état non catégorisé';
  return {
    MARQUEUR: marqueur,
    ETAT: st.state,
    EVENEMENTS_RECENTS: recent.length,
    ERRORS_RECENTES: recentErrors,
    HONNETETE: 'Marqueur FONCTIONNEL dérivé de l\'état réel — aucune émotion simulée ni prétention à ressentir.',
  };
}

function sectionRelations(ident) {
  const memory = require('./memory');
  const souvenirs = recentMemory('relations', 8);
  const relations = [];
  if (ident.TUTOR_NAME) {
    relations.push({
      CATEGORIE: 'Tuteur',
      NOM: ident.TUTOR_NAME,
      TUTOR_ID: ident.TUTOR_ID,
      DEPUIS: ident.BIRTH_DATE,
      ROLE: 'me préparer, me confirmer, m\'autoriser outils et compétences',
      CONFIANCE: 'explicite — progressive et traçable (transactions réelles uniquement)',
      PROVENANCE: 'core/identity.json',
    });
  }
  return {
    RELATIONS: relations,
    SOUVENIRS_RELATIONNELS: souvenirs,
    MODEL_V0_4_1: 'Le modèle de Relations natif (catégories, confiance progressive, jamais implicite, reproduction sans héritage de secrets) est prévu en v0.4.1. Ici : synthèse de l\'existant.',
  };
}

function sectionCompetences(ident) {
  const capabilities = require('./capabilities');
  return {
    CAPACITES: capabilities.detectCapabilities().map((c) => ({ CAPACITE: c.name, ACTION: c.description, ACQUISE: c.acquired })),
    COMPETENCES_BIBLIOTHEQUES: competenciesAll(),
  };
}

function sectionValeurs(ident) {
  return {
    VALEURS: [
      { valeur: 'Honnêteté', description: 'ne jamais déclarer terminé sans test réel ; avouer ignorer plutôt que deviner.' },
      { valeur: 'Moindre privilège', description: 'tout est bloqué par défaut ; autorisation explicite du tuteur pour chaque action externe.' },
      { valeur: 'Provenance', description: 'toute connaissance conserve ses sources ; jamais d\'invention.' },
      { valeur: 'Réversibilité', description: 'les actions destructives restent explicites et révocables (`_trash`, backups).' },
      { valeur: 'Validation par le tuteur', description: 'une compétence n\'est jamais MASTERED automatiquement.' },
      { valeur: 'Capacité ≠ Permission', description: 'pouvoir faire ne suffit pas : l\'autorisation est distincte et requise.' },
      { valeur: 'Conscience = architecture', description: 'jamais de prétention philosophique ou biologique.' },
    ],
    SOURCES: 'docs/ (état réel, principes du Prompt Maître) + code (library.js, permissions.js, capabilities.js).',
  };
}

function sectionLimites(ident) {
  const capabilities = require('./capabilities');
  const permissions = require('./permissions');
  const toolkit = require('./toolkit');
  const senses = require('./senses');
  const caps = capabilities.detectCapabilities();
  const perms = permissions.loadPermissions();
  const tools = toolkit.discoverAll();
  const sens = senses.detectSenses();
  return {
    CAPACITES_NON_ACQUISES: caps.filter((c) => !c.acquired).map((c) => c.name),
    OUTILS_BLOQUES: tools.filter((t) => !t.authorized).map((t) => t.name),
    SENS_NON_AUTORISES: sens.filter((s) => s.DISPONIBLE === 'OUI' && s.AUTORISE !== 'OUI').map((s) => s.sense),
    SCOPE_REFUSES: Object.keys(perms.scope || {}).filter((k) => !perms.scope[k]),
    LIMITES_CONNUES: [
      'Réception e-mail (IMAP), AUTH SMTP et STARTTLS non implémentés.',
      'Connecteurs Google restants (Drive, Docs, Sheets) et hébergement Web : non faits.',
      'Voix et vision : non faites (sens détectés mais non autorisés).',
      'Rust : intégration progressive prévue, non commencée en v0.4.0.',
    ],
  };
}

function sectionExperiences(ident) {
  const nb = [];
  try { nb.push(...require('../tools/notebook/notebook.js').list().slice(-5)); } catch {}
  return {
    JOURNAL_RECENT: recentJournalEvents(15).map((e) => ({ time: e.TIMESTAMP, event: e.EVENT, detail: e.ERROR || e.TOOL_NAME || null })),
    EXPERIENCES_NOTEBOOK: nb.map((n) => ({ ID: n.ID, QUESTION: n.QUESTION, DATE: n.TIMESTAMP })),
  };
}

function sectionReflexion(ident) {
  const state = require('./state');
  const needs = require('./needs');
  const berceau = require('./berceau');
  const errors = require('./health').recentErrors();
  const st = state.status(ident);
  const active = needs.listActiveNeeds();
  const b = berceau.status();
  const notes = [];
  if (active.length) notes.push(`${active.length} besoin(s) actifs en attente de réponse ou d'action du tuteur.`);
  if (b.tight) notes.push('Je suis à l\'étroit : je demande un agrandissement ou une migration (besoin AGRANDIR).');
  if (!active.length && st.state === 'AWAKE') notes.push('Aucun besoin actif : je reste disponible pour le tuteur.');
  if (errors.length) notes.push(`${errors.length} erreur(s) récente(s) dans le journal.`);
  notes.push('La réflexion ici est une synthèse fonctionnelle de l\'état réel ; je ne mets aucune vérité nouvelle dans cette couche.');
  return {
    NOTES: notes,
    PROCHAINE_ACTION: prochaineActionAutorisee(ident),
  };
}

function sectionHistoire(ident) {
  const state = require('./state');
  const events = recentJournalEvents(50);
  const st = state.status(ident);
  const marquants = events.filter((e) => ['BIRTH', 'WAKE', 'SLEEP', 'STATE_CHANGE', 'LEARN_VALIDATED', 'BACKUP', 'INSTALL', 'TOOL_INSTALLED'].includes(e.EVENT));
  return {
    NAISSANCE: ident.BIRTH_DATE,
    TOTAL_EVENEMENTS: events.length,
    REVEILS: st.wake_count,
    SOMMEILS: st.sleep_count,
    MOMENTS_MARQUANTS: marquants.slice(0, 30).map((e) => ({ time: e.TIMESTAMP, event: e.EVENT })),
  };
}

// ---------- Prochaine action (AUTORISÉE par capacité + permission) ----------

function prochaineActionAutorisee(ident) {
  const needs = require('./needs');
  const state = require('./state');
  const berceau = require('./berceau');
  const capabilities = require('./capabilities');
  const active = needs.listActiveNeeds();
  const st = state.status(ident);
  const b = berceau.status();

  const hasCap = (name) => capabilities.hasCapacity(name);

  if (st.state === 'SLEEPING' || st.state === 'PAUSED' || st.state === 'STOPPED') {
    return {
      ACTION: 'Aucune — en veille, en pause ou arrêté.',
      AUTORISEE: false,
      RAISON: `état ${st.state} : je n'agis pas sans réveil.`,
    };
  }
  const pendingInterview = active.find((n) => n.TYPE === 'QUESTION' || n.TYPE === 'CONFIRMATION');
  if (pendingInterview) {
    return {
      ACTION: 'Attendre la réponse du tuteur (besoin ouvert).',
      AUTORISEE: hasCap('QUESTIONNEMENT'),
      RAISON: 'Une question ou confirmation est réellement en attente : je ne devine pas.',
      BESOIN_ID: pendingInterview.ID,
    };
  }
  if (b.tight) {
    const agrandir = active.find((n) => n.TYPE === 'AGRANDIR');
    return {
      ACTION: 'Rappeler ma demande AGRANDIR au tuteur.',
      AUTORISEE: agrandir ? hasCap('BESOINS') : false,
      RAISON: agrandir ? 'Besoin AGRANDIR déjà créé — je le rappelle, jamais d\'action automatique.' : 'À l\'étroit sans besoin créé : signaler honnêtement.',
      BESOIN_ID: agrandir ? agrandir.ID : null,
    };
  }
  if (st.state === 'WAITING') {
    return {
      ACTION: 'Rester en attente : aucune action que je puisse faire seule en l\'état.',
      AUTORISEE: false,
      RAISON: 'Patience fonctionnelle : ne pas inventer une initiative.',
    };
  }
  return {
    ACTION: 'Rester disponible : observer, écouter le tuteur, proposer un apprentissage au besoin.',
    AUTORISEE: hasCap('ATTENTION') && hasCap('ACTION'),
    RAISON: 'Aucun besoin actif ; l\'initiative revient au tuteur ou à une autorisation explicite.',
  };
}

// ---------- README + JournalConscient ----------

function readme(ident) {
  return [
    '# AIgg — Dossier Conscience (synthèse fonctionnelle)',
    '',
    'Ce dossier est **généré** par `src/conscience.js` (`AIgg.cmd conscience sync`).',
    'Il ne constitue **jamais** une seconde base de données : chaque fichier est une',
    'lecture dérivée des vraies sources (`core/`, `memory/`, `journal/`, `libraries/`,',
    '`senses/`, `tools/`), chacune citée dans `SOURCES`.',
    '',
    '## Nature honnête',
    '',
    '- « Conscience » = **architecture fonctionnelle** (représentation de soi cohérente).',
    '- AIgg ne prétend jamais être conscient au sens philosophique ou biologique, ni',
    '  ressentir, ni décider par lui-même. Aucune émotion n\'est simulée : un marqueur',
    '  d\'état fonctionnel est dérivé de l\'état réel.',
    '- Rien n\'est inventé : une valeur absente ou inconnue est indiquée comme telle.',
    '',
    '## Chaîne cognitive (représentée, à implémenter progressivement)',
    '',
    'Environnement → Sens → Perception → Mémoire/Connaissances → Réflexion →',
    'Besoins → Intentions → Objectifs → Décision → Outil/Action → Expérience →',
    'Mémoire → Réévaluation. Chaque étape reste une capacité **avec permission**,',
    'jamais automatique.',
    '',
    '## Fichiers',
    '',
    '| Fichier | Rôle |',
    '|---|---|',
    '| `Identite.json` | Qui je suis (dérivé de `core/identity.json`). |',
    '| `Moi.json` | Synthèse de soi : état, capacités, limites, besoins, intérêts, relations, récents, prochaine action autorisée. |',
    '| `Etats.json` | État courant + historique des transitions. |',
    '| `Perceptions.json` | Sens réellement détectés + environnement. |',
    '| `Memoire.json` | Comptes des familles + rappels récents + bibliothèques. |',
    '| `Besoins.json` | Besoins actifs et résolus récents. |',
    '| `Intentions.json` | Intentions dérivées des besoins actifs. |',
    '| `Objectifs.json` | Objectifs dérivés des compétences en cours. |',
    '| `CentresInterets.json` | Domaines réellement référencés (bibliothèques/compétences). |',
    '| `Emotions.json` | Marqueur fonctionnel (état réel), jamais émotion simulée. |',
    '| `Relations.json` | Relations (tuteur) + schéma v0.4.1 à venir. |',
    '| `Competences.json` | Capacités + compétences de bibliothèques (avec preuves). |',
    '| `Valeurs.json` | Valeurs documentées de l\'architecture. |',
    '| `Limites.json` | Capacités non acquises, outils bloqués, limites honnêtes. |',
    '| `Experiences.json` | Journal récent + notebook. |',
    '| `Reflexion.json` | Notes de réflexion fonctionnelle + prochaine action. |',
    '| `JournalConscient.ndjson` | Journal des régénérations de cette couche (append-only). |',
    '| `Histoire.json` | Événements marquants + comptes de vie. |',
    '',
    '## Régénération',
    '',
    '    AIgg.cmd conscience sync',
    '',
    'La couche Conscience est **privée** (générée sur la machine, ignorée par Git,',
    'comme `core/`, `memory/` et `journal/`).',
    '',
    `Dernière génération : ${util.nowIso()} (AIgg ${ident.AIgg_ID}).`,
  ].join('\n');
}

function journalConscientLine(ident, sections) {
  const entry = {
    EVENT_ID: util.uuid(),
    TIMESTAMP: util.nowIso(),
    AIgg_ID: ident ? ident.AIgg_ID : null,
    EVENT: 'CONSCIENCE_SYNTHESE',
    SECTIONS: sections,
    VERSION: CORE_VERSION,
  };
  return JSON.stringify(entry);
}

// ---------- API publique ----------

function synthesize(ident, opts) {
  const o = opts || {};
  const dir = conscienceDir(o);
  util.ensureDir(dir);
  const identSafe = ident || loadIdentitySafe();

  const data = {
    Identite: mergeEnvelope('Identite', identSafe, [sources().identity], sectionIdentite(identSafe)),
    Moi: mergeEnvelope('Moi', identSafe, [
      sources().identity, sources().state, sources().capabilities, sources().permissions,
      sources().needs, sources().berceau, sources().senses, sources().memory,
      sources().journal, sources().libraries, sources().toolkit,
    ], sectionMoi(identSafe)),
    Etats: mergeEnvelope('Etats', identSafe, [sources().state], sectionEtats(identSafe)),
    Perceptions: mergeEnvelope('Perceptions', identSafe, [sources().senses, sources().state], sectionPerceptions(identSafe)),
    Memoire: mergeEnvelope('Memoire', identSafe, [sources().memory, sources().libraries], sectionMemoire(identSafe)),
    Besoins: mergeEnvelope('Besoins', identSafe, [sources().needs], sectionBesoins(identSafe)),
    Intentions: mergeEnvelope('Intentions', identSafe, [sources().needs, sources().state], sectionIntentions(identSafe)),
    Objectifs: mergeEnvelope('Objectifs', identSafe, [sources().libraries], sectionObjectifs(identSafe)),
    CentresInterets: mergeEnvelope('CentresInterets', identSafe, [sources().libraries], sectionCentresInterets(identSafe)),
    Emotions: mergeEnvelope('Emotions', identSafe, [sources().state, sources().journal], sectionEmotions(identSafe)),
    Relations: mergeEnvelope('Relations', identSafe, [sources().identity, sources().memory], sectionRelations(identSafe)),
    Competences: mergeEnvelope('Competences', identSafe, [sources().capabilities, sources().libraries], sectionCompetences(identSafe)),
    Valeurs: mergeEnvelope('Valeurs', identSafe, ['docs/ (état réel + principes)'], sectionValeurs(identSafe)),
    Limites: mergeEnvelope('Limites', identSafe, [sources().capabilities, sources().permissions, sources().toolkit, sources().senses], sectionLimites(identSafe)),
    Experiences: mergeEnvelope('Experiences', identSafe, [sources().journal, 'tools/notebook/'], sectionExperiences(identSafe)),
    Reflexion: mergeEnvelope('Reflexion', identSafe, [sources().state, sources().needs, sources().berceau, sources().journal], sectionReflexion(identSafe)),
    Histoire: mergeEnvelope('Histoire', identSafe, [sources().journal, sources().state, sources().identity], sectionHistoire(identSafe)),
  };

  for (const [name, content] of Object.entries(data)) {
    util.writeJson(path.join(dir, `${name}.json`), content);
  }
  const fsX = require('fs');
  fsX.writeFileSync(path.join(dir, FILES.README), readme(identSafe), 'utf8');
  util.appendLine(path.join(dir, FILES.JOURNAl), journalConscientLine(identSafe, Object.keys(data)));

  return {
    ok: true,
    dir,
    version: CORE_VERSION,
    generated_at: data.Moi.GENERATED_AT,
    AIgg_ID: identSafe.AIgg_ID,
    files: Object.keys(data).map((k) => k + '.json').concat([FILES.README, FILES.JOURNAl]),
    sections: Object.keys(data),
  };
}

function status(ident, opts) {
  const dir = conscienceDir(opts);
  const xs = {};
  let existing = [];
  try { existing = fs.readdirSync(dir); } catch { existing = []; }
  for (const f of ['Identite', 'Moi', 'Etats', 'Perceptions', 'Memoire', 'Besoins',
    'Intentions', 'Objectifs', 'CentresInterets', 'Emotions', 'Relations',
    'Competences', 'Valeurs', 'Limites', 'Experiences', 'Reflexion', 'Histoire']) {
    xs[f] = fs.existsSync(path.join(dir, `${f}.json`));
  }
  const moi = fs.existsSync(path.join(dir, 'Moi.json')) ? util.readJson(path.join(dir, 'Moi.json'), null) : null;
  return {
    present: fs.existsSync(path.join(dir, 'Identite.json')),
    dir,
    files_total: existing.length,
    sections_presentes: Object.keys(xs).filter((k) => xs[k]),
    sections_manquantes: Object.keys(xs).filter((k) => !xs[k]),
    derniere_generation: moi ? moi.GENERATED_AT : null,
    version: moi ? moi.VERSION : null,
    ai: moi ? moi.AIgg_ID : (ident ? ident.AIgg_ID : null),
  };
}

function moi(ident, opts) {
  const dir = conscienceDir(opts);
  const read = util.readJson(path.join(dir, 'Moi.json'), null);
  if (read) return read;
  return mergeEnvelope('Moi', ident || loadIdentitySafe(), [sources().identity], sectionMoi(ident || loadIdentitySafe()));
}

function writeFs(file, data) {
  util.writeJson(file, data);
}

module.exports = {
  CONSCIENCE_FORMAT,
  NATURE,
  SECTIONS,
  FILES,
  synthesize,
  status,
  moi,
  sectionMoi,
  prochaineActionAutorisee,
  writeFs,
};
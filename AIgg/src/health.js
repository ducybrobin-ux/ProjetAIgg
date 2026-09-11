'use strict';

const util = require('./util');
const config = require('./config');

/**
 * Santé du système (v0.3.13) : la vue consolidée que le tuteur consulte depuis
 * la console (§18 du plan du tuteur : 14 points).
 *
 * Chaque chiffre est une MESURE RÉELLE — aucun inventaire fantôme. Les
 * compétences sont comptées depuis la vérité du disque : capacités acquises
 * (core/capabilities.json) et compétences des bibliothèques par état
 * (MASTERED/LEARNING/REQUIRES_REVIEW). Les erreurs récentes sont les
 * événements du journal porteurs d'un marqueur d'échec réel.
 */

function scoreCompetencies(ident) {
  const capabilities = require('./capabilities');
  const library = require('./library');
  const caps = capabilities.detectCapabilities();
  const acquiredCaps = caps.filter((c) => c.acquired).length;
  let acquired = 0;
  let learning = 0;
  let blocked = 0;
  for (const l of library.list()) {
    for (const c of library.competencies(l.meta.id)) {
      if (c.state === 'MASTERED') acquired += 1;
      else if (c.state === 'REQUIRES_REVIEW') blocked += 1;
      else if (c.state !== 'UNKNOWN') learning += 1;
    }
  }
  return {
    capabilities_total: caps.length,
    capabilities_acquires: acquiredCaps,
    competencies_acquises: acquired,
    competencies_en_cours: learning,
    competencies_bloquees: blocked,
  };
}

function recentErrors() {
  const journal = require('./journal');
  const recent = journal.recentJournal(300);
  return recent
    .filter((e) => e.ERROR
      || e.TEST_STATUS === 'FAIL'
      || /(ERR|ECHEC|FAIL|PANNE)/.test(String(e.EVENT || '')))
    .slice(-10)
    .reverse()
    .map((e) => ({
      TIMESTAMP: e.TIMESTAMP,
      EVENT: e.EVENT,
      ERROR: e.ERROR || (e.TEST_STATUS ? `test ${e.TOOL_NAME || ''} ${e.TEST_STATUS}`.trim() : null),
      TOOL_NAME: e.TOOL_NAME || null,
    }));
}

function overview(ident) {
  const berceau = require('./berceau');
  const state = require('./state');
  const library = require('./library');
  const toolkit = require('./toolkit');
  const permissions = require('./permissions');
  const senses = require('./senses');
  const backup = require('./backup');
  const needs = require('./needs');

  const b = berceau.status();
  const libs = library.list();
  const tools = toolkit.discoverAll();
  const perms = permissions.loadPermissions();
  const sens = senses.detectSenses();
  const st = state.status(ident);
  const backs = backup.listBackups();
  const activeNeeds = needs.listActiveNeeds();

  let notebookCount = 0;
  try { notebookCount = require('../tools/notebook/notebook.js').list().length; } catch {}

  const scopeActives = Object.values(perms.scope || {}).filter(Boolean).length;
  const toolsAutorises = tools.filter((t) => t.authorized).length;
  const toolsInstalles = tools.filter((t) => t.status === 'installed').length;
  const toolsFail = tools.filter((t) => t.last_test && t.last_test.status === 'FAIL').length;

  return {
    at: util.nowIso(),
    version: config.CORE_VERSION,
    etat: {
      courant: st.state,
      derniere_maj: st.updated,
      reveils: st.wake_count,
      sommeils: st.sleep_count,
    },
    niveau: {
      index: b.levelIndex,
      name: b.levelName,
      minBytes: b.level.minBytes,
      plan: b.level.plan,
      suivant: b.level.next,
    },
    espace: {
      total_bytes: b.allocationBytes,
      total_human: b.allocationHuman,
      utilise_bytes: b.usedBytes,
      utilise_human: b.usedHuman,
      disponible_bytes: b.freeBytes,
      disponible_human: b.freeHuman,
      pourcent_utilise: b.usedPct,
      a_l_etroit: b.tight,
    },
    bibliotheques: {
      presentes: libs.length,
      actives: libs.filter((l) => l.meta.status === 'active').length,
      archivees: libs.filter((l) => l.meta.status === 'archived').length,
      noms: libs.map((l) => l.meta.name),
    },
    outils: {
      presents: tools.length,
      installes: toolsInstalles,
      autorises: toolsAutorises,
      tests_en_echec: toolsFail,
      noms: tools.map((t) => t.name),
    },
    competences: scoreCompetencies(ident),
    permissions: {
      actives: toolsAutorises + scopeActives,
      tools_autorises: toolsAutorises,
      scope_actifs: scopeActives,
      sources: {
        tools: Object.keys(perms.tools || {}).length,
        scope: Object.keys(perms.scope || {}).length,
      },
    },
    sens: {
      disponibles: sens.filter((s) => s.DISPONIBLE === 'OUI').length,
      inconnus: sens.filter((s) => s.DISPONIBLE === 'UNKNOWN').length,
      total: sens.length,
    },
    taches: {
      experiences_notebook: notebookCount,
      besoins_actifs: activeNeeds.length,
      questions_ouvertes: activeNeeds.filter((n) => n.TYPE === 'QUESTION' || n.TYPE === 'CONFIRMATION').length,
    },
    erreurs_recentes: recentErrors(),
    sauvegardes: {
      count: backs.length,
      recentes: backs.slice(-5).map((b) => b.manifest.TIMESTAMP),
    },
  };
}

module.exports = { overview, scoreCompetencies, recentErrors };
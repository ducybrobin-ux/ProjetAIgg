'use strict';

/**
 * Apprentissage continu (v0.3.6).
 *
 * Trois mécanismes honnêtes, uniquement bâtis sur des données réelles
 * (mémoire + journal) — aucune invention :
 *
 * 1. relireMemoire(ident)  — relecture de la mémoire au réveil : re-parcourt
 *    les 4 familles et dresse un bilan sans rien modifier.
 * 2. revisionAcquis(ident) — révision des acquis : les connaissances
 *    « validées » non relues depuis N jours sont marquées
 *    (LAST_REVIEW / REVISION_COUNT) ; mode `propose` = sec, mode `apply` =
 *    application + journalisation ; `plan` demande au tuteur une révision
 *    (besoin PLANIFICATION, jamais créé deux fois tant qu'il est actif).
 * 3. journalToMemory(ident) — boucle journal→mémoire : relit le journal et
 *    reconstitue en mémoire les acquisitions validées (LEARN_VALIDATED /
 *    QUESTION_ANSWERED) absentes, SAUF celles que le tuteur a explicitement
 *    supprimées (MEMORY_DELETE). Idempotent.
 */

const util = require('./util');
const memory = require('./memory');
const journal = require('./journal');

function relireMemoire(ident) {
  const parFamille = memory.summary();
  const all = memory.allFamilies();
  const knowledge = all.filter((r) => r.family === 'knowledge');
  const acquises = knowledge.filter((r) => (r.entry && r.entry.STATUS) === 'validated');
  return {
    ok: true,
    total: all.length,
    parFamille,
    connaissances: knowledge.length,
    acquises: acquises.length,
    enAttente: knowledge.length - acquises.length,
  };
}

function revisionAcquis(ident, opts) {
  const o = opts || {};
  const days = Number.isFinite(o.days) && o.days > 0 ? Math.floor(o.days) : 7;
  const mode = o.mode === 'apply' ? 'apply' : 'propose';
  const plan = o.plan === true;
  const interval = days * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const knowledge = memory.allFamilies()
    .filter((r) => r.family === 'knowledge')
    .map((r) => r.entry);

  let overdue = 0;
  let reviewed = 0;
  for (const e of knowledge) {
    if (!e || e.STATUS !== 'validated') continue;
    const last = e.LAST_REVIEW ? new Date(e.LAST_REVIEW).getTime() : 0;
    const due = last === 0 || now - last >= interval;
    if (last === 0 || due) overdue++;
    if (mode === 'apply' && due) {
      memory.updateEntry('knowledge', e.ID, {
        LAST_REVIEW: util.nowIso(),
        REVISION_COUNT: (e.REVISION_COUNT || 0) + 1,
      });
      reviewed++;
    }
  }

  if (mode === 'apply' && reviewed > 0) {
    journal.journalEvent('REVIEW', ident, { REVIEWED: reviewed, DAYS: days, MODE: mode });
  }

  let planCreated = false;
  if (mode === 'apply' && plan && overdue > 0) {
    const hasPlan = require('./needs').listActiveNeeds().some((n) => n.TYPE === 'PLANIFICATION');
    if (!hasPlan) {
      require('./needs').createNeed(ident, {
        type: 'PLANIFICATION',
        description: `Réviser mes acquis : ${overdue} connaissance(s) validée(s) non relue(s) depuis ${days} jour(s).`,
      });
      planCreated = true;
    }
  }

  return { ok: true, mode, days, overdue, reviewed, planCreated };
}

function journalToMemory(ident) {
  const events = journal.allEvents();

  const deleted = new Set(
    events
      .filter((e) => e.EVENT === 'MEMORY_DELETE' && e.question)
      .map((e) => String(e.question))
  );

  const known = new Set(
    memory.allFamilies()
      .filter((r) => r.family === 'knowledge' && r.entry && r.entry.CONTENT)
      .map((r) => String(r.entry.CONTENT.question || ''))
      .filter(Boolean)
  );

  const sources = events
    .filter((e) => e.EVENT === 'LEARN_VALIDATED' || e.EVENT === 'QUESTION_ANSWERED')
    .map((e) => {
      if (e.EVENT === 'LEARN_VALIDATED' && e.CONTENT) {
        return { question: String(e.CONTENT), answer: 'confirmé par le tuteur (récupéré depuis le journal)' };
      }
      if (e.EVENT === 'QUESTION_ANSWERED' && e.QUESTION) {
        return { question: String(e.QUESTION), answer: `réponse du tuteur : ${e.ANSWER || ''}` };
      }
      return null;
    })
    .filter(Boolean);

  let restored = 0;
  let present = 0;
  let skipped = 0;
  for (const s of sources) {
    const q = s.question;
    if (deleted.has(q) || known.has(q)) { skipped++; continue; }
    memory.memorize('knowledge', { question: q, answer: s.answer }, ident, {
      source: 'JOURNAL_REPLAY',
      confidence: 0.6,
      status: 'validated',
    });
    known.add(q);
    restored++;
  }

  if (restored > 0) {
    journal.journalEvent('JOURNAL_TO_MEMORY', ident, { RESTORED: restored, PRESENT: present, SKIPPED: skipped });
  }
  return { ok: true, restored, present, skipped };
}

module.exports = { relireMemoire, revisionAcquis, journalToMemory };
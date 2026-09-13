'use strict';

const util = require('./util');
const memory = require('./memory');
const library = require('./library');
const needs = require('./needs');
const toolkit = require('./toolkit');
const contract = require('./contract');

/**
 * Orchestrateur cognitif (SOCLE v0.5.0 + perception v0.5.1).
 *
 * Deux étages :
 *   1. orchestrate()  (sync) — rappel mémoire, bibliothèque, diagnostic
 *      du manque + plan + outils candidats vérifiés capacité/permission.
 *   2. perceive()     (async) — exécute l'outil Web multi-sources via le
 *      Contrat Commun (IDENTIFIER→CAPACITÉ→PERMISSION→EXECUTER→JOURNALISER).
 *      Jamais d'IA externe en exécution automatique.
 *
 * Règles :
 *   - chercher D'ABORD en interne (mémoire, puis bibliothèques) ;
 *   - UNKNOWN → exécution réelle du Web (v0.5.1) uniquement quand web est
 *     utilisable (installé ET autorisé) ; les outils passent par le Contrat.
 *   - IA externe = outil facultatif, JAMAIS exécuté automatiquement ;
 *   - confiance issue de la concordance entre sources, provenance tracée,
 *     aucun automatisme, jamais de contournement de contract.js ;
 *   - aucune activité fictive : chaque entrée correspond à une opération
 *     réellement effectuée.
 */

const STATES = {
  JE_SAIS: 'JE_SAIS',
  JE_NE_SAIS_PAS: 'JE_NE_SAIS_PAS',
  JE_NE_COMPRENDS_PAS: 'JE_NE_COMPRENDS_PAS',
  JE_PEUX_CHERCHER: 'JE_PEUX_CHERCHER',
  JE_CHERCHE: 'JE_CHERCHE',
  J_AI_TROUVE: 'J_AI_TROUVE',
  JE_DOIS_VERIFIER: 'JE_DOIS_VERIFIER',
  J_AI_BESOIN_DE_PRECISION: 'J_AI_BESOIN_DE_PRECISION',
  JE_DOIS_DEMANDER_AU_TUTEUR: 'JE_DOIS_DEMANDER_AU_TUTEUR',
  JE_N_AI_PAS_OUTIL_PERMISSION: 'JE_N_AI_PAS_OUTIL_PERMISSION',
  PAS_DE_REPONSE_FIABLE: 'PAS_DE_REPONSE_FIABLE',
};

// Score L2 minimal pour considérer une réponse de bibliothèque comme fiable
// (sinon elle reste "consultée", et Bob annonce honnêtement qu'il ignore).
const MIN_LIBRARY_SCORE = 12;

const STRATEGY_ORDER = ['web', 'ia', 'email', 'gmail', 'notebook'];

// Demande d'apprentissage OUVERTE (ambiguë) : on demande une précision au
// tuteur plutôt que de deviner un point de départ.
const LEARN_RE = /(apprends?\s+(?:moi|sur)?|j'?aimerais apprendre|je veux apprendre|parle-moi\s+de|comment apprendre|cours\s+sur)/i;

function learnTopic(text) {
  const clean = String(text).replace(/[!?.,;:]/g, ' ').replace(/\s+/g, ' ').trim();
  const patterns = [
    /apprends?\s+(?:moi|sur)?\s+(.+)/i,
    /apprendre\s+(?:sur\s+)?(.+)/i,
    /j'?aimerais apprendre\s+(.+)/i,
    /je veux apprendre\s+(.+)/i,
    /parle-moi\s+de\s+(.+)/i,
    /comment apprendre\s+(.+)/i,
    /cours\s+sur\s+(.+)/i,
  ];
  for (const re of patterns) {
    const m = clean.match(re);
    if (m && m[1] && m[1].trim()) return m[1].trim();
  }
  return null;
}

const STOP_WORDS_FR = new Set([
  'les', 'des', 'que', 'qui', 'quoi', 'avec', 'dans', 'pour', 'cela', 'cette',
  'ces', 'aux', 'fait', 'faire', 'sont', 'être', 'comme', 'plus', 'tout',
  'tous', 'toute', 'peut', 'comment', 'pourquoi', 'quand', 'et', 'ou', 'en',
  'sur', 'par', 'de', 'la', 'le', 'je', 'tu', 'il', 'elle', 'on', 'un', 'une',
  'est', 'son', 'sa', 'ses', 'pas', 'ne', 'du', 'au', 'aux', 'où',
  'quel', 'quelle', 'quels', 'quelles', 'combien', 'ce',
]);

function tokensOf(text) {
  return String(text || '').toLowerCase().split(/\s+/)
    .map((w) => w.replace(/[^a-zâàçéèêëîïôöûüù0-9]/g, '').replace(/s$/, ''))
    .filter((w) => w.length >= 3 && !STOP_WORDS_FR.has(w));
}

/**
 * Relecture honnête de la mémoire knowledge : si la question du tuteur
 * ressemble à une question déjà mémorisée, retourne la réponse (jamais une
 * invention). Sinon null.
 */
function recall(text) {
  const asked = tokensOf(text);
  if (asked.length < 2) return null;

  const entries = memory.allFamilies()
    .filter((r) => r.family === 'knowledge')
    .map((r) => r.entry);

  let best = null;
  let bestScore = 0;
  for (const entry of entries) {
    const cq = entry.CONTENT && entry.CONTENT.question;
    if (!cq) continue;
    const qWords = tokensOf(cq);
    if (!qWords.length) continue;
    const hits = qWords.filter((w) => asked.includes(w)).length;
    const score = hits / qWords.length;
    if (score >= 0.6 && hits >= 2 && score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  if (!best) return null;
  return {
    answer: best.CONTENT.answer,
    id: best.ID,
    score: bestScore,
    confidence: typeof best.CONFIDENCE === 'number' ? best.CONFIDENCE : bestScore,
  };
}

function journal(identity, event, extra) {
  try {
    require('./journal').journalEvent(event, identity, extra || {});
  } catch {}
}

/**
 * Catalogue réel des outils découverts : pour chacun, interactions issues du
 * manifeste, statut d'installation, autorisation explicite et calcul honnête
 * « utilisable » = installé ET autorisé (CAPACITÉ ≠ PERMISSION, jamais
 * contourné). Aucun outil n'est exécuté ici.
 */
function catalogTools() {
  return toolkit.discoverAll().map((t) => ({
    name: t.name,
    title: t.title,
    capability: t.capability,
    interactions: (t.manifest && Array.isArray(t.manifest.interactions)) ? t.manifest.interactions : [],
    status: t.status,
    authorized: t.authorized === true,
    usable: t.status === 'installed' && t.authorized === true,
  }));
}

function bestStrategyTool(tools) {
  for (const name of STRATEGY_ORDER) {
    const t = tools.find((x) => x.name === name);
    if (t && t.usable) return t;
  }
  return null;
}

/**
 * Orchestre un message (SOCLE) : rappel mémoire, puis bibliothèque, puis
 * diagnostic du manque + plan + outils candidats (aucune exécution).
 * Retourne un objet travail structuré (voir en-tête du module).
 */
function orchestrate(rawText, identity, opts) {
  const o = opts || {};
  const text = String(rawText || '').trim();
  const norm = text.replace(/[\s-]+/g, ' ').trim();
  const started = util.nowIso();
  const workId = o.id || util.uuid();
  const activities = [];
  const sources = [];
  const tools = catalogTools();

  // 1) Demande d'apprentissage OUVERTE -> besoin QUESTION (jamais un devin).
  const topic = learnTopic(norm);
  const isLearn = LEARN_RE.test(norm);
  if (isLearn && topic && !norm.toLowerCase().includes('apprends que')) {
    activities.push({ step: 'INTERPRETER', label: '🤔 Je réfléchis…', detail: 'demande d\'apprentissage ouverte' });
    const need = needs.createNeed(identity, {
      type: 'QUESTION',
      description: `Apprendre : ${topic}`,
      question_for_tutor: `Sur « ${topic} », veux-tu que je commence par les bases, les concepts clés, ou la pratique ?`,
    });
    journal(identity, 'COGNITION_AMBIGUOUS', {
      WORK_ID: workId, QUESTION: text, TOPIC: topic, NEED_ID: need.ID,
    });
    return {
      id: workId,
      question: text,
      timestamp: started,
      intent: 'LEARN_REQUEST',
      concepts: [],
      known: [],
      missing: ['point de départ à préciser (bases, concepts clés ou pratique)'],
      ambiguities: ['apprentissage à cadrer'],
      candidate_tools: tools,
      plan: ['demander une précision au tuteur'],
      status: STATES.J_AI_BESOIN_DE_PRECISION,
      need: { ID: need.ID, QUESTION_FOR_TUTOR: need.QUESTION_FOR_TUTOR },
      activities,
      sources,
      reply: `Je ne connais pas encore « ${topic} » et je préfère partir d'un bon début plutôt que de deviner :\n` +
        `« ${need.QUESTION_FOR_TUTOR} »\n` +
        `(j'ai tracé cette question dans mes demandes — ta réponse me servira à apprendre vraiment.)`,
    };
  }

  // 2) RAPPEL MÉMOIRE (ce que Bob possède, d'abord).
  activities.push({ step: 'RAPPEL_MEMOIRE', label: '🔎 Je cherche dans ma mémoire…' });
  const recalled = recall(text);
  if (recalled) {
    sources.push({
      source: 'MEMORY',
      id: recalled.id,
      confidence: recalled.confidence,
      provenance: 'ma mémoire (famille knowledge)',
    });
    journal(identity, 'COGNITION_MEMORY_HIT', {
      WORK_ID: workId, QUESTION: text, ENTRY_ID: recalled.id, SCORE: recalled.score,
    });
    return {
      id: workId,
      question: text,
      timestamp: started,
      intent: 'KNOWLEDGE_RECALL',
      concepts: [],
      known: [recalled.answer],
      missing: [],
      ambiguities: [],
      candidate_tools: [],
      plan: [],
      status: STATES.JE_SAIS,
      confidence: recalled.confidence,
      activities,
      sources,
      reply: `${recalled.answer}\n(Je l'ai retrouvé dans ma mémoire.)`,
    };
  }

  // 3) RAPPEL BIBLIOTHÈQUE (savoir validé de l'environnement d'apprentissage).
  activities.push({ step: 'RAPPEL_BIBLIOTHEQUE', label: '📚 Je consulte ma bibliothèque…' });
  let strongHits = [];
  try {
    const libRes = library.searchL2(text, { limit: 5 });
    strongHits = libRes.results.filter((r) => (r.fields || []).some((f) => f.field === 'exact') || r.score >= MIN_LIBRARY_SCORE);
  } catch {}
  if (strongHits.length) {
    const top = strongHits[0];
    sources.push({
      source: 'LIBRARY',
      id: top.id,
      libraryId: top.libraryId,
      libraryName: top.libraryName,
      title: top.title,
      score: top.score,
    });
    journal(identity, 'COGNITION_LIBRARY_HIT', {
      WORK_ID: workId, QUESTION: text, LIBRARY_ID: top.libraryId, KNOWLEDGE_ID: top.id, SCORE: top.score,
    });
    const answer = `D'après ma bibliothèque « ${top.libraryName} » (${top.title}) : ${top.snippet}`;
    return {
      id: workId,
      question: text,
      timestamp: started,
      intent: 'LIBRARY_RECALL',
      concepts: [],
      known: [answer],
      missing: [],
      ambiguities: [],
      candidate_tools: [],
      plan: [],
      status: STATES.J_AI_TROUVE,
      confidence: top.score / Math.max(MIN_LIBRARY_SCORE, top.score),
      activities,
      sources,
      reply: `${answer}\n(provenance : bibliothèque consultée à l'instant.)`,
    };
  }

  // 4) MANQUE identifié : diagnostic + plan + stratégie d'outil (socle : on
  //    prépare, on n'exécute rien).
  const best = bestStrategyTool(tools);
  const knownStr = `rien de probant dans ma mémoire ni dans mes bibliothèques pour « ${text} »`;
  const plan = [
    'rechercher dans ma mémoire (réellement fait)',
    'consulter mes bibliothèques (réellement fait)',
  ];
  let explanation;
  if (best) {
    plan.push(`préparer une recherche avec mon outil « ${best.title} » (${best.interactions.join(', ') || 'interactions'}) — capacité ${best.capability}, autorisé`);
    explanation = best.name === 'web'
      ? 'Je pourrais chercher sur le Web, lire et comparer plusieurs sources (mon outil Web est autorisé). À cette étape socle je prépare la recherche : je ne l\'exécute pas encore.'
      : `Je peux mobiliser mon outil « ${best.title} » pour aider à chercher.`;
  } else {
    explanation = 'Je n\'ai actuellement aucun outil autorisé qui me permette de rechercher cette réponse.';
  }

  const status = best ? STATES.JE_PEUX_CHERCHER : STATES.JE_N_AI_PAS_OUTIL_PERMISSION;
  const missing = ['pas encore dans ma mémoire ni dans mes bibliothèques'];
  journal(identity, 'COGNITION_UNKNOWN', {
    WORK_ID: workId,
    QUESTION: text,
    STATUS: status,
    USABLE_TOOLS: tools.filter((t) => t.usable).map((t) => t.name),
    PLAN: plan,
  });

  return {
    id: workId,
    question: text,
    timestamp: started,
    intent: 'UNKNOWN',
    concepts: [],
    known: [],
    missing,
    ambiguities: [],
    candidate_tools: tools,
    plan,
    status,
    strategy: {
      canSearch: !!best,
      bestTool: best ? { name: best.name, title: best.title } : null,
      explanation,
    },
    activities,
    sources,
    reply: null,
  };
}

/**
 * Perception (v0.5.1) : exécution RÉELLE de l'outil Web multi-sources via le
 * Contrat Commun (jamais d'IA externe automatique). Ne s'applique qu'à un
 * résultat orchestrate() au statut JE_PEUX_CHERCHER ; sinon renvoie le résultat
 * inchangé (fonction sans effet).
 *
 * options :
 *   catalog        — liste d'outils (défaut : catalogTools()) ; permet de
 *                    tester la décision sans polluer le dépôt réel.
 *   tools          — { web: { search, read } } (défaut : outils web réels ;
 *                    injectable pour isoler les tests du réseau).
 *   maxSources     — nombre de sources à lire (défaut 3).
 *   readTimeout    — délai de lecture (ms, défaut 10000).
 */
async function perceive(work, identity, opts) {
  if (!work || work.status !== STATES.JE_PEUX_CHERCHER) return work;
  const o = opts || {};
  const catalog = o.catalog || catalogTools();
  const web = catalog.find((t) => t.name === 'web');
  if (!web || web.usable !== true) return work;

  const webMod = (o.tools && o.tools.web) || (() => {
    try { return require('../tools/web/web'); } catch { return null; }
  })();
  if (!webMod || typeof webMod.search !== 'function' || typeof webMod.read !== 'function') return work;

  const query = perceptionQuery(work.question);
  const workId = work.id;
  const activities = Array.isArray(work.activities) ? work.activities.slice() : [];
  const sources = Array.isArray(work.sources) ? work.sources.slice() : [];

  journal(identity, 'COGNITION_PERCEPTION_START', {
    WORK_ID: workId, QUESTION: work.question, QUERY: query, TOOL: 'web',
  });
  activities.push({ step: 'PERCEPTION_WEB', label: '🌐 Je lis le Web (multi-sources)…', detail: `recherche : ${query}` });

  const manifest = toolkit.findManifest('web').manifest;
  const search = await contract.executeTool(identity, manifest, 'web.search', {
    execute: () => webMod.search(query, { limit: (o.maxSources || PERCEPTION.maxSources) * 3 }),
    source: 'COGNITION', confidence: 0.3, action: 'search',
  });

  if (!search.ok || !search.result || search.result.ok !== true || !Array.isArray(search.result.results) || !search.result.results.length) {
    const reason = (!search.ok && search.reason) || (search.result && search.result.error) || 'aucun résultat';
    activities.push({ step: 'PERCEPTION_ECHEC', label: '⚠️ Le Web n\'apporte rien pour le moment.', detail: reason });
    journal(identity, 'COGNITION_PERCEPTION_NONE', { WORK_ID: workId, REASON: 'search_empty', TOOL: 'web' });
    return {
      ...work, status: STATES.PAS_DE_REPONSE_FIABLE, confidence: PERCEPTION_CONFIDENCE.faible,
      activities, sources,
      perception: { executed: true, query, tool: 'web', found: false, steps: ['search'] },
      reply: 'J\'ai consulté le Web mais je n\'ai rien trouvé de fiable pour le moment. ' +
        'Je te le dis honnêtement : je ne sais pas encore. Tu peux m\'apprendre la réponse (« apprends que … »).',
    };
  }

  const results = search.result.results.slice(0, o.maxSources || PERCEPTION.maxSources);
  const reads = [];
  for (const r of results) {
    const read = await contract.executeTool(identity, manifest, 'web.read', {
      execute: () => webMod.read(r.url, o.readTimeout || PERCEPTION.readTimeoutMs),
      source: 'COGNITION', confidence: 0.5, action: 'read',
    });
    if (read.ok && read.result && read.result.ok === true && read.result.snippet) {
      reads.push({
        title: r.title, url: r.url,
        snippet: String(read.result.snippet), fetched_at: read.result.fetched_at,
      });
    }
  }

  if (!reads.length) {
    activities.push({ step: 'PERCEPTION_ECHEC', label: '⚠️ Le Web n\'apporte rien pour le moment.', detail: 'lectures infructueuses' });
    journal(identity, 'COGNITION_PERCEPTION_NONE', { WORK_ID: workId, REASON: 'read_failed', TOOL: 'web' });
    return {
      ...work, status: STATES.PAS_DE_REPONSE_FIABLE, confidence: PERCEPTION_CONFIDENCE.faible,
      activities, sources,
      perception: { executed: true, query, tool: 'web', found: false, steps: ['search', 'read'] },
      reply: 'J\'ai trouvé des résultats Web mais je n\'ai rien pu lire de fiable. ' +
        'Honêtement : je ne sais pas encore la réponse.',
    };
  }

  activities.push({ step: 'COMPARAISON', label: '🔀 Je compare les sources entre elles…', detail: `${reads.length} source(s) lue(s)` });
  const corr = concordance(reads);
  for (const r of reads) {
    sources.push({ source: 'WEB', url: r.url, title: r.title, snippet: r.snippet, fetched_at: r.fetched_at, agreeing: corr.agreeing });
  }
  journal(identity, 'COGNITION_PERCEPTION_FOUND', {
    WORK_ID: workId, SOURCES: reads.length, AGREEING: corr.agreeing, CONFIDENCE: corr.level, TOOL: 'web',
  });

  const concordancePhrase = corr.level === 'haute'
    ? `${corr.agreeing} de ces sources concordent entre elles`
    : corr.level === 'moyenne'
      ? 'une source seule a répondu clairement'
      : 'les sources ne concordent pas clairement';
  const reply =
    `D'après le Web (${reads.length} source(s) consultée(s)) : ${reads[0].snippet.slice(0, 260)}…\n` +
    `Concordance : ${concordancePhrase} (confiance ${corr.level}). Provenance :\n` +
    reads.slice(0, 3).map((r) => `  • ${r.title ? r.title + ' — ' : ''}${r.url}`).join('\n') +
    `\n(Rappel : une information trouvée sur le Web n'est jamais une vérité automatique.)`;

  return {
    ...work,
    status: STATES.J_AI_TROUVE,
    confidence: corr.confidence,
    activities,
    sources,
    known: reads.map((r) => r.snippet.slice(0, 200)),
    plan: Array.isArray(work.plan) ? [...work.plan, 'lire et comparer le Web multi-sources (réellement fait)'] : work.plan,
    perception: {
      executed: true, query, tool: 'web', found: true,
      sources: reads.length, agreeing: corr.agreeing, confidenceLevel: corr.level,
    },
    reply,
  };
}

/**
 * Question transformée en requête de recherche (ponctuation retirée, garde un
 * maximum de mots pour rester naturel).
 */
function perceptionQuery(text) {
  return String(text || '').trim()
    .replace(/[!?.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Concordance entre extraits lus : deux sources « s'accordent » quand elles
 * partagent au moins 2 mots de contenu significatifs. La confiance est
 * dérivée du nombre de sources en accord (aucune invention).
 */
function concordance(reads) {
  const entries = reads.map((r, idx) => ({ idx, tokens: new Set(tokensOf(r.snippet)) }));
  const agreeing = new Set();
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      let shared = 0;
      for (const w of entries[i].tokens) if (entries[j].tokens.has(w)) shared++;
      if (shared >= 2) { agreeing.add(entries[i].idx); agreeing.add(entries[j].idx); }
    }
  }
  const level = agreeing.size >= 2 ? 'haute' : agreeing.size === 1 ? 'moyenne' : 'faible';
  return { agreeing: agreeing.size, total: reads.length, level, confidence: PERCEPTION_CONFIDENCE[level] };
}

const PERCEPTION = { maxSources: 3, readTimeoutMs: 10000 };
const PERCEPTION_CONFIDENCE = { haute: 0.8, moyenne: 0.5, faible: 0.3 };

module.exports = {
  STATES,
  MIN_LIBRARY_SCORE,
  STRATEGY_ORDER,
  recall,
  tokensOf,
  catalogTools,
  orchestrate,
  perceive,
  concordance,
  perceptionQuery,
};
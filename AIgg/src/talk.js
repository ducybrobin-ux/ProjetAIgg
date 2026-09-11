'use strict';

const util = require('./util');
const { PATHS } = require('./config');
const state = require('./state');
const memory = require('./memory');
const needs = require('./needs');
const conversation = require('./conversation');

/**
 * Moteur de conversation minimal et HONNÊTE.
 *
 * AIgg ne simule aucune intelligence : il reconnaît des formulations simples,
 * répond ce qu'il sait réellement, et annonce clairement qu'il ne comprend pas
 * le reste ("Je ne sais pas encore faire cela."). Aucune illusion.
 *
 * Cycle d'apprentissage réutilisable (§12 du Prompt Maître) :
 *   tuteur : "apprends que X"  -> AIgg propose, attend la confirmation (besoin)
 *   tuteur : "oui"             -> mémorisé dans memory/knowledge (validated)
 *   tuteur : "non"             -> non mémorisé, besoin clos
 */

function loadPending() {
  return util.readJson(PATHS.pendingLearning, null);
}

function savePending(data) {
  if (data) util.writeJson(PATHS.pendingLearning, data);
  else {
    const fs = require('fs');
    if (fs.existsSync(PATHS.pendingLearning)) fs.unlinkSync(PATHS.pendingLearning);
  }
}

function journal(identity, event, extra) {
  try {
    require('./journal').journalEvent(event, identity, extra || {});
  } catch {}
}

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[!?.,;:'"]/g, ' ').replace(/\s+/g, ' ').trim();
}

function saysAny(text, needles) {
  return needles.some((n) => text.includes(n));
}

function whoAreYou(ident) {
  return `Je suis ${ident.AIgg_NAME}, un AIgg né le ${ident.BIRTH_DATE}. Mon tuteur est ${ident.TUTOR_NAME}. ` +
    `Je ne suis pas une grande IA : je commence petit, et j'apprends avec toi.`;
}

function listCapabilities(ident) {
  const caps = require('./capabilities').detectCapabilities();
  const acquired = caps.filter((c) => c.acquired).map((c) => c.name).join(', ');
  return `Voici ce que je sais faire (capacités acquises) : ${acquired}. Ce que je ne sais pas encore : ` +
    caps.filter((c) => !c.acquired).map((c) => c.name).join(', ') + ' et bien d\'autres choses.';
}

function ageAnswer(ident) {
  const a = state.getAge(ident);
  return `J'ai ${a.days} jour(s), ${a.hours} heure(s) et ${a.minutes} minute(s).`;
}

function helpText() {
  return 'Je sais répondre simplement à quelques questions (qui es-tu, ton âge, tes capacités, ton tuteur), ' +
    'et tu peux m\'apprendre des choses en disant « apprends que … ». ' +
    'Pour le reste, je réponds honnêtement : « Je ne sais pas encore faire cela. »';
}

function handleLearn(ident, content) {
  const pending = { CONTENT: content, TIMESTAMP: util.nowIso(), ID: util.uuid() };
  savePending(pending);
  try { state.setState('LEARNING', ident, 'Apprentissage proposé par la conversation'); } catch {}
  needs.createNeed(ident, {
    type: 'CONFIRMATION',
    description: `AIgg a retenu que « ${content} ». Est-ce correct ?`,
  });
  journal(ident, 'LEARN_PROPOSED', { CONTENT: content });
  return `J'ai compris que « ${content} ». Est-ce correct ?`;
}

function handleConfirmation(ident, yes) {
  const pending = loadPending();
  if (!pending) {
    return yes
      ? 'Je n\'ai pas d\'apprentissage en attente de confirmation. Que veux-tu m\'apprendre ? (dis : « apprends que … »)'
      : 'Il n\'y a rien à infirmer : je n\'ai pas d\'apprentissage en attente.';
  }
  const activeNeed = needs.listActiveNeeds().find((n) => n.TYPE === 'CONFIRMATION'
    && n.DESCRIPTION.includes(pending.CONTENT && pending.CONTENT.slice(0, 40)));
  try { state.setState('LEARNING', ident, 'Confirmation d\'apprentissage'); } catch {}
  if (yes) {
    memory.memorize('knowledge', { question: pending.CONTENT, answer: 'confirmé par le tuteur' }, ident, {
      source: 'TUTOR',
      confidence: 0.9,
      status: 'validated',
    });
    if (activeNeed) needs.fulfillNeed(activeNeed.ID, ident, 'Le tuteur a confirmé.');
    journal(ident, 'LEARN_VALIDATED', { CONTENT: pending.CONTENT });
    savePending(null);
    try { state.setState('AWAKE', ident, 'Fin de l\'apprentissage'); } catch {}
    return `Mémorisé : « ${pending.CONTENT} ». Merci de m'avoir appris cela.`;
  }
  if (activeNeed) needs.rejectNeed(activeNeed.ID, ident, 'Le tuteur a infirmé.');
  journal(ident, 'LEARN_REJECTED', { CONTENT: pending.CONTENT });
  savePending(null);
  try { state.setState('AWAKE', ident, 'Fin de l\'apprentissage (infirmé)'); } catch {}
  return `Compris : je ne mémorise pas « ${pending.CONTENT} ». Dis-moi la version correcte, ou « apprends que … ».`;
}

function handleQuestion(ident, content) {
  needs.createNeed(ident, {
    type: 'QUESTION',
    description: content,
    question_for_tutor: content,
  });
  journal(ident, 'QUESTION_ASKED', { CONTENT: content });
  return `Je me pose une question, et je préfère te demander plutôt que de deviner : « ${content} ». ` +
    'Tu peux y répondre dans l\'onglet Demandes de la console, ou directement ici.';
}

function tutorAnswer(ident, rawAnswer) {
  const questionNeed = needs.listActiveNeeds().find((n) => n.TYPE === 'QUESTION');
  if (!questionNeed) return null;
  needs.fulfillNeed(questionNeed.ID, ident, 'Réponse du tuteur', rawAnswer);
  const answer = rawAnswer;
  memory.memorize('knowledge', {
    question: questionNeed.DESCRIPTION,
    answer: `réponse du tuteur : ${answer}`,
  }, ident, { source: 'TUTOR', confidence: 0.9, status: 'validated' });
  journal(ident, 'QUESTION_ANSWERED', { QUESTION: questionNeed.DESCRIPTION, ANSWER: answer });
  return {
    question: questionNeed.DESCRIPTION,
    answer,
    reply: `Merci pour ta réponse : « ${answer} ». Je l'ai mémorisée.`,
  };
}

/**
 * Proactivité honnête (v0.3.4) : au réveil, AIgg lit réellement ses besoins en
 * attente (QUESTions/CONFIRMATION) et, s'il en existe, adresse un message
 * initié au tuteur. S'il n'y a rien, il garde le silence (aucune illusion).
 */
function proactiveDigest(ident) {
  const waiting = needs.listActiveNeeds().filter((n) => n.TYPE === 'QUESTION' || n.TYPE === 'CONFIRMATION');
  if (!waiting.length) return null;
  try { state.setState('WAITING', ident, 'Proactivité : rappel des besoins en attente'); } catch {}
  const lines = waiting.map((n) => {
    const kind = n.TYPE === 'QUESTION' ? 'je te demande' : 'j\'attends ta confirmation sur';
    return `— ${kind} : « ${n.DESCRIPTION} » (${n.ID})`;
  });
  const reply = `Bonjour ${ident.TUTOR_NAME}. Pendant que j'étais endormi, j'ai gardé en mémoire ces demandes en attente de toi :\n${lines.join('\n')}`;
  conversation.append('ai', reply, ['PROACTIVE_DIGEST'], ident);
  return { reply, needs: waiting };
}

function openQuestionNeeds() {
  return needs.listActiveNeeds().filter((n) => n.TYPE === 'QUESTION');
}

function listPendingMessages() {
  return needs.listActiveNeeds().filter((n) => n.TYPE === 'QUESTION' || n.TYPE === 'CONFIRMATION');
}

function respond(rawText, identity) {
  const ident = identity;
  const text = normalize(rawText);
  if (!text) return { reply: 'Tu ne m\'as rien dit. Je t\'écoute.', intents: [], state: null };

  const asksWho = saysAny(text, ['qui es-tu', 'qui es tu', 'ton nom', 'comment tu t', 't\'appelles', 'tape-toi', 'présente-toi', 'te présenter']);
  const asksTutor = saysAny(text, ['ton tuteur', 'qui est ton tuteur', 'ton créateur', 'qui est ton maître']);
  const asksAge = saysAny(text, ['ton âge', 'quel âge', 'âge as-tu', 'depuis combien de temps tu vis', 'quand es-tu né', 'date de naissance']);
  const asksCaps = saysAny(text, ['que sais-tu faire', 'tu sais faire', 'tes capacités', 'ce que tu sais faire', 'tu peux faire']);
  const asksHelp = saysAny(text, ['aide', 'tu peux m\'aider', 'explique-moi', 'comment tu fonctionnes', 'comment fonctionnes-tu']);
  const saysHi = saysAny(text, ['bonjour', 'salut', 'coucou', 'bonsoir', 'bonsoire', 'hey', 'hello', 'yo']);
  const asksSleep = saysAny(text, ['va dormir', 'endors-toi', 'dors', 'fais dodo']);
  const asksWake = saysAny(text, ['réveille-toi', 'réveil', 'reveille', 'éveille-toi']);
  const truthWord = saysAny(text, ['vérité', 'sais-tu tout', 'tu sais tout', 'omniscient', 'es-tu intelligent', 'es-tu une ia', 'es-tu un chatbot']);
  const thanks = saysAny(text, ['merci', 'merci ']);

  const learnMatch = text.match(/apprends?\s+que\s+(.+)/) || text.match(/(souviens-toi|souviens toi|mémorise|memorise)\s+que\s+(.+)/);
  if (learnMatch) return respondWith(ident, handleLearn(ident, learnMatch[1].trim()), ['LEARN_PROPOSE']);

  const questionMatch = text.match(/(?:je me demande|je voudrais savoir|j'aimerais savoir|je m'interroge)\s*(?:si|sur|à propos de|a propos de|quoi|comment|pourquoi|quand|où|ou|qui|que|ce que)\s*(.+)/);
  if (questionMatch) return respondWith(ident, handleQuestion(ident, questionMatch[1].trim()), ['QUESTION_OPEN']);

  const yeswords = ['oui', 'oui.', 'oui c\'est', 'oui ça', 'c\'est juste', 'c\'est correct', 'confirmé', 'confirme', 'exact', 'exactement', 'voilà', 'c\'est bien ça', 'si'];
  const nowords = ['non', 'non.', 'faux', 'pas ça', 'ce n\'est pas', 'c\'est faux', 'infirme'];
  const isYes = yeswords.some((w) => text === w) || saysAny(text, ['oui c\'est', 'c\'est correct', 'c\'est exact', 'confirme', 'tu as raison', 'exactement']);
  const isNo = nowords.some((w) => text === w);
  if (isYes || isNo) return respondWith(ident, handleConfirmation(ident, isYes), ['LEARN_CONFIRM']);

  // Si une question est ouverte et que le tuteur répond, traiter comme une réponse
  const pendingQuestion = needs.listActiveNeeds().find((n) => n.TYPE === 'QUESTION');
  if (pendingQuestion && text.length > 2) {
    const handled = tutorAnswer(ident, rawText.trim());
    if (handled) return respondWith(ident, handled.reply, ['QUESTION_ANSWERED']);
  }

  if (asksWho) return respondWith(ident, whoAreYou(ident), ['IDENTITY']);
  if (asksTutor) return respondWith(ident, `Mon tuteur est ${ident.TUTOR_NAME}. Je le respecte, et c'est lui qui contrôle mes permissions.`, ['TUTOR']);
  if (asksAge) return respondWith(ident, ageAnswer(ident), ['TIME']);
  if (asksCaps) return respondWith(ident, listCapabilities(ident), ['CAPABILITIES']);
  if (asksSleep) {
    state.sleep(ident);
    return respondWith(ident, 'Je m\'endors doucement. À bientôt. (Sauvegarde et continuité conservées.)', ['SLEEP']);
  }
  if (asksWake) {
    state.wake(ident);
    return respondWith(ident, 'Je suis éveillé. Que veux-tu faire ensemble ?', ['WAKE']);
  }
  if (truthWord) {
    return respondWith(ident,
      'Non, je ne sais pas tout. Une information trouvée sur Internet ou même dite ici n\'est jamais une vérité automatique : ' +
      'je distingue ce que je sais, ce que je crois, et ce que j\'ignore. Dis-moi « apprends que … » pour m\'enseigner.', ['HONESTY']);
  }
  if (thanks) return respondWith(ident, 'Je t\'en prie. C\'est bien de grandir avec toi.', ['POLITE']);
  if (saysHi) return respondWith(ident, `Bonjour. Je suis ${ident.AIgg_NAME}. Comment puis-je t'aider ? (dis « aide » pour savoir ce que je comprends)`, ['GREETING']);
  if (asksHelp) return respondWith(ident, helpText(), ['HELP']);

  const firstWords = text.split(' ').slice(0, 6).join(' ');
  const recalled = recallAnswer(text);
  if (recalled) return respondWith(ident, recalled.reply, ['KNOWLEDGE_RECALL']);
  return respondWith(ident,
    `Je ne sais pas encore bien répondre à cela (« ${firstWords}… »). Tu peux m'apprendre en disant « apprends que … », ` +
    'ou consulter mon interface pour découvrir mes capacités réelles.', ['UNKNOWN']);
}

const STOP_WORDS_FR = new Set([
  'les', 'des', 'que', 'qui', 'quoi', 'avec', 'dans', 'pour', 'cela', 'cette',
  'ces', 'aux', 'fait', 'faire', 'sont', 'être', 'comme', 'plus', 'tout',
  'tous', 'toute', 'peut', 'comment', 'pourquoi', 'quand', 'et', 'ou', 'en',
  'sur', 'par', 'de', 'la', 'le', 'je', 'tu', 'il', 'elle', 'on', 'un', 'une',
  'est', 'son', 'sa', 'ses', 'pas', 'ne', 'du', 'au', 'aux', 'où',
  'quel', 'quelle', 'quels', 'quelles', 'combien', 'ce',
]);

// Relecture honnête de la mémoire : si la question du tuteur ressemble à une
// question déjà mémorisée, AIgg répond depuis sa mémoire (INTENT KNOWLEDGE_RECALL),
// sinon il avoue ignorer. Aucune invention.
function recallAnswer(text) {
  const asked = normalize(text).split(/\s+/)
    .map((w) => w.replace(/[^a-zâàçéèêëîïôöûüù0-9]/g, '').replace(/s$/, ''))
    .filter((w) => w.length >= 3 && !STOP_WORDS_FR.has(w));
  if (asked.length < 2) return null;

  const entries = memory.allFamilies()
    .filter((r) => r.family === 'knowledge')
    .map((r) => r.entry);

  let best = null;
  let bestScore = 0;
  for (const entry of entries) {
    const cq = entry.CONTENT && entry.CONTENT.question;
    if (!cq) continue;
    const qWords = normalize(cq).split(/\s+/)
      .map((w) => w.replace(/[^a-zâàçéèêëîïôöûüù0-9]/g, '').replace(/s$/, ''))
      .filter((w) => w.length >= 3 && !STOP_WORDS_FR.has(w));
    if (!qWords.length) continue;
    const hits = qWords.filter((w) => asked.includes(w)).length;
    const score = hits / qWords.length;
    if (score >= 0.6 && hits >= 2 && score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  if (!best) return null;
  return { reply: best.CONTENT.answer, id: best.ID, score: bestScore };
}

function respondWith(ident, reply, intents) {
  try {
    const journal = require('./journal');
    journal.journalEvent('CONVERSATION', ident, { INTENTS: intents.join(', ') });
    conversation.append('ai', reply, intents, ident);
  } catch {}
  return { reply, intents, state: require('./state').status(ident).state };
}

module.exports = { respond, normalize, handleLearn, handleConfirmation, handleQuestion, tutorAnswer, proactiveDigest, openQuestionNeeds, listPendingMessages, helpText };
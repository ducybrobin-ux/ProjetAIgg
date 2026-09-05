'use strict';

const util = require('./util');
const capabilities = require('./capabilities');
const permissions = require('./permissions');
const journal = require('./journal');

/**
 * Pipeline du Contrat Commun :
 * IDENTIFIER -> VERIFIER CAPACITE -> VERIFIER PERMISSION -> EXECUTER ->
 * JOURNALISER -> RETOURNER RESULTAT -> MEMORISER SI NECESSAIRE.
 *
 * Retourne { ok, result:, blocked:, reason:, contract: } ou lève si strict.
 */

async function executeTool(identity, toolManifest, actionName, options) {
  const opts = options || {};
  const action = opts.execute;

  // IDENTIFIER
  if (!identity || !identity.AIgg_ID) {
    return { ok: false, blocked: 'IDENTITY', reason: 'Identité absente.', result: null, contract: null };
  }

  // VERIFIER CAPACITE
  const hasCap = capabilities.hasCapacity(toolManifest.capability);
  if (!hasCap && toolManifest.capability !== 'AUCUNE') {
    return {
      ok: false,
      blocked: 'CAPACITY',
      reason: `Capacité '${toolManifest.capability}' non acquise. L'outil doit être installé d'abord.`,
      result: null,
      contract: null,
    };
  }

  // VERIFIER PERMISSION
  const perm = permissions.toolStatus(toolManifest.name);
  if (!perm || !perm.authorized) {
    return {
      ok: false,
      blocked: 'PERMISSION',
      reason: `Permission refusée pour l'outil '${toolManifest.name}'.`,
      result: null,
      contract: null,
    };
  }

  // CONTRAT
  const contract = {
    ...permissions.contractContext(identity),
    TOOL_NAME: toolManifest.name,
    TOOL_VERSION: toolManifest.version,
    EVENT_ID: util.uuid(),
    TIMESTAMP: util.nowIso(),
    SOURCE: opts.source || 'AIGG',
    CONFIDENCE: opts.confidence !== undefined ? opts.confidence : 0.5,
  };

  // EXECUTER
  let result;
  try {
    result = await action(contract);
  } catch (err) {
    return {
      ok: false,
      blocked: 'EXECUTION',
      reason: err.message,
      result: null,
      contract,
    };
  }

  // JOURNALISER
  journal.journalEvent(`TOOL_${toolManifest.name.toUpperCase()}_EXEC`, identity, {
    EVENT_ID: contract.EVENT_ID,
    TOOL_NAME: toolManifest.name,
    TOOL_VERSION: toolManifest.version,
    ACTION: opts.action || actionName || 'exec',
    OK: !!result.ok,
  });

  // MEMORISER SI NECESSAIRE
  if (opts.memorize && result && result.ok) {
    memory_store(opts.memorize.family, opts.memorize.content(result), identity, opts.memorize);
  }

  return { ok: true, blocked: null, reason: null, result, contract };
}

// Import différé pour éviter la dépendance circulaire avec memory -> config
function memory_store(family, content, identity, baseOpts) {
  const memory = require('./memory');
  return memory.memorize(family, content, identity, {
    source: (baseOpts && baseOpts.source) || 'TOOL',
    confidence: (baseOpts && baseOpts.confidence) || 0.5,
    status: (baseOpts && baseOpts.status) || 'validated',
  });
}

module.exports = { executeTool };
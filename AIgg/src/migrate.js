'use strict';

const fs = require('fs');
const path = require('path');
const util = require('./util');
const { PATHS } = require('./config');

/**
 * Migration (copie portable) d'un incubateur vers un autre emplacement.
 *
 * Règle de continuité (§39 du Prompt Maître) : AIgg_ID reste identique.
 * La migration copie le code, l'interface, les outils, et les données privées
 * (core/, memory/, senses/, journal/, notebook/, inbox/, outbox/).
 * Les sauvegardes (backups/) sont exclues : elles restent dans l'incubateur
 * d'origine.
 */

function copyDir(src, dest, exclude) {
  let count = 0;
  if (!fs.existsSync(src)) return count;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude && exclude.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      count += copyDir(s, d, exclude);
    } else {
      fs.copyFileSync(s, d);
      count += 1;
    }
  }
  return count;
}

function migrateTo(destPath) {
  const src = PATHS.root;
  const dest = path.resolve(destPath || '');

  if (!dest || dest === src) {
    throw new Error('Destination manquante ou identique à l\'incubateur.');
  }
  if (dest.toLowerCase().startsWith(src.toLowerCase())) {
    throw new Error('La destination est à l\'intérieur de l\'incubateur source.');
  }
  if (!fs.existsSync(path.join(src, 'core', 'identity.json'))) {
    throw new Error('Pas d\'identité source. Crée d\'abord l\'AIgg (naissance).');
  }

  const identity = require('./identity').loadIdentity();
  const copied = copyDir(src, dest, ['backups', 'node_modules']);

  // Vérification de continuité : l'identité migrée doit être EXACTEMENT la même.
  const destIdentity = util.readJson(path.join(dest, 'core', 'identity.json'), null);
  const destMemoryCount = countFiles(path.join(dest, 'memory'));
  const sameId = !!destIdentity && destIdentity.AIgg_ID === identity.AIgg_ID;

  const report = {
    MIGRATION_ID: util.uuid(),
    TIMESTAMP: util.nowIso(),
    FROM: src,
    TO: dest,
    AIgg_ID: identity.AIgg_ID,
    AIgg_NAME: identity.AIgg_NAME,
    FILES_COPIED: copied,
    MEMORY_ENTRIES_PRESENT: destMemoryCount,
    CONTINUITY_VERIFIED: sameId,
    RESTORABLE: true,
  };

  try {
    const journal = require('./journal');
    journal.journalEvent('MIGRATION', identity, {
      TO: dest,
      FILES_COPIED: copied,
      CONTINUITY_VERIFIED: sameId,
    });
  } catch {}

  if (!sameId) {
    report.STATUS = 'FAILED';
    process.exitCode = 1;
  } else {
    report.STATUS = 'OK';
  }
  return report;
}

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) n += countFiles(p);
    else if (entry.name.endsWith('.json')) n += 1;
  }
  return n;
}

module.exports = { migrateTo, copyDir, countFiles };
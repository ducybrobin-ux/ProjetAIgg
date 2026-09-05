'use strict';

const fs = require('fs');
const path = require('path');
const util = require('./util');
const { PATHS, CORE_VERSION } = require('./config');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function createBackup(identity) {
  const stamp = util.timestamp();
  const destDir = path.join(PATHS.backups, `backup-${stamp}`);
  fs.mkdirSync(destDir, { recursive: true });

  copyDir(PATHS.core, path.join(destDir, 'core'));
  copyDir(PATHS.memory, path.join(destDir, 'memory'));
  copyDir(PATHS.journal, path.join(destDir, 'journal'));
  copyDir(PATHS.inbox, path.join(destDir, 'inbox'));
  copyDir(PATHS.outbox, path.join(destDir, 'outbox'));

  const manifest = {
    BACKUP_ID: util.uuid(),
    TIMESTAMP: util.nowIso(),
    AIgg_ID: identity ? identity.AIgg_ID : null,
    AIgg_NAME: identity ? identity.AIgg_NAME : null,
    CORE_VERSION,
    CONTENTS: ['core', 'memory', 'journal', 'inbox', 'outbox'],
    RESTORABLE: true,
  };
  util.writeJson(path.join(destDir, 'manifest.json'), manifest);
  return manifest;
}

function listBackups() {
  if (!fs.existsSync(PATHS.backups)) return [];
  return fs.readdirSync(PATHS.backups)
    .filter((f) => f.startsWith('backup-'))
    .map((f) => {
      const manifest = util.readJson(path.join(PATHS.backups, f, 'manifest.json'), null);
      return { dir: f, manifest };
    });
}

function restoreBackup(dirName) {
  const srcDir = path.join(PATHS.backups, dirName);
  if (!fs.existsSync(srcDir)) throw new Error(`Sauvegarde introuvable: ${dirName}`);
  const manifest = util.readJson(path.join(srcDir, 'manifest.json'), null);
  if (!manifest) throw new Error('Sauvegarde sans manifeste.');

  copyDir(path.join(srcDir, 'core'), PATHS.core);
  copyDir(path.join(srcDir, 'memory'), PATHS.memory);
  copyDir(path.join(srcDir, 'journal'), PATHS.journal);
  copyDir(path.join(srcDir, 'inbox'), PATHS.inbox);
  copyDir(path.join(srcDir, 'outbox'), PATHS.outbox);

  return manifest;
}

module.exports = { createBackup, listBackups, restoreBackup };
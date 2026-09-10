'use strict';

const util = require('./util');
const { PATHS } = require('./config');

function journalEvent(event, identity, extra) {
  const id = util.uuid();
  const entry = {
    EVENT_ID: id,
    TIMESTAMP: util.nowIso(),
    AIgg_ID: identity ? identity.AIgg_ID : null,
    AIgg_NAME: identity ? identity.AIgg_NAME : null,
    EVENT: event,
    ...(extra || {}),
  };
  util.appendLine(PATHS.journalFile, JSON.stringify(entry));
  return entry;
}

function recentJournal(limit) {
  if (!require('fs').existsSync(PATHS.journalFile)) return [];
  const lines = require('fs').readFileSync(PATHS.journalFile, 'utf8').split('\n').filter(Boolean);
  return lines.slice(-(limit || 50)).map((l) => JSON.parse(l));
}

function allEvents() {
  if (!require('fs').existsSync(PATHS.journalFile)) return [];
  const lines = require('fs').readFileSync(PATHS.journalFile, 'utf8').split('\n').filter(Boolean);
  return lines
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

module.exports = { journalEvent, recentJournal, allEvents };
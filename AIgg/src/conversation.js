'use strict';

const fs = require('fs');
const util = require('./util');
const { PATHS } = require('./config');

function journal(identity, event, extra) {
  try { require('./journal').journalEvent(event, identity, extra || {}); } catch {}
}

function append(role, text, intents, identity) {
  const entry = {
    ID: util.uuid(),
    TIMESTAMP: util.nowIso(),
    ROLE: role,
    TEXT: text,
    INTENTS: intents || [],
  };
  util.appendLine(PATHS.conversation, JSON.stringify(entry));
  if (identity) journal(identity, 'CONVERSATION_PERSIST', { ROLE: role, INTENTS: (intents || []).join(',') });
  return entry;
}

function history(limit) {
  if (!fs.existsSync(PATHS.conversation)) return [];
  const raw = fs.readFileSync(PATHS.conversation, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  const parsed = [];
  for (const l of lines) {
    try { parsed.push(JSON.parse(l)); } catch {}
  }
  return limit ? parsed.slice(-limit) : parsed;
}

function clear() {
  const dir = require('path').dirname(PATHS.conversation);
  util.ensureDir(dir);
  fs.writeFileSync(PATHS.conversation, '', 'utf8');
}

function countSince(isoDate) {
  const all = history();
  return all.filter((e) => e.TIMESTAMP >= isoDate).length;
}

module.exports = { append, history, clear, countSince };

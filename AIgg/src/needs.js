'use strict';

const util = require('./util');
const { PATHS } = require('./config');

const STATUS_ACTIVE = 'ACTIVE';
const STATUS_FULFILLED = 'FULFILLED';
const STATUS_REJECTED = 'REJECTED';

function loadNeeds() {
  const data = util.readJson(PATHS.needs, null);
  if (data && Array.isArray(data.needs)) return data;
  const fresh = { needs: [], updated: util.nowIso() };
  util.writeJson(PATHS.needs, fresh);
  return fresh;
}

function saveNeeds(data) {
  data.updated = util.nowIso();
  util.writeJson(PATHS.needs, data);
  return data;
}

function journal(identity, event, extra) {
  try {
    const journal = require('./journal');
    journal.journalEvent(event, identity, extra || {});
  } catch {}
}

function createNeed(identity, { type, description, related_tool, question_for_tutor }) {
  const data = loadNeeds();
  const need = {
    ID: util.uuid(),
    TIMESTAMP: util.nowIso(),
    AIgg_ID: identity ? identity.AIgg_ID : null,
    TYPE: type || 'AIDE',
    DESCRIPTION: description || 'Demande d\'aide',
    RELATED_TOOL: related_tool || null,
    QUESTION_FOR_TUTOR: question_for_tutor || null,
    RESPONSE_TEXT: null,
    STATUS: STATUS_ACTIVE,
    RESOLUTION: null,
    RESOLVED_AT: null,
  };
  data.needs.push(need);
  saveNeeds(data);
  journal(identity, 'NEED_CREATED', { NEED_ID: need.ID, TYPE: need.TYPE, DESCRIPTION: need.DESCRIPTION, RELATED_TOOL: need.RELATED_TOOL });
  if (need.TYPE === 'QUESTION' || need.TYPE === 'CONFIRMATION') {
    try {
      const state = require('./state');
      state.setState('WAITING', identity, `Besoin ${need.TYPE} créé : ${need.ID}`);
    } catch {}
  }
  return need;
}

function listNeeds() {
  return loadNeeds().needs;
}

function listActiveNeeds() {
  return listNeeds().filter((n) => n.STATUS === STATUS_ACTIVE);
}

function resolveNeed(id, identity, status, resolution, responseText) {
  const data = loadNeeds();
  const need = data.needs.find((n) => n.ID === id);
  if (!need) return null;
  need.STATUS = status === STATUS_REJECTED ? STATUS_REJECTED : STATUS_FULFILLED;
  need.RESOLUTION = resolution || null;
  need.RESPONSE_TEXT = responseText || need.RESPONSE_TEXT;
  need.RESOLVED_AT = util.nowIso();
  saveNeeds(data);
  journal(identity, need.STATUS === STATUS_FULFILLED ? 'NEED_FULFILLED' : 'NEED_REJECTED', {
    NEED_ID: need.ID,
    TYPE: need.TYPE,
    RESOLUTION: need.RESOLUTION,
    RESPONSE_TEXT: need.RESPONSE_TEXT,
  });
  if (need.TYPE === 'QUESTION' || need.TYPE === 'CONFIRMATION') {
    const remaining = data.needs.filter((n) => n.STATUS === STATUS_ACTIVE && (n.TYPE === 'QUESTION' || n.TYPE === 'CONFIRMATION'));
    if (remaining.length === 0) {
      try {
        const state = require('./state');
        state.setState('AWAKE', identity, `Tous les besoins ${need.TYPE} résolus`);
      } catch {}
    }
  }
  return need;
}

function fulfillNeed(id, identity, resolution, responseText) {
  return resolveNeed(id, identity, STATUS_FULFILLED, resolution, responseText);
}

function rejectNeed(id, identity, resolution) {
  return resolveNeed(id, identity, STATUS_REJECTED, resolution);
}

function countActive() {
  return listActiveNeeds().length;
}

// Usage aux tests uniquement : vide entièrement le registre (jamais appelé en production).
function deleteAllForTest() {
  const data = loadNeeds();
  data.needs = [];
  saveNeeds(data);
  return true;
}

module.exports = {
  STATUS_ACTIVE,
  STATUS_FULFILLED,
  STATUS_REJECTED,
  loadNeeds,
  createNeed,
  listNeeds,
  listActiveNeeds,
  fulfillNeed,
  rejectNeed,
  countActive,
  deleteAllForTest,
};
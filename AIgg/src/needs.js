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

function createNeed(identity, { type, description, related_tool }) {
  const data = loadNeeds();
  const need = {
    ID: util.uuid(),
    TIMESTAMP: util.nowIso(),
    AIgg_ID: identity ? identity.AIgg_ID : null,
    TYPE: type || 'AIDE',
    DESCRIPTION: description || 'Demande d\'aide',
    RELATED_TOOL: related_tool || null,
    STATUS: STATUS_ACTIVE,
    RESOLUTION: null,
  };
  data.needs.push(need);
  saveNeeds(data);
  journal(identity, 'NEED_CREATED', { NEED_ID: need.ID, TYPE: need.TYPE, DESCRIPTION: need.DESCRIPTION, RELATED_TOOL: need.RELATED_TOOL });
  return need;
}

function listNeeds() {
  return loadNeeds().needs;
}

function listActiveNeeds() {
  return listNeeds().filter((n) => n.STATUS === STATUS_ACTIVE);
}

function resolveNeed(id, identity, status, resolution) {
  const data = loadNeeds();
  const need = data.needs.find((n) => n.ID === id);
  if (!need) return null;
  need.STATUS = status === STATUS_REJECTED ? STATUS_REJECTED : STATUS_FULFILLED;
  need.RESOLUTION = resolution || null;
  need.RESOLVED_AT = util.nowIso();
  saveNeeds(data);
  journal(identity, need.STATUS === STATUS_FULFILLED ? 'NEED_FULFILLED' : 'NEED_REJECTED', {
    NEED_ID: need.ID,
    RESOLUTION: need.RESOLUTION,
  });
  return need;
}

function fulfillNeed(id, identity, resolution) {
  return resolveNeed(id, identity, STATUS_FULFILLED, resolution);
}

function rejectNeed(id, identity, resolution) {
  return resolveNeed(id, identity, STATUS_REJECTED, resolution);
}

function countActive() {
  return listActiveNeeds().length;
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
};
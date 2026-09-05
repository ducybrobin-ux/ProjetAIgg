'use strict';

const fs = require('fs');
const path = require('path');
const util = require('./util');
const { PATHS } = require('./config');

const FAMILIES = ['autobiographical', 'knowledge', 'relations', 'procedures'];

function familyDir(family) {
  if (!FAMILIES.includes(family)) throw new Error(`Famille de mémoire inconnue: ${family}`);
  return PATHS.memoryFamilies[family];
}

function memorize(family, content, identity, opts) {
  const optsObj = opts || {};
  const id = util.uuid();
  const entry = {
    ID: id,
    TIMESTAMP: util.nowIso(),
    AIgg_ID: identity ? identity.AIgg_ID : null,
    SOURCE: optsObj.source || 'AIgg',
    CONTENT: content,
    CONTEXT: optsObj.context || null,
    CONFIDENCE: optsObj.confidence !== undefined ? optsObj.confidence : 0.5,
    STATUS: optsObj.status || 'pending',
    CORRECTABLE: optsObj.mutable !== undefined ? optsObj.mutable : true,
  };
  const file = path.join(familyDir(family), `${util.timestamp()}-${id}.json`);
  util.writeJson(file, entry);
  return entry;
}

function recollect(family, keyword) {
  const files = util.listFiles(familyDir(family)).filter((f) => f.endsWith('.json'));
  const entries = files.map((f) => util.readJson(f, null)).filter(Boolean);
  if (!keyword) return entries;
  const needle = keyword.toLowerCase();
  return entries.filter(
    (e) => JSON.stringify(e.CONTENT || '').toLowerCase().includes(needle)
      || (e.CONTEXT || '').toString().toLowerCase().includes(needle)
      || (e.SOURCE || '').toLowerCase().includes(needle)
  );
}

function count(family) {
  return util.listFiles(familyDir(family)).filter((f) => f.endsWith('.json')).length;
}

function allFamilies() {
  const out = [];
  for (const f of FAMILIES) {
    for (const e of recollect(f)) out.push({ family: f, entry: e });
  }
  return out.sort((a, b) => (a.entry.TIMESTAMP < b.entry.TIMESTAMP ? 1 : -1));
}

function deleteEntry(family, id) {
  const files = util.listFiles(familyDir(family)).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const e = util.readJson(file, null);
    if (e && e.ID === id) {
      fs.unlinkSync(file);
      return e;
    }
  }
  return null;
}

function updateEntry(family, id, patch) {
  const files = util.listFiles(familyDir(family)).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const e = util.readJson(file, null);
    if (e && e.ID === id) {
      Object.assign(e, patch);
      util.writeJson(file, e);
      return e;
    }
  }
  return null;
}

function summary() {
  const out = {};
  for (const f of FAMILIES) out[f] = count(f);
  return out;
}

module.exports = { FAMILIES, memorize, recollect, count, allFamilies, deleteEntry, updateEntry, summary };
'use strict';

const fs = require('fs');
const path = require('path');
const util = require('../../src/util');

const NOTEBOOK_DIR = path.join(__dirname, '..', '..', 'notebook');

function ensureDir() { fs.mkdirSync(NOTEBOOK_DIR, { recursive: true }); }

function slug(text) {
  const s = (text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (s || 'note').slice(0, 60);
}

function add({ hypothesis, question, data }) {
  ensureDir();
  const id = util.uuid();
  const stamp = util.timestamp();
  const file = path.join(NOTEBOOK_DIR, `${stamp}-${slug(question || hypothesis)}.json`);
  const entry = {
    ID: id,
    TIMESTAMP: util.nowIso(),
    STATUS: 'hypothese',
    HYPOTHESIS: hypothesis || null,
    QUESTION: question || null,
    DATA: data || null,
    RESULT: null,
    CONCLUSION: null,
    CORRECTABLE: true,
  };
  util.writeJson(file, entry);
  return entry;
}

function setResult(id, { result, conclusion, status }) {
  ensureDir();
  const files = fs.readdirSync(NOTEBOOK_DIR).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const entry = util.readJson(path.join(NOTEBOOK_DIR, f), null);
    if (entry && entry.ID === id) {
      if (result !== undefined) entry.RESULT = result;
      if (conclusion !== undefined) entry.CONCLUSION = conclusion;
      if (status) entry.STATUS = status;
      util.writeJson(path.join(NOTEBOOK_DIR, f), entry);
      return entry;
    }
  }
  throw new Error('Expérience introuvable: ' + id);
}

function list() {
  ensureDir();
  return fs.readdirSync(NOTEBOOK_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => util.readJson(path.join(NOTEBOOK_DIR, f), null))
    .filter(Boolean)
    .sort((a, b) => (a.TIMESTAMP < b.TIMESTAMP ? 1 : -1));
}

function get(id) {
  return list().find((e) => e.ID === id) || null;
}

async function runTest() {
  try {
    const entry = add({ question: 'test_outil_notebook', hypothesis: 'vérification locale' });
    const ok = !!entry.ID;
    const count = list().length;
    const found = get(entry.ID);
    return ok && found
      ? { status: 'PASS', note: `notebook local OK (${count} expériences)`, detail: { id: entry.ID } }
      : { status: 'FAIL', note: 'écriture/lecture impossible' };
  } catch (err) {
    return { status: 'FAIL', note: err.message };
  }
}

module.exports = { add, setResult, list, get, runTest, NOTEBOOK_DIR };
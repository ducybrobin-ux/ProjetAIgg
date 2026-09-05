'use strict';

const fs = require('fs');
const path = require('path');
const util = require('./util');
const { PATHS } = require('./config');

/**
 * Bibliothèques de spécialisation (cahier : AIgg_BIBLIOTHEQUE_SPECIALISATION_CAHIER_DE_CONCEPTION).
 *
 * Une bibliothèque est un ENVIRONNEMENT D'APPRENTISSAGE structuré appartenant
 * au tuteur. Elle contient métadonnées, sources, documents, connaissances,
 * compétences, curriculum, exercices et journal.
 *
 * Distinctions absolues : BIBLIOTHÈQUE ≠ MÉMOIRE ≠ CERVEAU ≠ IDENTITÉ.
 * SOURCE ≠ DOCUMENT ≠ CONNAISSANCE ≠ COMPÉTENCE.
 *
 * Règles fondamentales :
 *  - PROVENANCE conservée pour chaque connaissance.
 *  - Une compétence n'est JAMAIS MASTERED simplement parce qu'un document a
 *    été lu (transitions validées par le tuteur).
 *  - Les documents importés / le code ne sont JAMAIS exécutés.
 *  - Une bibliothèque est PRIVÉE par défaut (hors dépôt public).
 *  - Aucune IA externe n'est requise : moteur 100 % natif (JSON + fs).
 */

const KNOWLEDGE_STATES = ['UNKNOWN', 'DISCOVERED', 'LEARNING', 'UNDERSTOOD', 'REQUIRES_REVIEW'];
const COMPETENCY_STATES = ['UNKNOWN', 'LEARNING', 'PRACTICED', 'PARTIALLY_MASTERED', 'MASTERED', 'REQUIRES_REVIEW'];
const SOURCE_TYPES = [
  'SITE_WEB', 'ARTICLE', 'LIVRE', 'PDF', 'COURS', 'VIDEO', 'PODCAST',
  'DOCUMENT_OFFICIEL', 'BASE_DE_DONNEES', 'DATASET', 'CODE_SOURCE',
  'DEPOT_GIT', 'NOTE_TUTEUR', 'EXERCICE', 'DONNEE_LOCALE',
];
const TRUST_LEVELS = ['A', 'B', 'C', 'D', 'E'];

function findDirById(id) {
  let result = null;
  const walk = (dir) => {
    for (const d of fs.readdirSync(dir)) {
      const full = path.join(dir, d);
      let st;
      try { st = fs.statSync(full); } catch { continue; }
      if (!st.isDirectory()) continue;
      if (d === '_trash') continue;
      if (fs.existsSync(path.join(full, 'library.json'))) {
        try {
          const lib = readJsonFile(path.join(full, 'library.json'), null);
          if (lib && lib.id === id) { result = full; return true; }
        } catch {}
      } else if (walk(full)) return true;
    }
    return false;
  };
  if (!fs.existsSync(PATHS.libraries)) return null;
  walk(PATHS.libraries);
  return result;
}

function libRoot(id) {
  const direct = path.join(PATHS.libraries, String(id));
  if (fs.existsSync(direct)) return direct;
  if (fs.existsSync(path.join(direct, 'library.json'))) return direct;
  return (findDirById(String(id)) || direct);
}

function libFile(id, name) {
  return path.join(libRoot(id), name);
}

function slugify(text) {
  const base = String(text || 'bibliotheque').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bibliotheque';
  return base.slice(0, 48);
}

function readJsonFile(file, fallback) {
  return util.readJson(file, fallback);
}

function writeJsonFile(file, data) {
  util.writeJson(file, data);
}

function journal(identity, libraryId, event, extra) {
  const dir = libFile(libraryId, 'journal');
  util.ensureDir(dir);
  const entry = {
    EVENT_ID: util.uuid(),
    TIMESTAMP: util.nowIso(),
    AIgg_ID: identity ? identity.AIgg_ID : null,
    LIBRARY_ID: libraryId,
    EVENT: event,
    ...(extra || {}),
  };
  util.appendLine(path.join(dir, 'events.ndjson'), JSON.stringify(entry));
  return entry;
}

function globalJournal(identity, event, extra) {
  try {
    require('./journal').journalEvent(event, identity, extra || {});
  } catch {}
}

// ---------- Découverte ----------

function list() {
  if (!fs.existsSync(PATHS.libraries)) return [];
  const out = [];
  const walk = (dir) => {
    for (const d of fs.readdirSync(dir)) {
      const full = path.join(dir, d);
      let st;
      try { st = fs.statSync(full); } catch { continue; }
      if (!st.isDirectory()) continue;
      if (d === '_trash') continue;
      if (fs.existsSync(path.join(full, 'library.json'))) {
        try { const lib = fromDir(full); if (lib) out.push(lib); } catch {}
      } else {
        walk(full);
      }
    }
  };
  walk(PATHS.libraries);
  return out.sort((a, b) => (a.meta.name < b.meta.name ? -1 : 1));
}

function fromDir(dir) {
  const lib = readJsonFile(path.join(dir, 'library.json'), null);
  if (!lib) return null;
  const stat = fs.statSync(dir);
  return {
    meta: lib,
    sources: countFiles(path.join(dir, 'sources.json'), null) !== null
      ? readJsonFile(path.join(dir, 'sources.json'), { sources: [] }).sources.length : 0,
    knowledge: countDir(path.join(dir, 'knowledge')),
    documents: countDir(path.join(dir, 'documents')),
    exercises: countDir(path.join(dir, 'exercises')),
    competencies: readJsonFile(path.join(dir, 'competencies.json'), { competencies: [] }).competencies.length,
    contradictions: (lib.contradictions || []).length,
    updated_at: lib.updated_at || stat.mtime.toISOString(),
  };
}

function countDir(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).length;
}

function countFiles(file, fallback) {
  return fs.existsSync(file) ? file : null;
}

function find(id) {
  const dir = libRoot(id);
  if (!fs.existsSync(dir)) throw new Error(`Bibliothèque introuvable : ${id}`);
  return fromDir(dir);
}

// ---------- Cycle de vie ----------

function create(identity, fields) {
  const name = (fields.name || '').trim();
  if (!name) throw new Error('Nom de bibliothèque requis.');
  let id = fields.id || slugify(name);
  const existing = fs.existsSync(libRoot(id));
  if (existing) id = `${id}-${util.uuid().slice(0, 6)}`;

  const now = util.nowIso();
  const lib = {
    id,
    name,
    description: fields.description || '',
    owner: identity ? identity.TUTOR_NAME || identity.AIgg_NAME : null,
    created_at: now,
    updated_at: now,
    status: fields.status || 'active',
    level: fields.level || 'beginner',
    purpose: fields.purpose || 'learning',
    domains: Array.isArray(fields.domains) ? fields.domains : [fields.domain || 'general'].filter(Boolean),
    languages: Array.isArray(fields.languages) ? fields.languages : ['fr'],
    learning_mode: fields.learning_mode || 'guided',
    privacy: fields.privacy || 'private',
    priorities: [],
    notes: [],
    contradictions: [],
  };

  const root = libRoot(id);
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(path.join(root, 'knowledge'), { recursive: true });
  fs.mkdirSync(path.join(root, 'documents'), { recursive: true });
  fs.mkdirSync(path.join(root, 'exercises'), { recursive: true });
  fs.mkdirSync(path.join(root, 'journal'), { recursive: true });
  writeJsonFile(libFile(id, 'library.json'), lib);
  writeJsonFile(libFile(id, 'sources.json'), { sources: [] });
  writeJsonFile(libFile(id, 'curriculum.json'), { stages: [] });
  writeJsonFile(libFile(id, 'competencies.json'), { competencies: [] });
  journal(identity, id, 'LIBRARY_CREATED', { NAME: name, PRIVACY: lib.privacy });
  globalJournal(identity, 'LIBRARY_CREATED', { LIBRARY_ID: id, NAME: name });
  return lib;
}

function updateMeta(id, patch, identity) {
  const lib = readJsonFile(libFile(id, 'library.json'), null);
  if (!lib) throw new Error('Bibliothèque introuvable : ' + id);
  const editable = ['name', 'description', 'level', 'purpose', 'domains', 'languages',
    'learning_mode', 'privacy', 'priorities', 'status'];
  for (const k of editable) {
    if (patch[k] !== undefined) lib[k] = patch[k];
  }
  lib.updated_at = util.nowIso();
  writeJsonFile(libFile(id, 'library.json'), lib);
  journal(identity, id, 'LIBRARY_UPDATED', { FIELDS: Object.keys(patch) });
  return lib;
}

function archive(id, identity) {
  return updateMeta(id, { status: 'archived' }, identity);
}

function restore(id, identity) {
  return updateMeta(id, { status: 'active' }, identity);
}

function remove(id, identity, opts) {
  const root = libRoot(id);
  if (!fs.existsSync(root)) throw new Error('Bibliothèque introuvable : ' + id);
  const trash = path.join(PATHS.libraries, '_trash', id);
  util.ensureDir(path.dirname(trash));
  if (fs.existsSync(trash)) fs.rmSync(trash, { recursive: true, force: true });
  fs.renameSync(root, trash);
  journal(identity, id, 'LIBRARY_DELETED', { TRASH: trash });
  globalJournal(identity, 'LIBRARY_DELETED', { LIBRARY_ID: id });
  return { id, status: 'deleted', trash };
}

// ---------- Sources ----------

function loadSources(id) {
  return readJsonFile(libFile(id, 'sources.json'), { sources: [] }).sources;
}

function saveSources(id, sources, identity) {
  writeJsonFile(libFile(id, 'sources.json'), { sources });
  updateMeta(id, { sources_count: sources.length }, identity);
  journal(identity, id, 'SOURCES_UPDATED', { COUNT: sources.length });
}

function addSource(id, identity, fields) {
  const sources = loadSources(id);
  const source = {
    id: util.uuid(),
    title: (fields.title || '').trim(),
    author: fields.author || '',
    organization: fields.organization || '',
    url: fields.url || '',
    type: SOURCE_TYPES.includes(fields.type) ? fields.type : 'SITE_WEB',
    domain: fields.domain || '',
    subdomain: fields.subdomain || '',
    language: fields.language || 'fr',
    publication_date: fields.publication_date || '',
    last_checked: util.nowIso(),
    license: fields.license || '',
    trust_level: TRUST_LEVELS.includes(fields.trust_level) ? fields.trust_level : 'E',
    priority: typeof fields.priority === 'number' ? fields.priority : 0,
    status: fields.status || 'ACTIVE',
    notes: fields.notes || '',
  };
  if (!source.title) throw new Error('Titre de source requis.');
  sources.push(source);
  saveSources(id, sources, identity);
  return source;
}

function updateSource(id, sourceId, patch, identity) {
  const sources = loadSources(id);
  const s = sources.find((x) => x.id === sourceId);
  if (!s) throw new Error('Source introuvable.');
  for (const k of ['title', 'author', 'organization', 'url', 'type', 'domain',
    'subdomain', 'language', 'publication_date', 'license', 'trust_level',
    'priority', 'status', 'notes']) if (patch[k] !== undefined) s[k] = patch[k];
  s.last_checked = util.nowIso();
  saveSources(id, sources, identity);
  return s;
}

function removeSource(id, sourceId, identity) {
  const sources = loadSources(id);
  const next = sources.filter((x) => x.id !== sourceId);
  if (next.length === sources.length) throw new Error('Source introuvable.');
  saveSources(id, next, identity);
  return { removed: true };
}

// ---------- Documents (jamais exécutés) ----------

function documents(id) {
  const dir = libFile(id, 'documents');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
    .map((f) => readJsonFile(path.join(dir, f), null)).filter(Boolean)
    .sort((a, b) => (a.TIMESTAMP < b.TIMESTAMP ? 1 : -1));
}

function addDocument(id, identity, fields) {
  const doc = {
    ID: util.uuid(),
    TIMESTAMP: util.nowIso(),
    LIBRARY_ID: id,
    NAME: fields.name || fields.NAME || 'document',
    TYPE: fields.type || fields.TYPE || 'TEXTE',
    LICENSE: fields.license || fields.LICENSE || '',
    SOURCE_ID: fields.source_id || fields.SOURCE_ID || null,
    CONTENT: String((fields.content !== undefined ? fields.content : fields.CONTENT) || ''),
    NOTES: fields.notes || fields.NOTES || '',
    NEVER_EXECUTED: true,
  };
  const file = path.join(libFile(id, 'documents'), `${util.timestamp()}-${doc.ID}.json`);
  util.writeJson(file, doc);
  journal(identity, id, 'DOCUMENT_ADDED', { NAME: doc.NAME, TYPE: doc.TYPE });
  return doc;
}

function removeDocument(id, docId, identity) {
  const dir = libFile(id, 'documents');
  if (!fs.existsSync(dir)) throw new Error('Document introuvable.');
  for (const f of fs.readdirSync(dir)) {
    const doc = readJsonFile(path.join(dir, f), null);
    if (doc && doc.ID === docId) {
      fs.unlinkSync(path.join(dir, f));
      journal(identity, id, 'DOCUMENT_REMOVED', { DOC_ID: docId });
      return { removed: true };
    }
  }
  throw new Error('Document introuvable.');
}

// ---------- Connaissances (avec provenance) ----------

function knowledge(id) {
  const dir = libFile(id, 'knowledge');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
    .map((f) => readJsonFile(path.join(dir, f), null)).filter(Boolean)
    .sort((a, b) => (a.TIMESTAMP < b.TIMESTAMP ? 1 : -1));
}

function addKnowledge(id, identity, fields) {
  const state = (KNOWLEDGE_STATES.includes(fields.status) ? fields.status
    : KNOWLEDGE_STATES.includes(fields.STATUS) ? fields.STATUS : 'DISCOVERED');
  const sourceIds = Array.isArray(fields.source_ids) ? fields.source_ids
    : (Array.isArray(fields.SOURCE_IDS) ? fields.SOURCE_IDS : []);
  const content = fields.content !== undefined ? fields.content
    : (fields.CONTENT !== undefined ? fields.CONTENT : '');
  const confidence = typeof fields.confidence === 'number' ? fields.confidence
    : (typeof fields.CONFIDENCE === 'number' ? fields.CONFIDENCE : 0.5);
  const notes = Array.isArray(fields.notes) ? fields.notes
    : (Array.isArray(fields.NOTES) ? fields.NOTES : []);
  const entry = {
    ID: util.uuid(),
    TIMESTAMP: util.nowIso(),
    LIBRARY_ID: id,
    AIgg_ID: identity ? identity.AIgg_ID : null,
    CONTENT: content,
    SOURCE_IDS: sourceIds,
    PROVENANCE: sourceIds.length
      ? loadSources(id).filter((s) => sourceIds.includes(s.id))
          .map((s) => ({ source: s.id, title: s.title, trust_level: s.trust_level, url: s.url }))
      : [],
    CONFIDENCE: confidence,
    STATUS: state,
    NOTES: notes,
  };
  if (!entry.CONTENT) throw new Error('Contenu de connaissance requis.');
  const file = path.join(libFile(id, 'knowledge'), `${util.timestamp()}-${entry.ID}.json`);
  util.writeJson(file, entry);
  journal(identity, id, 'KNOWLEDGE_ADDED', { KNOWLEDGE_ID: entry.ID, STATUS: state });
  return entry;
}

function updateKnowledge(id, knowledgeId, patch, identity) {
  const dir = libFile(id, 'knowledge');
  for (const f of fs.readdirSync(dir)) {
    const e = readJsonFile(path.join(dir, f), null);
    if (e && e.ID === knowledgeId) {
      if (patch.STATUS !== undefined && !KNOWLEDGE_STATES.includes(patch.STATUS)) {
        throw new Error(`État de connaissance invalide. Permis : ${KNOWLEDGE_STATES.join(', ')}`);
      }
      Object.assign(e, patch);
      e.UPDATED_AT = util.nowIso();
      util.writeJson(path.join(dir, f), e);
      journal(identity, id, 'KNOWLEDGE_UPDATED', { KNOWLEDGE_ID: knowledgeId, FIELDS: Object.keys(patch) });
      return e;
    }
  }
  throw new Error('Connaissance introuvable.');
}

function removeKnowledge(id, knowledgeId, identity) {
  const dir = libFile(id, 'knowledge');
  for (const f of fs.readdirSync(dir)) {
    const e = readJsonFile(path.join(dir, f), null);
    if (e && e.ID === knowledgeId) {
      fs.unlinkSync(path.join(dir, f));
      journal(identity, id, 'KNOWLEDGE_REMOVED', { KNOWLEDGE_ID: knowledgeId });
      return { removed: true };
    }
  }
  throw new Error('Connaissance introuvable.');
}

// ---------- Compétences (jamais MASTERED automatiquement) ----------

function competencies(id) {
  return readJsonFile(libFile(id, 'competencies.json'), { competencies: [] }).competencies;
}

function saveCompetencies(id, list, identity) {
  writeJsonFile(libFile(id, 'competencies.json'), { competencies: list });
  updateMeta(id, { competencies_count: list.length }, identity);
}

function addCompetency(id, identity, fields) {
  const list = competencies(id);
  const comp = {
    id: util.uuid(),
    name: (fields.name || '').trim(),
    domain: fields.domain || '',
    state: 'UNKNOWN',
    evidence: [],
    history: [{ at: util.nowIso(), state: 'UNKNOWN', note: 'Créée (jamais maîtrisée sans preuve)' }],
  };
  if (!comp.name) throw new Error('Nom de compétence requis.');
  list.push(comp);
  saveCompetencies(id, list, identity);
  journal(identity, id, 'COMPETENCY_ADDED', { NAME: comp.name });
  return comp;
}

function updateCompetency(id, compId, patch, identity) {
  const list = competencies(id);
  const comp = list.find((c) => c.id === compId);
  if (!comp) throw new Error('Compétence introuvable.');
  if (patch.name !== undefined) comp.name = patch.name;
  if (patch.domain !== undefined) comp.domain = patch.domain;
  if (patch.state !== undefined) {
    if (!COMPETENCY_STATES.includes(patch.state)) {
      throw new Error(`État de compétence invalide. Permis : ${COMPETENCY_STATES.join(', ')}`);
    }
    comp.history = comp.history || [];
    comp.history.push({ at: util.nowIso(), state: patch.state, note: patch.note || '' });
    comp.state = patch.state;
  }
  if (patch.evidence !== undefined) comp.evidence = patch.evidence;
  if (patch.note !== undefined) {
    comp.evidence = comp.evidence || [];
    comp.evidence.push({ at: util.nowIso(), note: patch.note, by: 'tutor' });
  }
  saveCompetencies(id, list, identity);
  journal(identity, id, 'COMPETENCY_UPDATED', { COMPETENCY_ID: compId, STATE: comp.state });
  return comp;
}

function removeCompetency(id, compId, identity) {
  const list = competencies(id).filter((c) => c.id !== compId);
  saveCompetencies(id, list, identity);
  journal(identity, id, 'COMPETENCY_REMOVED', { COMPETENCY_ID: compId });
  return { removed: true };
}

// ---------- Exercices ----------

function exercises(id) {
  const dir = libFile(id, 'exercises');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
    .map((f) => readJsonFile(path.join(dir, f), null)).filter(Boolean)
    .sort((a, b) => (a.TIMESTAMP < b.TIMESTAMP ? 1 : -1));
}

function addExercise(id, identity, fields) {
  const ex = {
    ID: util.uuid(),
    TIMESTAMP: util.nowIso(),
    LIBRARY_ID: id,
    TYPE: fields.type || fields.TYPE || 'EXERCICE',
    QUESTION: ((fields.question !== undefined ? fields.question : fields.QUESTION) || '').trim(),
    EXPECTED: fields.expected || fields.EXPECTED || '',
    HINTS: fields.hints || fields.HINTS || '',
    COMPETENCY_ID: fields.competency_id || fields.COMPETENCY_ID || null,
    STATUS: 'active',
  };
  if (!ex.QUESTION) throw new Error('Question d\'exercice requise.');
  const file = path.join(libFile(id, 'exercises'), `${util.timestamp()}-${ex.ID}.json`);
  util.writeJson(file, ex);
  journal(identity, id, 'EXERCISE_ADDED', { EXERCISE_ID: ex.ID });
  return ex;
}

function removeExercise(id, exId, identity) {
  const dir = libFile(id, 'exercises');
  for (const f of fs.readdirSync(dir)) {
    const e = readJsonFile(path.join(dir, f), null);
    if (e && e.ID === exId) {
      fs.unlinkSync(path.join(dir, f));
      journal(identity, id, 'EXERCISE_REMOVED', { EXERCISE_ID: exId });
      return { removed: true };
    }
  }
  throw new Error('Exercice introuvable.');
}

// ---------- Curriculum ----------

function curriculum(id) {
  return readJsonFile(libFile(id, 'curriculum.json'), { stages: [] }).stages;
}

function setCurriculum(id, stages, identity) {
  if (!Array.isArray(stages)) throw new Error('Curriculum attendu : liste d\'étapes.');
  writeJsonFile(libFile(id, 'curriculum.json'), { stages });
  updateMeta(id, { stages: stages.length }, identity);
  journal(identity, id, 'CURRICULUM_UPDATED', { STAGES: stages.length });
  return stages;
}

// ---------- Contradictions (§14) ----------

function addContradiction(id, identity, fields) {
  const lib = readJsonFile(libFile(id, 'library.json'), null);
  if (!lib) throw new Error('Bibliothèque introuvable : ' + id);
  lib.contradictions = lib.contradictions || [];
  const entry = {
    id: util.uuid(),
    created_at: util.nowIso(),
    knowledge_a: fields.knowledge_a,
    knowledge_b: fields.knowledge_b,
    note: fields.note || '',
    status: 'OPEN',
  };
  lib.contradictions.push(entry);
  lib.updated_at = util.nowIso();
  writeJsonFile(libFile(id, 'library.json'), lib);
  journal(identity, id, 'CONTRADICTION_ADDED', { CONTRADICTION_ID: entry.id, A: fields.knowledge_a, B: fields.knowledge_b });
  return entry;
}

function resolveContradiction(id, cId, note, identity) {
  const lib = readJsonFile(libFile(id, 'library.json'), null);
  if (!lib) throw new Error('Bibliothèque introuvable : ' + id);
  const entry = (lib.contradictions || []).find((c) => c.id === cId);
  if (!entry) throw new Error('Contradiction introuvable.');
  entry.status = 'RESOLVED';
  entry.resolved_at = util.nowIso();
  entry.note = note || entry.note;
  lib.updated_at = util.nowIso();
  writeJsonFile(libFile(id, 'library.json'), lib);
  journal(identity, id, 'CONTRADICTION_RESOLVED', { CONTRADICTION_ID: cId });
  return entry;
}

// ---------- Annotations du tuteur ----------

function annotate(id, note, identity) {
  const lib = readJsonFile(libFile(id, 'library.json'), null);
  if (!lib) throw new Error('Bibliothèque introuvable : ' + id);
  lib.notes = lib.notes || [];
  lib.notes.push({ at: util.nowIso(), by: identity ? identity.TUTOR_NAME || 'tuteur' : 'tuteur', text: String(note || '').trim() });
  lib.updated_at = util.nowIso();
  writeJsonFile(libFile(id, 'library.json'), lib);
  journal(identity, id, 'LIBRARY_ANNOTATED', {});
  return lib.notes[lib.notes.length - 1];
}

// ---------- Recherche niveau 1 (§18) ----------

function search(query, optId) {
  const needle = String(query || '').toLowerCase();
  if (!needle) return [];
  const targets = optId ? [optId] : list().map((l) => l.meta.id);
  const out = [];
  for (const id of targets) {
    let lib;
    try { lib = find(id); } catch { continue; }
    const hits = [];
    for (const k of knowledge(id)) {
      if (matchAny(needle, [JSON.stringify(k.CONTENT), k.STATUS])) {
        hits.push({ family: 'knowledge', id: k.ID, content: k.CONTENT, timestamp: k.TIMESTAMP });
      }
    }
    for (const d of documents(id)) {
      if (matchAny(needle, [d.NAME, d.CONTENT])) {
        hits.push({ family: 'document', id: d.ID, content: d.NAME, timestamp: d.TIMESTAMP });
      }
    }
    for (const s of loadSources(id)) {
      if (matchAny(needle, [s.title, s.author, s.organization, s.url])) {
        hits.push({ family: 'source', id: s.id, content: s.title, timestamp: s.last_checked });
      }
    }
    if (hits.length) out.push({ libraryId: id, libraryName: lib.meta.name, hits });
  }
  return out;
}

function matchAny(needle, fields) {
  return fields.some((f) => String(f || '').toLowerCase().includes(needle));
}

// ---------- Import / Export (§24) ----------

function exportLibrary(id) {
  const subset = ['id', 'name', 'description', 'level', 'purpose', 'domains', 'languages',
    'learning_mode', 'privacy', 'priorities', 'notes'];
  const lib = readJsonFile(libFile(id, 'library.json'), null);
  if (!lib) throw new Error('Bibliothèque introuvable : ' + id);
  const meta = {};
  for (const k of subset) meta[k] = lib[k];
  const bundle = {
    format: 'aigg-library',
    version: 1,
    exported_at: util.nowIso(),
    library: meta,
    sources: loadSources(id),
    curriculum: curriculum(id),
    competencies: competencies(id),
    knowledge: knowledge(id).map((k) => ({
      CONTENT: k.CONTENT, SOURCE_IDS: k.SOURCE_IDS, CONFIDENCE: k.CONFIDENCE,
      STATUS: k.STATUS, NOTES: k.NOTES,
    })),
    exercises: exercises(id).map((e) => ({ TYPE: e.TYPE, QUESTION: e.QUESTION, EXPECTED: e.EXPECTED, HINTS: e.HINTS })),
    documents: documents(id).map((d) => ({ NAME: d.NAME, TYPE: d.TYPE, LICENSE: d.LICENSE, CONTENT: d.CONTENT })),
  };
  return bundle;
}

function importAnalyse(bundle) {
  if (!bundle || bundle.format !== 'aigg-library') throw new Error('Format invalide (attendu: aigg-library).');
  if (!bundle.library || !bundle.library.name) throw new Error('Bibliothèque sans nom dans le bundle.');
  const id = bundle.library.id || slugify(bundle.library.name);
  const exists = fs.existsSync(libRoot(id));
  return {
    apercu: {
      id,
      name: bundle.library.name,
      existing: exists,
      source_count: (bundle.sources || []).length,
      knowledge_count: (bundle.knowledge || []).length,
      competency_count: (bundle.competencies || []).length,
      exercise_count: (bundle.exercises || []).length,
      document_count: (bundle.documents || []).length,
    },
    actionable: true,
  };
}

function importActivate(bundle, identity, confirmed) {
  const analyse = importAnalyse(bundle);
  if (analyse.apercu.existing && !confirmed) {
    throw new Error('Une bibliothèque existe déjà sous cet id. Passe confirmed=true pour remplacer.');
  }
  let id = analyse.apercu.id;
  if (analyse.apercu.existing) {
    remove(id, identity, {});
    id = slugify(bundle.library.name);
  }
  const created = create(identity, { ...bundle.library, id });
  id = created.id;
  for (const s of bundle.sources || []) addSource(id, identity, s);
  for (const d of bundle.documents || []) addDocument(id, identity, d);
  for (const k of bundle.knowledge || []) addKnowledge(id, identity, k);
  for (const c of bundle.competencies || []) {
    const created = addCompetency(id, identity, c);
    if (c.state && COMPETENCY_STATES.includes(c.state) && c.state !== 'UNKNOWN') {
      updateCompetency(id, created.id, { state: c.state, note: (c.evidence ? 'importé, preuve ' + c.evidence.length : '') || 'importé' }, identity);
    }
  }
  for (const e of bundle.exercises || []) addExercise(id, identity, e);
  if (Array.isArray(bundle.curriculum)) setCurriculum(id, bundle.curriculum, identity);
  journal(identity, id, 'LIBRARY_IMPORTED', {});
  globalJournal(identity, 'LIBRARY_IMPORTED', { LIBRARY_ID: id, NAME: analyse.apercu.name });
  return { imported: true, id, name: analyse.apercu.name };
}

function libraryJournal(id) {
  const file = path.join(libFile(id, 'journal'), 'events.ndjson');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function health() {
  return {
    libraries_dir: PATHS.libraries,
    existing: list().map((l) => ({ id: l.meta.id, name: l.meta.name })),
    templates_dir: PATHS.templates,
  };
}

module.exports = {
  KNOWLEDGE_STATES,
  COMPETENCY_STATES,
  SOURCE_TYPES,
  TRUST_LEVELS,
  list,
  find,
  create,
  updateMeta,
  archive,
  restore,
  remove,
  addSource,
  loadSources,
  updateSource,
  removeSource,
  documents,
  addDocument,
  removeDocument,
  knowledge,
  addKnowledge,
  updateKnowledge,
  removeKnowledge,
  competencies,
  addCompetency,
  updateCompetency,
  removeCompetency,
  exercises,
  addExercise,
  removeExercise,
  curriculum,
  setCurriculum,
  addContradiction,
  resolveContradiction,
  annotate,
  search,
  exportLibrary,
  importAnalyse,
  importActivate,
  libraryJournal,
  health,
};
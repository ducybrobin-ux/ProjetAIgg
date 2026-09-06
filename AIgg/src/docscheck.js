'use strict';

const fs = require('fs');
const path = require('path');
const { CORE_VERSION } = require('./config');

const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const PROJECT_ROOT = path.join(ROOT, '..');

function readFile(f) {
  try { return fs.readFileSync(f, 'utf8'); }
  catch { return null; }
}

const VERSION_RE = /CORE_VERSION\s+(\d+\.\d+\.\d+)/;
const CHANGELOG_HEAD_RE = /^##\s+v(\d+\.\d+\.\d+)/m;
const STATE_COUNT_RE = /Suite de tests\s*:\s*([^\n]*?)\d+\s*PASS\s*\/\s*\d+\s*FAIL[^\n]*/;
const COUNT_RE = /(\d+)\s*PASS\s*\/\s*(\d+)\s*FAIL/g;

function counts(text) {
  const out = [];
  let m;
  COUNT_RE.lastIndex = 0;
  while ((m = COUNT_RE.exec(text || '')) !== null) {
    out.push({ pass: Number(m[1]), fail: Number(m[2]) });
  }
  return out;
}

function stateCounts(stateText) {
  const m = STATE_COUNT_RE.exec(stateText || '');
  if (!m) return null;
  const c = counts(m[0]);
  return c.length ? c[0] : null;
}

function countMatches(text) {
  const out = [];
  const lines = (text || '').split('\n');
  let version = null;
  for (const line of lines) {
    const h = /^##\s+.*v(\d+\.\d+\.\d+)/.exec(line);
    if (h) { version = h[1]; continue; }
    if (version !== null && version !== CORE_VERSION) continue;
    for (const c of counts(line)) out.push(c);
  }
  return out;
}

function run(opts) {
  const checks = [];
  const o = opts || {};

  const stateText = o.stateText !== undefined ? o.stateText : readFile(path.join(DOCS_DIR, 'STATE.md'));
  const changelogText = o.changelogText !== undefined ? o.changelogText : readFile(path.join(DOCS_DIR, 'CHANGELOG.md'));
  const readmeText = o.readmeText !== undefined ? o.readmeText : readFile(path.join(PROJECT_ROOT, 'README.md'));
  const readmeDocsText = o.readmeDocsText !== undefined ? o.readmeDocsText : readFile(path.join(DOCS_DIR, 'README.md'));
  let roadmapPath = o.roadmapText !== undefined ? null : [
    path.join(PROJECT_ROOT, 'InformationsProjetAIgg', 'Canal_FeuilleDeRoute.json'),
    path.join(ROOT, 'Canal_FeuilleDeRoute.json'),
  ].find((f) => fs.existsSync(f));
  let roadmapText = o.roadmapText !== undefined ? o.roadmapText : (roadmapPath ? readFile(roadmapPath) : null);

  // 1) STATE présent et cohérent
  if (!stateText) {
    checks.push({ label: 'state_present', ok: false, detail: 'STATE.md introuvable' });
  } else {
    const sv = VERSION_RE.exec(stateText);
    checks.push({ label: 'state_version', ok: sv !== null && sv[1] === CORE_VERSION,
      detail: sv ? `STATE=${sv[1]} code=${CORE_VERSION}` : 'aucune version dans STATE' });
  }

  // 2) CHANGELOG — en-tête au niveau de la version courante
  if (!changelogText) {
    checks.push({ label: 'changelog_present', ok: false, detail: 'CHANGELOG.md introuvable' });
  } else {
    const h = CHANGELOG_HEAD_RE.exec(changelogText);
    checks.push({ label: 'changelog_version', ok: h !== null && h[1] === CORE_VERSION,
      detail: h ? `CHANGELOG=${h[1]} code=${CORE_VERSION}` : 'aucun en-tête de version dans CHANGELOG' });
  }

  // 3) Compteurs de tests : l'ensemble des compteurs « courants » doit concorder
  const ref = stateText ? stateCounts(stateText) : null;
  if (!ref) {
    checks.push({ label: 'tests_counts', ok: false, detail: 'compteur de tests absent de STATE.md' });
  } else {
    const all = [];
    const pushCounts = (doc, tag) => {
      for (const c of countMatches(doc)) all.push({ doc: tag, pass: c.pass, fail: c.fail });
    };
    pushCounts(changelogText, 'CHANGELOG');
    pushCounts(readmeText, 'README');
    pushCounts(readmeDocsText, 'docs/README');
    const divergences = all.filter((c) => c.pass !== ref.pass || c.fail !== ref.fail);
    checks.push({ label: 'tests_counts', ok: divergences.length === 0,
      detail: divergences.length
        ? ref.pass + ' PASS / ' + ref.fail + ' FAIL attendu ; écart : ' +
          divergences.map((c) => c.doc + '=' + c.pass + ' PASS / ' + c.fail + ' FAIL').join(', ')
        : ref.pass + ' PASS / ' + ref.fail + ' FAIL cohérent partout' });
  }

  // 4) Roadmap (externe, informatif)
  if (roadmapText) {
    try {
      const road = JSON.parse(roadmapText);
      checks.push({ label: 'roadmap_parse', ok: true, detail: (road.base_version || road.version || '?') + ' — informatif' });
    } catch (e) {
      checks.push({ label: 'roadmap_parse', ok: false, detail: 'FeuilleDeRoute.json illisible : ' + e.message });
    }
  } else {
    checks.push({ label: 'roadmap_parse', ok: true, detail: 'absente localement (MANUAL_CHECK)' });
  }

  // 5) Wiki : étape manuelle
  checks.push({ label: 'state_to_wiki', ok: true, detail: 'MANUAL_CHECK — publication wiki non automatisée' });

  const ok = checks.every((c) => c.ok);
  return { ok, checks, version: CORE_VERSION, readonly: true };
}

function printReport(r) {
  console.log('AIgg DOCS CHECK');
  console.log('Version code      : ' + r.version);
  for (const c of r.checks) {
    console.log('  [' + (c.ok ? 'PASS' : 'FAIL') + '] ' + c.label + ' — ' + c.detail);
  }
  console.log('RESULT            : ' + (r.ok ? 'PASS' : 'FAIL'));
  return r;
}

function runCli() {
  const r = run();
  printReport(r);
  process.exitCode = r.ok ? 0 : 1;
}

module.exports = { run, runCli, printReport };
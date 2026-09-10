'use strict';

const fs = require('fs');
const path = require('path');
const memory = require('./memory');
const journal = require('./journal');

const PRESETS_DIR = path.join(__dirname, 'presets');

function listPresets() {
  if (!fs.existsSync(PRESETS_DIR)) return [];
  return fs.readdirSync(PRESETS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(PRESETS_DIR, f), 'utf8'));
      return {
        id: path.basename(f, '.json'),
        domain: data.domain || path.basename(f, '.json'),
        label: data.label || data.domain || path.basename(f, '.json'),
        description: data.description || '',
        count: (data.knowledge || []).length,
      };
    });
}

function loadPreset(presetId, identity) {
  const filePath = path.join(PRESETS_DIR, `${presetId}.json`);
  if (!fs.existsSync(filePath)) return { ok: false, error: `Preset inconnu : ${presetId}` };
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const entries = data.knowledge || [];
  if (!entries.length) return { ok: false, error: `Preset ${presetId} vide` };

  let loaded = 0;
  let skipped = 0;
  for (const entry of entries) {
    const q = entry.question || '';
    const a = entry.answer || '';
    if (!q || !a) { skipped++; continue; }
    const exists = memory.recollect('knowledge', q).some((e) => {
      const c = e.CONTENT;
      return c && c.question === q;
    });
    if (exists) { skipped++; continue; }
    memory.memorize('knowledge', { question: q, answer: a }, identity, {
      source: 'PRESET',
      context: `preset:${data.domain || presetId}`,
      confidence: 0.85,
      status: 'validated',
    });
    loaded++;
  }

  journal.journalEvent('PRESET_LOADED', identity, {
    PRESET: presetId,
    DOMAIN: data.domain || presetId,
    LOADED: loaded,
    SKIPPED: skipped,
    TOTAL: entries.length,
  });

  return { ok: true, preset: presetId, domain: data.domain || presetId, loaded, skipped, total: entries.length };
}

module.exports = { listPresets, loadPreset, PRESETS_DIR };

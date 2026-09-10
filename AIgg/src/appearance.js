'use strict';

const util = require('./util');
const { PATHS } = require('./config');

const DEFAULT_STATE_COLORS = {
  BORN: '#e8b46a',
  AWAKE: '#6ee7a0',
  LEARNING: '#7fb8f0',
  THINKING: '#c7a0f0',
  WAITING: '#e2cf6e',
  SLEEPING: '#5b6a9e',
  PAUSED: '#8a98b5',
  STOPPED: '#f0a0a0',
};

const DEFAULT_APPEARANCE = {
  version: 2,
  updated: null,
  CHOSEN_AT: null,
  COLORS: {
    bg: '#10121a',
    surface: '#171b26',
    panel: '#0d0f16',
    text: '#dfe6f0',
    muted: '#93a0b5',
    accent: '#2c3a58',
    accent_text: '#dfe6f0',
    danger: '#f0a0a0',
  },
  STATE_COLORS: { ...DEFAULT_STATE_COLORS },
  FONT: 'system-ui, sans-serif',
  NOTES: 'Apparence par défaut du socle N0 (états visuels : v0.3.3).',
};

const STATE_KEYS = Object.keys({
  BORN: 1, AWAKE: 1, LEARNING: 1, THINKING: 1,
  WAITING: 1, SLEEPING: 1, PAUSED: 1, STOPPED: 1,
});

function mergeSchema(data) {
  if (!data || typeof data !== 'object') return { ...DEFAULT_APPEARANCE };
  const out = { ...DEFAULT_APPEARANCE, ...data };
  out.COLORS = { ...DEFAULT_APPEARANCE.COLORS, ...(data.COLORS || {}) };
  out.STATE_COLORS = { ...DEFAULT_APPEARANCE.STATE_COLORS, ...(data.STATE_COLORS || {}) };
  out.updated = data.updated || null;
  return out;
}

function loadAppearance() {
  const data = util.readJson(PATHS.appearance, null);
  const merged = mergeSchema(data);
  const changed = !data
    || data.version !== merged.version
    || !data.STATE_COLORS;
  if (changed) {
    merged.updated = util.nowIso();
    util.writeJson(PATHS.appearance, merged);
  }
  return merged;
}

function loadProposal() {
  return util.readJson(PATHS.appearanceProposal, null);
}

function saveAppearance(appearance, identity, step) {
  appearance.updated = util.nowIso();
  util.writeJson(PATHS.appearance, appearance);
  try {
    const journal = require('./journal');
    journal.journalEvent(`APPEARANCE_${step}`, identity, { COLORS: appearance.COLORS, STATE_COLORS: appearance.STATE_COLORS, FONT: appearance.FONT });
  } catch {}
  return appearance;
}

function propose(identity, changes) {
  const base = loadAppearance();
  const proposal = {
    COLORS: { ...base.COLORS, ...(changes.COLORS || {}) },
    STATE_COLORS: { ...base.STATE_COLORS, ...(changes.STATE_COLORS || {}) },
    FONT: changes.FONT || base.FONT,
    NOTES: changes.NOTES || 'Proposition du tuteur.',
    PROPOSED_AT: util.nowIso(),
    STATUS: 'PROPOSED',
  };
  util.writeJson(PATHS.appearanceProposal, proposal);
  try {
    const journal = require('./journal');
    journal.journalEvent('APPEARANCE_PROPOSED', identity, { STATUS: 'PROPOSED' });
  } catch {}
  return proposal;
}

function apply(identity) {
  const proposal = loadProposal();
  if (!proposal) return { applied: false, reason: 'Aucune proposition en attente.' };
  const appearance = loadAppearance();
  appearance.COLORS = proposal.COLORS;
  appearance.STATE_COLORS = proposal.STATE_COLORS;
  appearance.FONT = proposal.FONT;
  appearance.NOTES = proposal.NOTES;
  appearance.CHOSEN_AT = proposal.PROPOSED_AT || util.nowIso();
  saveAppearance(appearance, identity, 'VALIDATED_AND_APPLIED');
  util.writeJson(PATHS.appearanceProposal, null);
  return { applied: true, appearance };
}

function suggest(identity) {
  const base = loadAppearance();
  const colors = base.COLORS;
  let h = 0;
  const seed = (identity && identity.AIgg_ID ? identity.AIgg_ID : 'n')
    .split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shiftIndex = Math.abs(seed) % 5;
  const palettes = [
    [{ bg: '#0e1410', surface: '#17211b', panel: '#0b120d', text: '#e2efe4', muted: '#8fa895', accent: '#1e3a2f', accent_text: '#6ee7a0', danger: '#f0a0a0' }],
    [{ bg: '#12101c', surface: '#1c1930', panel: '#0d0b18', text: '#e6e2f2', muted: '#9c94b8', accent: '#332b57', accent_text: '#cfc6ff', danger: '#f0a0a0' }],
    [{ bg: '#10191c', surface: '#18262a', panel: '#0c1214', text: '#e0edef', muted: '#8ca3a8', accent: '#1f3a45', accent_text: '#9fd8e6', danger: '#f0a0a0' }],
    [{ bg: '#1a140d', surface: '#251c12', panel: '#110d08', text: '#f0e8da', muted: '#b0a28c', accent: '#3d2c18', accent_text: '#f2c98f', danger: '#f0a0a0' }],
  ];
  h = shiftIndex % palettes.length;
  const palette = { ...colors, ...palettes[h][0] };
  const proposal = {
    COLORS: palette,
    STATE_COLORS: { ...base.STATE_COLORS },
    FONT: 'system-ui, sans-serif',
    NOTES: 'Suggestion d’AIgg : « Veux-tu que je me présente avec ces couleurs ? » (proposition, à valider par le tuteur)',
    PROPOSED_AT: util.nowIso(),
    STATUS: 'PROPOSED',
  };
  util.writeJson(PATHS.appearanceProposal, proposal);
  try {
    const journal = require('./journal');
    journal.journalEvent('APPEARANCE_PROPOSED_BY_AIGG', identity, { STATUS: 'PROPOSED' });
  } catch {}
  return proposal;
}

function status() {
  return { current: loadAppearance(), proposal: loadProposal() };
}

function stateColor(state, appearance) {
  const ap = appearance || loadAppearance();
  const st = String(state || '').toUpperCase();
  return (ap.STATE_COLORS && ap.STATE_COLORS[st]) || DEFAULT_STATE_COLORS[st] || DEFAULT_STATE_COLORS.AWAKE;
}

function setField(identity, assignments) {
  const appearance = loadAppearance();
  const applied = [];
  for (const pair of assignments) {
    const eq = pair.indexOf('=');
    if (eq < 1) throw new Error(`Assignation invalide (attendu clé=valeur) : ${pair}`);
    const key = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!value) throw new Error(`Valeur vide pour ${key}`);
    if (key.toLowerCase() === 'font') {
      appearance.FONT = value;
      applied.push(`FONT=${value}`);
    } else if (key === 'notas' || key === 'notes') {
      appearance.NOTES = value;
      applied.push(`NOTES=${value}`);
    } else if (STATE_KEYS.includes(key)) {
      appearance.STATE_COLORS[key] = value;
      applied.push(`STATE_COLORS.${key}=${value}`);
    } else if (appearance.COLORS && Object.prototype.hasOwnProperty.call(appearance.COLORS, key)) {
      appearance.COLORS[key] = value;
      applied.push(`COLORS.${key}=${value}`);
    } else {
      throw new Error(`Clé inconnue : ${key} (couleurs, états BORN/AWAKE/LEARNING/THINKING/WAITING/SLEEPING/PAUSED/STOPPED, font, notes)`);
    }
  }
  saveAppearance(appearance, identity, 'SET_BY_TUTOR');
  return { applied: applied.length ? applied : ['(aucun changement)'], appearance };
}

function reset(identity) {
  const fresh = { ...DEFAULT_APPEARANCE, updated: util.nowIso(), CHOSEN_AT: util.nowIso() };
  saveAppearance(fresh, identity, 'RESET');
  util.writeJson(PATHS.appearanceProposal, null);
  return { reset: true, appearance: fresh };
}

module.exports = { DEFAULT_APPEARANCE, DEFAULT_STATE_COLORS, loadAppearance, loadProposal, propose, apply, suggest, status, stateColor, setField, reset, mergeSchema };
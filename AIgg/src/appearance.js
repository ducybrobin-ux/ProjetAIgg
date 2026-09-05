'use strict';

const util = require('./util');
const { PATHS } = require('./config');

const DEFAULT_APPEARANCE = {
  version: 1,
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
  FONT: 'system-ui, sans-serif',
  NOTES: 'Apparence par défaut du socle N0.',
};

function loadAppearance() {
  const data = util.readJson(PATHS.appearance, null);
  if (data && data.COLORS) return data;
  const fresh = { ...DEFAULT_APPEARANCE, updated: util.nowIso() };
  util.writeJson(PATHS.appearance, fresh);
  return fresh;
}

function loadProposal() {
  return util.readJson(PATHS.appearanceProposal, null);
}

function saveAppearance(appearance, identity, step) {
  appearance.updated = util.nowIso();
  util.writeJson(PATHS.appearance, appearance);
  try {
    const journal = require('./journal');
    journal.journalEvent(`APPEARANCE_${step}`, identity, { COLORS: appearance.COLORS, FONT: appearance.FONT });
  } catch {}
  return appearance;
}

function propose(identity, changes) {
  const proposal = {
    COLORS: { ...(loadAppearance().COLORS), ...(changes.COLORS || {}) },
    FONT: changes.FONT || loadAppearance().FONT,
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
  appearance.FONT = proposal.FONT;
  appearance.NOTES = proposal.NOTES;
  appearance.CHOSEN_AT = proposal.PROPOSED_AT || util.nowIso();
  saveAppearance(appearance, identity, 'VALIDATED_AND_APPLIED');
  util.writeJson(PATHS.appearanceProposal, null);
  return { applied: true, appearance };
}

function suggest(identity) {
  const base = loadAppearance().COLORS;
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
  const colors = { ...base, ...palettes[h][0] };
  const proposal = {
    COLORS: colors,
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

module.exports = { DEFAULT_APPEARANCE, loadAppearance, loadProposal, propose, apply, suggest, status };
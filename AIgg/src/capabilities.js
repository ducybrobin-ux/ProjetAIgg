'use strict';

const util = require('./util');
const { PATHS, CORE_VERSION } = require('./config');

const BASE_CAPABILITIES = [
  { name: 'IDENTITE', description: 'Connaître son identité', acquired: true, tool: null },
  { name: 'TEMPS', description: 'Percevoir le temps et son âge', acquired: true, tool: null },
  { name: 'MEMOIRE', description: 'Mémoriser et se souvenir', acquired: true, tool: null },
  { name: 'JOURNAL', description: 'Journaliser les événements', acquired: true, tool: null },
  { name: 'QUESTIONNEMENT', description: 'Poser des questions pour comprendre', acquired: true, tool: null },
  { name: 'PERMISSIONS', description: 'Respecter les permissions', acquired: true, tool: null },
  { name: 'ATTENTION', description: 'Réagir aux événements dignes de réaction', acquired: true, tool: null },
  { name: 'BESOINS', description: 'Déterminer ce dont il a besoin', acquired: true, tool: null },
  { name: 'ACTION', description: 'Effectuer des actions permises', acquired: true, tool: null },
  { name: 'DORMIR', description: 'Mettre en veille et conserver l’expérience', acquired: true, tool: null },
  { name: 'VIVRE', description: 'Démarrer, observer, apprendre et interagir', acquired: true, tool: null },
  { name: 'MOURIR', description: 'Arrêt définitif selon procédure explicite', acquired: false, tool: null },
];

function loadCapabilities() {
  const caps = util.readJson(PATHS.capabilities, null);
  if (caps && Array.isArray(caps.capabilities)) return caps;
  const fresh = {
    CORE_VERSION,
    updated: util.nowIso(),
    capabilities: BASE_CAPABILITIES,
  };
  util.writeJson(PATHS.capabilities, fresh);
  return fresh;
}

function detectCapabilities() {
  return loadCapabilities().capabilities;
}

function hasCapacity(name) {
  const caps = detectCapabilities();
  const cap = caps.find((c) => c.name === name);
  return !!(cap && cap.acquired);
}

function acquireCapacity(name, toolName, description) {
  const data = loadCapabilities();
  let cap = data.capabilities.find((c) => c.name === name);
  if (cap) cap.acquired = true;
  else {
    cap = { name, description: description || `Capacité acquise via ${toolName}`, acquired: true, tool: toolName };
    data.capabilities.push(cap);
  }
  data.updated = util.nowIso();
  util.writeJson(PATHS.capabilities, data);
  return cap;
}

function releaseCapacity(name) {
  const data = loadCapabilities();
  const cap = data.capabilities.find((c) => c.name === name);
  if (cap) cap.acquired = false;
  data.updated = util.nowIso();
  util.writeJson(PATHS.capabilities, data);
  return cap;
}

module.exports = {
  loadCapabilities,
  detectCapabilities,
  hasCapacity,
  acquireCapacity,
  releaseCapacity,
  BASE_CAPABILITIES,
};
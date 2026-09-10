'use strict';

const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');

const CORE_VERSION = '0.3.4';
const MEMORY_VERSION = '0.1.0';
const AIGG_NAME = 'AIgg';
const DEFAULT_FIRST_NAME = 'Bob007';

const PATHS = {
  root: ROOT,
  core: path.join(ROOT, 'core'),
  memory: path.join(ROOT, 'memory'),
  memoryFamilies: {
    autobiographical: path.join(ROOT, 'memory', 'autobiographical'),
    knowledge: path.join(ROOT, 'memory', 'knowledge'),
    relations: path.join(ROOT, 'memory', 'relations'),
    procedures: path.join(ROOT, 'memory', 'procedures'),
  },
  senses: path.join(ROOT, 'senses'),
  tools: path.join(ROOT, 'tools'),
  journal: path.join(ROOT, 'journal'),
  journalFile: path.join(ROOT, 'journal', 'events.ndjson'),
  inbox: path.join(ROOT, 'inbox'),
  outbox: path.join(ROOT, 'outbox'),
  backups: path.join(ROOT, 'backups'),
  vault: path.join(ROOT, 'vault'),
  vaultFile: path.join(ROOT, 'vault', 'vault.json'),
  web: path.join(ROOT, 'web', 'public'),
  docs: path.join(ROOT, 'docs'),
  tests: path.join(ROOT, 'tests'),
  libraries: path.join(ROOT, 'libraries'),
  templates: path.join(ROOT, 'templates'),

  identity: path.join(ROOT, 'core', 'identity.json'),
  state: path.join(ROOT, 'core', 'state.json'),
  capabilities: path.join(ROOT, 'core', 'capabilities.json'),
  permissions: path.join(ROOT, 'core', 'permissions.json'),
  needs: path.join(ROOT, 'core', 'needs.json'),
  appearance: path.join(ROOT, 'core', 'appearance.json'),
  appearanceProposal: path.join(ROOT, 'core', 'appearance_proposal.json'),
  pendingLearning: path.join(ROOT, 'core', 'pending_learning.json'),
  conversation: path.join(ROOT, 'core', 'conversation.ndjson'),
  birthCertificate: path.join(ROOT, 'core', 'birth_certificate.json'),
};

const HOST = '127.0.0.1';
const PORT = 8070;

function contractHeader(toolName, toolVersion, permissions, capabilities, source, confidence) {
  return {
    AIgg_ID: null,
    AIgg_NAME: null,
    TUTOR_ID: null,
    TUTOR_NAME: null,
    CORE_VERSION,
    MEMORY_VERSION,
    TOOL_NAME: toolName,
    TOOL_VERSION: toolVersion,
    PERMISSIONS: permissions,
    CAPABILITIES: capabilities,
    EVENT_ID: null,
    TIMESTAMP: null,
    SOURCE: source,
    CONFIDENCE: confidence,
  };
}

module.exports = {
  CORE_VERSION,
  MEMORY_VERSION,
  AIGG_NAME,
  DEFAULT_FIRST_NAME,
  PATHS,
  HOST,
  PORT,
  contractHeader,
};

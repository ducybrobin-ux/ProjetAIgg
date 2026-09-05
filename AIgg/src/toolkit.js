'use strict';

const fs = require('fs');
const path = require('path');
const util = require('./util');
const config = require('./config');
const capabilities = require('./capabilities');
const permissions = require('./permissions');
const journal = require('./journal');

const TOOLS_DIR = config.PATHS.tools;
const STATE_FILE = path.join(config.PATHS.core, 'tools.json');

function loadState() {
  const st = util.readJson(STATE_FILE, { tools: {} });
  if (!st.tools) st.tools = {};
  return st;
}

function saveState(st) {
  util.writeJson(STATE_FILE, st);
}

function discoverAll() {
  const state = loadState();
  const manifests = fs.readdirSync(TOOLS_DIR)
    .filter((dir) => {
      try { return fs.statSync(path.join(TOOLS_DIR, dir)).isDirectory(); } catch { return false; }
    })
    .map((dir) => {
      const manifestPath = path.join(TOOLS_DIR, dir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) return null;
      const manifest = util.readJson(manifestPath, null);
      if (!manifest) return null;
      const st = state.tools[manifest.name] || {};
      const perm = permissions.toolStatus(manifest.name);
      return {
        manifest,
        name: manifest.name,
        title: manifest.title,
        version: manifest.version,
        capability: manifest.capability,
        status: st.status || 'discovered',
        installed_at: st.installed_at || null,
        last_test: st.last_test || null,
        authorized: perm.authorized,
        reason: perm.reason || null,
      };
    })
    .filter(Boolean);
  return manifests;
}

function findManifest(toolName) {
  const tool = discoverAll().find((t) => t.name === toolName);
  if (!tool) throw new Error(`Outil inconnu: ${toolName}`);
  return tool;
}

function loadModule(toolName) {
  const realDir = fs.readdirSync(TOOLS_DIR).find((d) => {
    try {
      const m = util.readJson(path.join(TOOLS_DIR, d, 'manifest.json'), null);
      return m && m.name === toolName;
    } catch { return false; }
  });
  if (!realDir) throw new Error(`Outil introuvable: ${toolName}`);
  return {
    module: require(path.join(TOOLS_DIR, realDir, path.basename(realDir) + '.js')),
    dir: realDir,
    manifest: util.readJson(path.join(TOOLS_DIR, realDir, 'manifest.json'), null),
  };
}

function propose(toolName) {
  const tool = findManifest(toolName);
  const m = tool.manifest;
  return {
    proposal: {
      need: m.need || 'Capacité potentielle',
      tool: m.title,
      category: m.category || 'inconnue',
      capability_gained: m.capability,
      interactions: m.interactions || [],
      permissions_required: m.needs_permissions || [],
      risks: m.risks || [],
      independence: m.independence !== undefined ? m.independence : true,
      requires_external_ai: m.requires_external_ai || false,
      reversibility: m.reversibility || 'révocable',
    },
    current_status: tool.status,
    authorized: tool.authorized,
    version: tool.version,
  };
}

function authorize(toolName) {
  const tool = findManifest(toolName);
  permissions.authorizeTool(toolName, 'Autorisé par le tuteur (console)');
  journal.journalEvent('TOOL_AUTHORIZE', currentIdentity(), { TOOL_NAME: toolName, TOOL_VERSION: tool.version });
  return permissions.toolStatus(toolName);
}

function install(toolName) {
  const tool = findManifest(toolName);
  const state = loadState();
  if (!state.tools[toolName]) state.tools[toolName] = {};
  state.tools[toolName].status = 'installed';
  state.tools[toolName].installed_at = util.nowIso();
  saveState(state);

  capabilities.acquireCapacity(tool.manifest.capability, toolName, tool.manifest.description);
  journal.journalEvent('TOOL_INSTALL', currentIdentity(), {
    TOOL_NAME: toolName,
    CAPABILITY: tool.manifest.capability,
    TOOL_VERSION: tool.version,
  });
  return state.tools[toolName];
}

function revoke(toolName) {
  const tool = findManifest(toolName);
  const state = loadState();
  permissions.revokeTool(toolName);
  capabilities.releaseCapacity(tool.manifest.capability);
  if (state.tools[toolName]) {
    state.tools[toolName].status = 'discovered';
    state.tools[toolName].revoked_at = util.nowIso();
  }
  saveState(state);
  journal.journalEvent('TOOL_REVOKE', currentIdentity(), {
    TOOL_NAME: toolName,
    CAPABILITY_RELEASED: tool.manifest.capability,
  });
  return { revoked: true, toolName };
}

async function test(toolName) {
  const tool = findManifest(toolName);
  const state = loadState();
  let result;
  let mk;

  try {
    const loaded = loadModule(toolName);
    const mod = loaded.module;
    if (typeof mod.runTest === 'function') {
      result = await mod.runTest();
    } else {
      result = { status: 'NOT_TESTED', note: `Aucune fonction runTest dans ${toolName}` };
    }
  } catch (err) {
    result = { status: 'FAIL', note: err.message };
  }

  const entry = {
    status: result.status || 'FAIL',
    at: util.nowIso(),
    note: result.note || '',
    detail: result.detail || null,
  };
  if (!state.tools[toolName]) state.tools[toolName] = {};
  state.tools[toolName].last_test = entry;
  saveState(state);

  journal.journalEvent('TOOL_TEST', currentIdentity(), {
    TOOL_NAME: toolName,
    TEST_STATUS: entry.status,
    TOOL_VERSION: tool.version,
  });

  return { tool: toolName, version: tool.version, test: entry };
}

function currentIdentity() {
  try { return require('./identity').loadIdentity(); } catch { return null; }
}

function status() {
  const tools = discoverAll();
  return {
    discovered: tools.length,
    total: tools.length,
    tools,
  };
}

module.exports = { discoverAll, findManifest, propose, authorize, install, revoke, test, status, loadModule };
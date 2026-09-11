'use strict';

const util = require('./util');
const { PATHS } = require('./config');

const DEFAULT_PERMISSIONS = {
  scope: {
    publish: false,
    delete: false,
    migrate: false,
    send_external: false,
    arbitrary_file_access: false,
  },
  tools: {},
  updated: util.nowIso(),
};

const DEFAULT_TOOLS_BLOCKED = [
  'powershell', 'git', 'github', 'web', 'gmail', 'google_drive',
  'google_docs', 'google_sheets', 'google_calendar', 'google_maps',
  'gemini', 'ia', 'notebook', 'camera', 'microphone', 'voice_synthesis',
  'voice_recognition', 'cloud_storage', 'social', 'avatar', 'hosting',
  'email',
];

function loadPermissions() {
  const perms = util.readJson(PATHS.permissions, null);
  if (perms && perms.scope) {
    for (const t of Object.keys(perms.tools || {})) {
      const entry = perms.tools[t];
      if (entry && entry.allowed !== undefined && entry.authorized === undefined) {
        entry.authorized = entry.allowed;
        delete entry.allowed;
      }
    }
    return perms;
  }
  const merged = {
    scope: DEFAULT_PERMISSIONS.scope,
    tools: { ...DEFAULT_PERMISSIONS.tools },
    updated: util.nowIso(),
  };
  for (const t of DEFAULT_TOOLS_BLOCKED) merged.tools[t] = { authorized: false, reason: 'Bloqué par défaut' };
  util.writeJson(PATHS.permissions, merged);
  return merged;
}

function savePermissions(perms) {
  perms.updated = util.nowIso();
  util.writeJson(PATHS.permissions, perms);
  return perms;
}

function ensureTool(perms, toolName) {
  if (!perms.tools[toolName]) {
    perms.tools[toolName] = { authorized: false, reason: 'Non autorisé' };
  }
  return perms.tools[toolName];
}

function toolStatus(toolName) {
  const perms = loadPermissions();
  return perms.tools[toolName] || { authorized: false, reason: 'Inconnu' };
}

function authorizeTool(toolName, reason) {
  const perms = loadPermissions();
  const tool = ensureTool(perms, toolName);
  tool.authorized = true;
  tool.authorized_at = util.nowIso();
  if (reason) tool.reason = reason;
  savePermissions(perms);
  return tool;
}

function revokeTool(toolName) {
  const perms = loadPermissions();
  const tool = ensureTool(perms, toolName);
  tool.authorized = false;
  tool.revoked_at = util.nowIso();
  tool.reason = 'Révoqué par le tuteur';
  savePermissions(perms);
  return tool;
}

function isAllowed(action) {
  const perms = loadPermissions();
  if (action in perms.scope) return perms.scope[action];
  if (action in perms.tools) return perms.tools[action].authorized;
  return false;
}

function contractContext(identity) {
  return {
    AIgg_ID: identity ? identity.AIgg_ID : null,
    AIgg_NAME: identity ? identity.AIgg_NAME : null,
    TUTOR_ID: identity ? identity.TUTOR_ID : null,
    TUTOR_NAME: identity ? identity.TUTOR_NAME : null,
  };
}

module.exports = {
  loadPermissions,
  toolStatus,
  authorizeTool,
  revokeTool,
  isAllowed,
  contractContext,
  DEFAULT_PERMISSIONS,
  savePermissions,
};
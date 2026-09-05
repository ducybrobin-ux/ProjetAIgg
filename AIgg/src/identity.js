'use strict';

const util = require('./util');
const { PATHS, CORE_VERSION } = require('./config');

function loadIdentity() {
  const identity = util.readJson(PATHS.identity, null);
  if (identity && identity.AIgg_ID) return identity;
  throw new Error('Identité absente. Lancer AIgg.js pour la naissance.');
}

function hasIdentity() {
  const identity = util.readJson(PATHS.identity, null);
  return !!(identity && identity.AIgg_ID);
}

function createIdentity({ name, tutorName, tutorEmail, tutorInfo }) {
  const bornAt = new Date();
  const AIgg_ID = util.uuid();
  const TUTOR_ID = util.uuid();

  const identity = {
    AIgg_ID,
    AIgg_NAME: name.trim(),
    TUTOR_ID,
    TUTOR_NAME: (tutorName || '').trim(),
    TUTOR_EMAIL: (tutorEmail || '').trim(),
    TUTOR_INFO: (tutorInfo || '').trim(),
    CORE_VERSION,
    INCUBATOR: PATHS.root,
    BIRTH_DATE: bornAt.toISOString(),
    TIMEZONE: util.timezone(),
    OS: process.platform,
    NODE_VERSION: process.version,
  };

  const certificate = {
    AIgg_ID,
    AIgg_NAME: identity.AIgg_NAME,
    BIRTH_DATE: identity.BIRTH_DATE,
    BIRTH_TIME: bornAt.toLocaleTimeString(),
    TUTOR_ID,
    TUTOR_NAME: identity.TUTOR_NAME,
    TUTOR_EMAIL: identity.TUTOR_EMAIL,
    INCUBATOR: identity.INCUBATOR,
    CORE_VERSION,
    STATE: 'initial',
  };

  util.writeJson(PATHS.identity, identity);
  util.writeJson(PATHS.birthCertificate, certificate);
  return { identity, certificate };
}

module.exports = {
  loadIdentity,
  hasIdentity,
  createIdentity,
};
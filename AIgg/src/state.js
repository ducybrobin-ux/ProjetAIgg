'use strict';

const util = require('./util');
const { PATHS } = require('./config');

const STATES = {
  BORN: 'BORN',
  AWAKE: 'AWAKE',
  LEARNING: 'LEARNING',
  THINKING: 'THINKING',
  WAITING: 'WAITING',
  SLEEPING: 'SLEEPING',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED',
};

const ALLOWED_STATES = Object.values(STATES);

function loadState() {
  return util.readJson(PATHS.state, {});
}

function saveState(state) {
  util.writeJson(PATHS.state, state);
}

function getAge(identity) {
  const birth = new Date(identity.BIRTH_DATE);
  const now = new Date();
  const ageMs = now - birth;
  return {
    days: Math.floor(ageMs / (1000 * 60 * 60 * 24)),
    hours: Math.floor(ageMs / (1000 * 60 * 60)),
    minutes: Math.floor(ageMs / (1000 * 60)),
    seconds: Math.floor(ageMs / 1000),
    from: birth.toISOString(),
    to: now.toISOString(),
  };
}

function setState(nextState, identity, reason) {
  if (!ALLOWED_STATES.includes(nextState)) {
    throw new Error(`État invalide: ${nextState}. Permis: ${ALLOWED_STATES.join(', ')}`);
  }
  const state = loadState();
  const now = util.nowIso();
  const from = state.state || null;

  state.state = nextState;
  state.updated = now;
  if (from !== nextState) state.history = state.history || [];
  if (from !== nextState) state.history.push({ FROM: from, TO: nextState, AT: now, REASON: reason || null });
  if (state.history && state.history.length > 200) state.history = state.history.slice(-200);

  if (nextState === STATES.AWAKE) {
    state.last_wake = now;
    state.wake_count = (state.wake_count || 0) + 1;
  }
  if (nextState === STATES.SLEEPING) {
    state.last_sleep = now;
    state.sleep_count = (state.sleep_count || 0) + 1;
  }
  saveState(state);

  try {
    const journal = require('./journal');
    journal.journalEvent('STATE_CHANGE', identity, { FROM: from, TO: nextState, REASON: reason || null });
  } catch {}

  return {
    state: state.state,
    from,
    now,
    reason: reason || null,
    lastWake: state.last_wake || null,
    lastSleep: state.last_sleep || null,
    wake_count: state.wake_count || 0,
    sleep_count: state.sleep_count || 0,
    age: identity ? getAge(identity) : null,
  };
}

function wake(identity) {
  return setState(STATES.AWAKE, identity, 'Réveil par le tuteur');
}

function sleep(identity) {
  return setState(STATES.SLEEPING, identity, 'Demande du tuteur');
}

function pause(identity) {
  return setState(STATES.PAUSED, identity, 'Demande du tuteur');
}

function status(identity) {
  const state = loadState();
  return {
    state: state.state || 'UNKNOWN',
    lastWake: state.last_wake || null,
    lastSleep: state.last_sleep || null,
    wake_count: state.wake_count || 0,
    sleep_count: state.sleep_count || 0,
    updated: state.updated || null,
    history: state.history || [],
    age: getAge(identity),
  };
}

module.exports = { STATES, ALLOWED_STATES, loadState, saveState, getAge, setState, wake, sleep, pause, status };
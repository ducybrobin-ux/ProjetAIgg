'use strict';

const fs = require('fs');
const os = require('os');
const util = require('./util');
const { PATHS, PORT } = require('./config');

function hasNetworkInterface() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    const list = ifaces[name] || [];
    if (list.some((a) => a && a.address && !a.internal)) return true;
  }
  return false;
}

function detectSenses() {
  const senses = [
    { name: 'SYNTHESE_VOCALE', label: 'synthèse vocale', test: () => true },
    { name: 'FICHIERS', label: 'fichiers', test: () => fs.existsSync(PATHS.root) },
  ].concat([
    { name: 'ECRAN', label: 'écran', test: () => true },
    { name: 'CLAVIER', label: 'clavier', test: () => true },
    { name: 'MICROPHONE', label: 'microphone', test: () => false },
    { name: 'CAMERA', label: 'caméra', test: () => false },
    { name: 'HAUT_PARLEURS', label: 'haut-parleurs', test: () => false },
    { name: 'RESEAU', label: 'réseau (interface réseau présente)', test: hasNetworkInterface },
    { name: 'HORLOGE', label: 'horloge temps réel', test: () => true },
  ]);

  return senses.map((s) => {
    let available;
    try { available = s.test(); } catch { available = false; }
    return {
      sense: s.name,
      label: s.label,
      DISPONIBLE: available ? 'OUI' : 'NON',
      AUTORISE: 'NON',
      ACTIF: 'NON',
    };
  });
}

function senseStatusText(senses) {
  return senses
    .map((s) => {
      if (s.DISPONIBLE === 'NON') return `${s.label}: non disponible`;
      if (s.AUTORISE === 'NON') return `${s.label}: disponible mais non autorisé`;
      return `${s.label}: actif`;
    })
    .join('\n');
}

module.exports = { detectSenses, senseStatusText };
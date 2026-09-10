'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const util = require('../../src/util');

const OUT_FILE = path.join(__dirname, '..', '..', 'web', 'public', 'avatar.svg');

function palettes() {
  return [
    ['#2a3a6a', '#5b7fd4', '#e8ecf5'],
    ['#3a2a5a', '#8a5bd4', '#f0e8f5'],
    ['#1e3a2f', '#3f8a5a', '#e8f5ec'],
    ['#5a2a2a', '#c65b5b', '#f5e8e8'],
    ['#4a3a1e', '#b58a3f', '#f5efe0'],
    ['#1f3a4a', '#3f8ab5', '#e8f2f5'],
  ];
}

function hueFor(id) {
  const h = parseInt(crypto.createHash('sha256').update(id).digest('hex').slice(0, 8), 16);
  return h % palettes().length;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Variantes visuelles par état : yeux / bouche / opacité globale.
function stareFor(state) {
  switch (state) {
    case 'SLEEPING': return { eyes: 'closed', mouth: 'calm', opacity: 0.55 };
    case 'PAUSED': return { eyes: 'half', mouth: 'neutral', opacity: 0.9 };
    case 'STOPPED': return { eyes: 'half', mouth: 'neutral', opacity: 0.75 };
    case 'BORN': return { eyes: 'open', mouth: 'smile', opacity: 1 };
    case 'THINKING': return { eyes: 'open', mouth: 'neutral', opacity: 1 };
    case 'LEARNING': return { eyes: 'open', mouth: 'smile', opacity: 1 };
    case 'WAITING': return { eyes: 'open', mouth: 'o', opacity: 1 };
    default: return { eyes: 'open', mouth: 'smile', opacity: 1 };
  }
}

function escQuad(v) {
  return esc(v);
}

function generate(identity, opts) {
  if (!identity || !identity.AIgg_ID) throw new Error('Identité requise pour l’avatar.');
  const requested = opts && opts.state ? String(opts.state).toUpperCase() : null;
  const state = requested !== null ? requested
    : (identity.AIgg_STATE || require('../../src/state').status(identity).state || 'AWAKE');
  const stare = stareFor(state);
  const [bg, head, accent] = palettes()[hueFor(identity.AIgg_ID)];
  const stateColor = require('../../src/appearance').stateColor(state);
  const initials = (identity.AIgg_NAME || 'AI')
    .split(/\s+/).map((w) => w[0] || '').filter(Boolean).join('').slice(0, 2).toUpperCase();
  const name = identity.AIgg_NAME || 'AIgg';

  // Yeux selon l'état.
  const eyeL = stare.eyes === 'closed'
    ? `<path d="M132 108 L148 108" stroke="var(--eyec, #ffffff)" stroke-width="4" stroke-linecap="round" opacity="0.9"/>`
    : stare.eyes === 'half'
      ? `<circle cx="140" cy="109" r="9" fill="#ffffff" opacity="0.9"/><path d="M132 109 Q140 103 148 109" stroke="${bg}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.9"/>`
      : `<circle cx="140" cy="108" r="9" fill="#ffffff" opacity="0.9"/><circle cx="144" cy="112" r="3.5" fill="${bg}"/>`;
  const eyeR = stare.eyes === 'closed'
    ? `<path d="M172 108 L188 108" stroke="var(--eyec, #ffffff)" stroke-width="4" stroke-linecap="round" opacity="0.9"/>`
    : stare.eyes === 'half'
      ? `<circle cx="180" cy="109" r="9" fill="#ffffff" opacity="0.9"/><path d="M172 109 Q180 103 188 109" stroke="${bg}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.9"/>`
      : `<circle cx="180" cy="108" r="9" fill="#ffffff" opacity="0.9"/><circle cx="184" cy="112" r="3.5" fill="${bg}"/>`;

  // Bouche selon l'état.
  const mouth = stare.mouth === 'smile'
    ? `<path d="M142 138 Q160 152 178 138" stroke="${accent}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    : stare.mouth === 'o'
      ? `<ellipse cx="160" cy="142" rx="6" ry="7" fill="none" stroke="${accent}" stroke-width="4"/>`
      : stare.mouth === 'calm'
        ? `<path d="M144 142 Q160 148 176 142" stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round"/>`
        : `<path d="M146 142 Q160 146 174 142" stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" role="img" aria-label="Avatar de ${esc(name)}" data-state="${escQuad(state)}">
  <circle cx="160" cy="160" r="152" fill="none" stroke="${stateColor}" stroke-width="6" opacity="0.55"/>
  <rect width="320" height="320" rx="32" fill="${bg}"/>
  <g opacity="${stare.opacity}">
    <circle cx="160" cy="120" r="56" fill="${head}"/>
    <rect x="96" y="120" width="128" height="120" rx="40" fill="${head}"/>
    ${eyeL}
    ${eyeR}
    ${mouth}
    <rect x="120" y="196" width="80" height="10" rx="5" fill="${accent}"/>
  </g>
  <text x="160" y="270" text-anchor="middle" font-family="system-ui, sans-serif" font-size="26" font-weight="600" fill="#ffffff">${esc(initials)}</text>
  <text x="160" y="296" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#ffffff" opacity="0.75">${esc(name)}</text>
</svg>
`;
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, svg, 'utf8');
  return { file: path.relative(path.join(__dirname, '..', '..'), OUT_FILE), size: svg.length, state };
}

async function runTest() {
  try {
    const identity = require('../../src/identity').loadIdentity();
    if (!identity) return { status: 'BLOCKED', note: 'Identité absente.' };
    const current = require('../../src/state').status(identity).state || 'AWAKE';
    const r = generate(identity, { state: current });
    if (r.size > 0 && fs.existsSync(OUT_FILE) && r.state === current) {
      return { status: 'PASS', note: `avatar.svg généré (${r.size} octets, état ${r.state})` };
    }
    return { status: 'FAIL', note: 'génération incomplète' };
  } catch (err) {
    return { status: 'FAIL', note: err.message };
  }
}

module.exports = { generate, runTest, OUT_FILE };
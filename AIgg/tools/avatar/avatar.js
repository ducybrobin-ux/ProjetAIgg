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

function generate(identity) {
  if (!identity || !identity.AIgg_ID) throw new Error('Identité requise pour l’avatar.');
  const [bg, head, accent] = palettes()[hueFor(identity.AIgg_ID)];
  const initials = (identity.AIgg_NAME || 'AI')
    .split(/\s+/).map((w) => w[0] || '').filter(Boolean).join('').slice(0, 2).toUpperCase();
  const name = identity.AIgg_NAME || 'AIgg';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" role="img" aria-label="Avatar de ${esc(name)}">
  <rect width="320" height="320" rx="32" fill="${bg}"/>
  <circle cx="160" cy="120" r="56" fill="${head}"/>
  <rect x="96" y="120" width="128" height="120" rx="40" fill="${head}"/>
  <circle cx="140" cy="108" r="9" fill="#ffffff" opacity="0.9"/>
  <circle cx="180" cy="108" r="9" fill="#ffffff" opacity="0.9"/>
  <circle cx="144" cy="112" r="3.5" fill="${bg}"/>
  <circle cx="184" cy="112" r="3.5" fill="${bg}"/>
  <path d="M146 136 Q160 146 174 136" stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <rect x="120" y="196" width="80" height="10" rx="5" fill="${accent}"/>
  <text x="160" y="270" text-anchor="middle" font-family="system-ui, sans-serif" font-size="26" font-weight="600" fill="#ffffff">${esc(initials)}</text>
  <text x="160" y="296" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#ffffff" opacity="0.75">${esc(name)}</text>
</svg>
`;
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, svg, 'utf8');
  return { file: path.relative(path.join(__dirname, '..', '..'), OUT_FILE), size: svg.length };
}

async function runTest() {
  try {
    const identity = require('../../src/identity').loadIdentity();
    if (!identity) return { status: 'BLOCKED', note: 'Identité absente.' };
    const r = generate(identity);
    if (r.size > 0 && fs.existsSync(OUT_FILE)) {
      return { status: 'PASS', note: `avatar.svg généré (${r.size} octets)` };
    }
    return { status: 'FAIL', note: 'génération incomplète' };
  } catch (err) {
    return { status: 'FAIL', note: err.message };
  }
}

module.exports = { generate, runTest, OUT_FILE };
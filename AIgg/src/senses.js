'use strict';

const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const util = require('./util');
const { PATHS } = require('./config');

const PROBE_CACHE_TTL_MS = 30000;
let cachedProbe = { at: 0, result: null };

const WIN_PROBE = [
  "$ErrorActionPreference = 'SilentlyContinue'",
  "$mic = 'U'; $spk = 'U'",
  'try {',
  "  Add-Type -TypeDefinition 'public static class W { [System.Runtime.InteropServices.DllImport(\"winmm.dll\")] public static extern uint waveInGetNumDevs(); [System.Runtime.InteropServices.DllImport(\"winmm.dll\")] public static extern uint waveOutGetNumDevs(); }'",
  '  $mic = [W]::waveInGetNumDevs().ToString()',
  '  $spk = [W]::waveOutGetNumDevs().ToString()',
  '} catch { }',
  "$cam = 'U'",
  'try { $n = @(Get-CimInstance Win32_PnPEntity -Filter \"PNPClass = \'Camera\' OR PNPClass = \'Image\'\").Count; $cam = $n.ToString() } catch { }',
  'Write-Output (\"MIC=\" + $mic)',
  'Write-Output (\"SPK=\" + $spk)',
  'Write-Output (\"CAM=\" + $cam)',
].join('\n');

function hasNetworkInterface() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    const list = ifaces[name] || [];
    if (list.some((a) => a && a.address && !a.internal)) return true;
  }
  return false;
}

function defaultRun(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 20000, windowsHide: true });
  return { status: r.status, stdout: r.stdout || '', error: r.error ? r.error.code : null };
}

function token(value, yesReason, noReason, unknownReason) {
  if (value === 'U') return { DISPONIBLE: 'UNKNOWN', reason: unknownReason };
  return Number(value) > 0
    ? { DISPONIBLE: 'OUI', reason: yesReason }
    : { DISPONIBLE: 'NON', reason: noReason };
}

function parseWinProbe(stdout) {
  const out = { mic: 'U', spk: 'U', cam: 'U' };
  for (const line of String(stdout || '').split('\n')) {
    const m = line.match(/^(MIC|SPK|CAM)=/);
    if (!m) continue;
    const value = line.slice(m[1].length + 1).trim();
    if (/^-?\d+$/.test(value)) out[m[1].toLowerCase()] = value;
    else if (value === 'U') out[m[1].toLowerCase()] = 'U';
  }
  return out;
}

function probeWindows(runCmd) {
  const r = runCmd('powershell.exe', ['-NoProfile', '-NonInteractive', '-NoLogo', '-Command', WIN_PROBE]);
  if (r.status !== 0 || r.error) {
    throw new Error(r.error ? `powershell indisponible (${r.error})` : `sonde Windows indisponible (exit ${r.status})`);
  }
  return parseWinProbe(r.stdout);
}

function probeLinux() {
  const ls = (dir, pattern) => {
    try { return fs.readdirSync(dir).filter((f) => pattern.test(f)).length; }
    catch { return -1; }
  };
  const result = { mic: 'U', spk: 'U', cam: 'U' };
  const snd = fs.existsSync('/dev/snd');
  if (snd) {
    const capture = ls('/dev/snd', /^pcmC\d+D\d+c$/);
    const playback = ls('/dev/snd', /^pcmC\d+D\d+p$/);
    result.mic = capture > 0 ? 'OUI' : (capture === 0 ? 'NON' : 'U');
    result.spk = playback > 0 ? 'OUI' : (playback === 0 ? 'NON' : 'U');
  }
  const videos = ls('/dev', /^video\d+$/);
  result.cam = videos > 0 ? 'OUI' : (videos === 0 ? 'NON' : 'U');
  return result;
}

function probeAudioResult(kind, value) {
  if (kind === 'mic') {
    return token(value,
      'un ou plusieurs périphériques d\'entrée audio détectés',
      'aucun périphérique d\'entrée audio détecté',
      'détection d\'entrée audio non concluante');
  }
  if (kind === 'spk') {
    return token(value,
      'sortie audio détectée',
      'aucune sortie audio détectée',
      'détection de sortie audio non concluante');
  }
  return token(value,
    'caméra détectée',
    'aucune caméra détectée',
    'détection de caméra non concluante');
}

function audioResult(kind, name, label, probe, values, unavailable, platform) {
  let info;
  let probeName = probe;
  if (unavailable) {
    info = { DISPONIBLE: 'UNKNOWN', reason: unavailable };
  } else if (values) {
    info = probeAudioResult(kind, values[kind]);
  } else {
    info = { DISPONIBLE: 'UNKNOWN', reason: `sonde non implémentée pour ${platform}` };
    probeName = 'none';
  }
  return {
    sense: name,
    label,
    DISPONIBLE: info.DISPONIBLE,
    AUTORISE: 'NON',
    ACTIF: 'NON',
    probe: probeName,
    reason: info.reason,
    timestamp: util.nowIso(),
  };
}

function detectSenses(opts) {
  const o = opts || {};
  const platform = o.platform || os.platform();
  const runCmd = o.runCmd || defaultRun;
  const now = Date.now();

  let probe;
  let unavailable = null;
  const probeName = platform === 'win32' ? 'powershell-winmm-wmi' : (platform === 'linux' ? 'sysfs-alsa-v4l2' : 'none');
  if (platform === 'win32' || platform === 'linux') {
    if (!o.force && cachedProbe.result && now - cachedProbe.at < PROBE_CACHE_TTL_MS) {
      probe = cachedProbe.result;
    } else {
      try {
        probe = platform === 'win32' ? probeWindows(runCmd) : probeLinux();
        if (!o.force) cachedProbe = { at: now, result: probe };
      } catch (e) {
        unavailable = e.message;
        if (!o.force) cachedProbe = { at: now, result: null };
      }
    }
  }

  const audio = [
    audioResult('mic', 'MICROPHONE', 'microphone', probeName, probe, unavailable, platform),
    audioResult('cam', 'CAMERA', 'caméra', probeName, probe, unavailable, platform),
    audioResult('spk', 'HAUT_PARLEURS', 'haut-parleurs', probeName, probe, unavailable, platform),
  ];

  const base = [
    { sense: 'SYNTHESE_VOCALE', label: 'synthèse vocale', available: () => true },
    { sense: 'FICHIERS', label: 'fichiers', available: () => fs.existsSync(PATHS.root) },
    { sense: 'ECRAN', label: 'écran', available: () => true },
    { sense: 'CLAVIER', label: 'clavier', available: () => true },
    { sense: 'RESEAU', label: 'réseau (interface réseau présente)', available: hasNetworkInterface },
    { sense: 'HORLOGE', label: 'horloge temps réel', available: () => true },
  ];

  const utilsMap = base.map((s) => {
    let available;
    try { available = s.available(); } catch { available = false; }
    return {
      sense: s.sense,
      label: s.label,
      DISPONIBLE: available ? 'OUI' : 'NON',
      AUTORISE: 'NON',
      ACTIF: 'NON',
      probe: 'builtin',
      reason: available ? 'capacité présente' : 'capacité absente',
      timestamp: util.nowIso(),
    };
  });

  return utilsMap.concat(audio);
}

function senseStatusText(senses) {
  return senses
    .map((s) => {
      if (s.DISPONIBLE === 'UNKNOWN') return `${s.label}: non déterminé (${s.reason || 'informations insuffisantes'})`;
      if (s.DISPONIBLE === 'NON') return `${s.label}: non disponible`;
      if (s.AUTORISE === 'NON') return `${s.label}: disponible mais non autorisé`;
      return `${s.label}: actif`;
    })
    .join('\n');
}

module.exports = { detectSenses, senseStatusText };
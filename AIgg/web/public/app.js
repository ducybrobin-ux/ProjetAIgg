'use strict';

const $ = (id) => document.getElementById(id);
const badge = $('status-badge');
let STATE = null;

function setText(id, text) { $(id).textContent = text; }
function setPre(id, text) { $(id).textContent = text; }
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

// --- Onglets ---
document.querySelectorAll('.tab').forEach((t) => {
  t.onclick = () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    document.querySelectorAll('.tabpane').forEach((p) => p.classList.remove('active'));
    $('tab-' + t.dataset.tab).classList.add('active');
  };
});

// --- Rendu ---
function render(data) {
  STATE = data;
  const id = data.identity;

  $('welcome').textContent =
    `${id.AIgg_NAME} — né le ${id.BIRTH_DATE}. Tuteur : ${id.TUTOR_NAME} <${id.TUTOR_EMAIL}>`;

  setPre('identity', JSON.stringify(data.identity, null, 2));
  setPre('capabilities',
    data.capabilities.map((c) => `[${c.acquired ? 'OUI' : 'NON'}] ${c.name} — ${c.description}${c.tool ? ' (via ' + c.tool + ')' : ''}`).join('\n'));
  setPre('senses',
    data.senses.map((s) => `${s.label} : D=${s.DISPONIBLE} A=${s.AUTORISE} ACT=${s.ACTIF}`).join('\n'));
  setPre('permissions', JSON.stringify(data.permissions, null, 2));
  setPre('journal',
    data.journal.map((e) => `${e.TIMESTAMP}  ${e.EVENT}${e.TOOL_NAME ? ' [' + e.TOOL_NAME + ']' : ''}`).join('\n') || '(vide)');
  setPre('backups',
    data.backups.length ? data.backups.map((b) => `${b.TIMESTAMP} — ${b.BACKUP_ID}`).join('\n') : 'aucune');

  const status = data.status;
  setPre('status',
    `état: ${status.state}\n` +
    `réveils: ${status.wake_count}\n` +
    `sommeils: ${status.sleep_count}\n` +
    `dernier réveil: ${status.lastWake}\n` +
    `dernier sommeil: ${status.lastSleep}\n` +
    `âge: ${status.age.days} j, ${status.age.hours} h, ${status.age.minutes} min`);

  badge.textContent = status.state;
  badge.className = `badge ${status.state === 'AWAKE' ? 'awake' : 'asleep'}`;

  const avatar = $('avatar-img');
  if (data.avatar) avatar.src = data.avatar + '?t=' + Date.now();
  else avatar.style.opacity = 0.25;

  renderTools(data.tools);
  renderMemory();
  renderNotebook();
  renderNeeds(data.needs);
  applyAppearance(data.appearance);
}

function renderTools(tools) {
  const box = $('tools-list');
  box.innerHTML = '';
  for (const t of tools) {
    const card = document.createElement('div');
    card.className = 'card';
    const test = t.last_test ? t.last_test.status : 'NOT_TESTED';
    card.innerHTML =
      `<h3>${esc(t.title)} <span class="badge">${esc(t.version)}</span></h3>` +
      `<p>${esc(t.description)}</p>` +
      `<p class="meta">capacité: ${esc(t.capability)} — statut: ${esc(t.status)} — autorisé: ${t.authorized} — test: ${esc(test)}</p>` +
      `<div>${toolButtons(t).join('')}</div>`;
    box.appendChild(card);
  }
}

function toolButtons(t) {
  const btn = (label, route, cls) =>
    `<button class="${cls || ''}" data-tool="${esc(t.name)}" data-route="${route}">${label}</button>`;
  const b = [];
  if (!t.authorized) b.push(btn('Autoriser', 'authorize'));
  else b.push(btn('Révoquer', 'revoke', 'danger'));
  if (!t.authorized) b.push(`<button class="" data-ask-tool="${esc(t.name)}">Demander au tuteur</button>`);
  if (t.status !== 'installed') b.push(btn('Installer', 'install'));
  else b.push(btn('Désinstaller (révoque)', 'revoke', 'danger'));
  b.push(btn('Tester', 'test'));
  return b;
}

async function refresh() {
  try { render(await getJSON('/api/state')); }
  catch (e) { console.error(e); }
}

function bindToolActions() {
  window.addEventListener('click', async (ev) => {
    const el = ev.target.closest('button[data-route]');
    if (!el || ev.target.closest('#tabs')) return;
    const tool = el.dataset.tool;
    const route = el.dataset.route;
    const out = await postJSON('/api/tools/' + route, { tool });
    if (out.error) { alert('Erreur: ' + out.error); }
    refresh();
  });
}

function renderMemory() {
  const box = $('memory-list');
  if (!STATE || !STATE.memory) return;
  getJSON('/api/memory').then((rows) => {
    box.innerHTML = rows.length ? '' : '(vide)';
    for (const r of rows) {
      const e = r.entry;
      const div = document.createElement('div');
      div.className = 'mem-row';
      div.innerHTML =
        `<span class="meta">[${esc(r.family)}] ${esc(e.TIMESTAMP)} src=${esc(e.SOURCE)} conf=${e.CONFIDENCE}</span><br>` +
        `${esc(JSON.stringify(e.CONTENT))}<br>` +
        `<button data-del-family="${esc(r.family)}" data-del-id="${esc(e.ID)}" class="danger">supprimer</button>` +
        `<button data-ok="${esc(e.ID)}" data-ok-family="${esc(r.family)}">valider</button>`;
      box.appendChild(div);
    }
  }).catch(() => {});
}

window.addEventListener('click', async (ev) => {
  const del = ev.target.closest('button[data-del-id]');
  if (del) {
    await fetch('/api/memory', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ family: del.dataset.delFamily, id: del.dataset.delId }),
    });
    renderMemory(); refresh();
    return;
  }
  const ask = ev.target.closest('button[data-ask-tool]');
  if (ask) {
    const tool = ask.dataset.askTool;
    await postJSON('/api/needs', {
      type: 'AUTORISATION',
      description: `J'ai besoin de l'autorisation pour utiliser l'outil « ${tool} ».`,
      related_tool: tool,
    });
    alert('Demande d\'autorisation enregistrée (onglet Demandes).');
    refresh();
    return;
  }
  const resolve = ev.target.closest('button[data-resolve]');
  if (resolve) {
    const resolution = prompt(resolve.dataset.kind === 'fulfill' ? 'Résolution (texte libre) :' : 'Motif du refus :', '');
    await postJSON('/api/needs/' + resolve.dataset.kind, {
      id: resolve.dataset.resolve,
      resolution: resolution || '—',
    });
    refresh();
    return;
  }
  const ok = ev.target.closest('button[data-ok]');
  if (ok) {
    await fetch('/api/memory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ family: ok.dataset.okFamily, id: ok.dataset.ok, patch: { STATUS: 'validated' } }),
    });
    renderMemory(); refresh();
  }
});

function renderNeeds(needsList) {
  const box = $('needs-list');
  box.innerHTML = '';
  if (!needsList || !needsList.length) { box.textContent = 'Aucune demande en attente. AIgg ne t\'a encore rien demandé.'; return; }
  for (const n of needsList) {
    const div = document.createElement('div');
    div.className = 'need-row';
    const badge = n.STATUS === 'ACTIVE' ? 'en attente' : n.STATUS === 'FULFILLED' ? 'résolu' : 'refusé';
    div.innerHTML =
      `<span class="meta">[${esc(n.TYPE)}] ${esc(n.TIMESTAMP)} — ${esc(badge)}${n.RELATED_TOOL ? ' (outil: ' + esc(n.RELATED_TOOL) + ')' : ''}</span><br>` +
      `${esc(n.DESCRIPTION)}<br>` +
      (n.RESOLUTION ? `<span class="meta">résolution: ${esc(n.RESOLUTION)}</span><br>` : '') +
      (n.STATUS === 'ACTIVE'
        ? `<button data-resolve="${esc(n.ID)}" data-kind="fulfill">Résoudre</button><button data-resolve="${esc(n.ID)}" data-kind="reject" class="danger">Refuser</button>`
        : '');
    box.appendChild(div);
  }
}

function applyAppearance(ap) {
  if (!ap || !ap.current) return;
  const c = ap.current.COLORS;
  const root = document.documentElement;
  root.style.setProperty('--ap-bg', c.bg);
  root.style.setProperty('--ap-surface', c.surface);
  root.style.setProperty('--ap-panel', c.panel);
  root.style.setProperty('--ap-text', c.text);
  root.style.setProperty('--ap-muted', c.muted);
  root.style.setProperty('--ap-accent', c.accent);
  root.style.setProperty('--ap-accent-text', c.accent_text);
  root.style.setProperty('--ap-danger', c.danger);
  root.style.setProperty('--ap-font', ap.current.FONT);
  // Alimente l'éditeur à partir de l'état courant, sans écraser les retouches du tuteur.
  if (!window.__apLoaded) {
    $('ap-bg').value = c.bg; $('ap-surface').value = c.surface; $('ap-panel').value = c.panel;
    $('ap-text').value = c.text; $('ap-muted').value = c.muted; $('ap-accent').value = c.accent;
    $('ap-accent-text').value = c.accent_text; $('ap-danger').value = c.danger;
    $('ap-font').value = ap.current.FONT || '';
    $('ap-notes').value = ap.current.NOTES || '';
    window.__apLoaded = true;
  }
  if (ap.proposal) {
    const p = ap.proposal.COLORS;
    $('ap-status').textContent =
      `Proposition exportée par AIgg (${ap.proposal.PROPOSED_AT}) : ` +
      `fond ${p.bg}, accents ${p.accent}. En attente de validation.`;
  } else if (!$('ap-status').textContent || $('ap-status').textContent.startsWith('—')) {
    $('ap-status').textContent = '— Aucune proposition en attente. L\'apparence courante est appliquée.';
  }
}

function readAppearanceForm() {
  return {
    COLORS: {
      bg: $('ap-bg').value, surface: $('ap-surface').value, panel: $('ap-panel').value,
      text: $('ap-text').value, muted: $('ap-muted').value, accent: $('ap-accent').value,
      accent_text: $('ap-accent-text').value, danger: $('ap-danger').value,
    },
    FONT: $('ap-font').value || 'system-ui, sans-serif',
    NOTES: $('ap-notes').value || '',
  };
}

// --- Conversation ---
const chatLog = $('chat-log');
function appendChat(role, text) {
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (role === 'ai' ? 'from-ai' : 'from-tutor');
  div.innerHTML = `<span class="meta">${role === 'ai' ? (STATE ? esc(STATE.identity.AIgg_NAME) : 'AIgg') : 'tuteur'}</span><br><span>${esc(text)}</span>`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}
function sendChat() {
  const text = $('chat-input').value.trim();
  if (!text) return;
  appendChat('tutor', text);
  $('chat-input').value = '';
  postJSON('/api/talk', { text }).then((out) => {
    appendChat('ai', out.reply || '(aucune réponse)');
    refresh();
  }).catch(() => appendChat('ai', 'Je n\'ai pas pu répondre : connexion coupée.'));
}

function renderNotebook() {
  const box = $('notebook-list');
  getJSON('/api/state').then((d) => {
    box.innerHTML = d.notebook.length ? '' : '(vide)';
    for (const n of d.notebook) {
      const div = document.createElement('div');
      div.className = 'nb-row';
      div.innerHTML =
        `<span class="meta">${esc(n.TIMESTAMP)} — statut: ${esc(n.STATUS)}</span><br>` +
        `Q: ${esc(n.QUESTION)}<br>` +
        (n.HYPOTHESIS ? `H: ${esc(n.HYPOTHESIS)}<br>` : '') +
        (n.RESULT ? `R: ${esc(n.RESULT)}<br>` : '') +
        (n.CONCLUSION ? `C: ${esc(n.CONCLUSION)}` : '');
      box.appendChild(div);
    }
  }).catch(() => {});
}

function init() {
  refresh();
  setInterval(refresh, 15000);

  $('btn-sleep').onclick = async () => { await postJSON('/api/sleep'); refresh(); };
  $('btn-wake').onclick = async () => { await postJSON('/api/wake'); refresh(); };
  $('btn-backup').onclick = async () => { const m = await postJSON('/api/backup'); alert('Sauvegarde: ' + m.BACKUP_ID); refresh(); };

  $('btn-send').onclick = sendChat;
  $('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

  $('btn-need-create').onclick = async () => {
    const desc = $('need-desc').value.trim();
    if (!desc) return;
    const need = await postJSON('/api/needs', {
      type: $('need-type').value,
      description: desc,
      related_tool: $('need-tool').value.trim() || null,
    });
    $('need-result').textContent = need.ID ? 'Demande enregistrée : ' + need.ID : 'Erreur';
    $('need-desc').value = ''; $('need-tool').value = '';
    refresh();
  };

  $('btn-ap-suggest').onclick = async () => { await postJSON('/api/appearance/suggest'); refresh(); };
  $('btn-ap-propose').onclick = async () => { await postJSON('/api/appearance/propose', readAppearanceForm()); refresh(); };
  $('btn-ap-apply').onclick = async () => {
    const out = await postJSON('/api/appearance/apply');
    if (out.applied) {
      $('ap-status').textContent = 'Proposition validée et appliquée (journalisée).';
      window.__apLoaded = false;
    } else {
      $('ap-status').textContent = (out.reason || 'Aucune proposition en attente.');
    }
    refresh();
  };

  $('btn-memorize').onclick = async () => {
    const family = $('mem-family').value;
    const content = $('mem-content').value;
    if (!content) return;
    const entry = await postJSON('/api/memorize', { family, content });
    $('mem-result').textContent = 'Mémorisé : ' + entry.ID;
    $('mem-content').value = '';
    refresh(); renderMemory();
  };

  $('btn-web-read').onclick = async () => {
    const url = $('web-url').value;
    if (!url) return;
    const out = await postJSON('/api/web/read', { url });
    if (out.blocked) { setPre('web-result', `BLOQUÉ [${out.blocked}] ${out.reason}`); return; }
    const d = out.result;
    setPre('web-result',
      `HTTP ${d.status} — ${d.size} octets — confiance ${d.confidence}\n\n${d.snippet}\n\n(Vérité non automatique : à recouper.)`);
    refresh();
  };

  $('btn-web-search').onclick = async () => {
    const q = $('web-query').value;
    if (!q) return;
    const out = await postJSON('/api/web/search', { query: q });
    if (out.blocked) { setPre('web-search-result', `BLOQUÉ [${out.blocked}] ${out.reason}`); return; }
    if (!out.result || !out.result.results || !out.result.results.length) {
      setPre('web-search-result', 'Aucun résultat ou recherche indisponible.');
      return;
    }
    setPre('web-search-result', out.result.results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`).join('\n'));
    refresh();
  };

  $('btn-nb-add').onclick = async () => {
    const question = $('nb-question').value;
    const hypothesis = $('nb-hypothesis').value;
    if (!question) return;
    const out = await postJSON('/api/notebook/add', { question, hypothesis });
    if (out.blocked) { alert(`BLOQUÉ [${out.blocked}] ${out.reason}`); return; }
    $('nb-question').value = ''; $('nb-hypothesis').value = '';
    refresh(); renderNotebook();
  };

  bindToolActions();
}

init();
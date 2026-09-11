'use strict';

const $ = (id) => document.getElementById(id);
const badge = $('status-badge');
let STATE = null;

function setText(id, text) { $(id).textContent = text; }
function setPre(id, text) { $(id).textContent = text; }
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function cssEsc(s) {
  return String(s ?? '').replace(/["\\]/g, '\\$&');
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
    data.senses.map((s) => {
      const audio = ['MICROPHONE', 'CAMERA', 'HAUT_PARLEURS'].includes(s.sense);
      const extra = audio && s.reason ? ` — ${s.reason}` : '';
      return `${s.label} : D=${s.DISPONIBLE} A=${s.AUTORISE} ACT=${s.ACTIF}${extra}`;
    }).join('\n'));
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
  badge.className = `badge state`;
  const stateColors = (data.appearance && data.appearance.current && data.appearance.current.STATE_COLORS) || {};
  badge.style.setProperty('--st', stateColors[status.state] || stateColors.AWAKE || '#8fa895');

  const avatar = $('avatar-img');
  if (data.avatar) avatar.src = data.avatar + '?t=' + Date.now();
  else avatar.style.opacity = 0.25;
  avatar.style.borderColor = stateColors[status.state] || stateColors.AWAKE || 'var(--ap-accent)';

  renderTools(data.tools);
  renderMemory();
  renderLibraries(data.libraries);
  renderNotebook();
  renderNeeds(data.needs);
  renderNeedsBadge(data.needs, data.active_questions);
  renderChatEntries(data.conversation);
  applyAppearance(data.appearance);
  renderHabitation(data);
  renderHealth(data.health);
}

function renderHabitation(data) {
  const box = $('habitation-detail');
  if (!box) return;
  const b = data.berceau || {};
  const lvl = b.level || {};
  const next = lvl.next ? ` — prochaine habitation : ${esc(lvl.next.name)} (≥ ${esc(lvl.next.minHuman)})` : '';
  box.innerHTML =
    `<div class="card">` +
    `<h3>${esc(b.levelName || '?')} <span class="badge">niveau ${b.levelIndex ?? '?'}</span></h3>` +
    `<p>Quota alloué : <b>${esc(b.allocationHuman || '?')}</b> — j'y occupe <b>${esc(b.usedHuman || '?')}</b> (${b.usedPct ?? '?'}% utilisé).</p>` +
    `<p class="meta">${esc(b.level.plan || '')}${next}</p>` +
    `<p class="meta">équipement prévu (plan du tuteur) : ${esc((lvl.plan || ''))}</p>` +
    `</div>`;
}

function renderHealth(h) {
  const box = $('health');
  if (!box) return;
  if (!h) { box.textContent = 'Indisponible.'; return; }
  const lines = [];
  lines.push(`version : ${h.version}`);
  lines.push('');
  lines.push(`ÉTAT — ${h.etat.courant} (réveils ${h.etat.reveils}, sommeils ${h.etat.sommeils})`);
  lines.push('');
  lines.push('ESPACE');
  lines.push(`  total     : ${h.espace.total_human} (alloué)`);
  lines.push(`  utilisé   : ${h.espace.utilise_human} (${h.espace.pourcent_utilise}%)`);
  lines.push(`  disponible: ${h.espace.disponible_human ?? 'inconnu'}${h.espace.a_l_etroit ? ' — À L\'ÉTROIT (demande AGRANDIR)' : ''}`);
  lines.push('');
  lines.push(`HABITATION : ${h.niveau.name} (niveau ${h.niveau.index}) — ${h.niveau.plan}`);
  if (h.niveau.suivant) lines.push(`  prochaine habitation : ${h.niveau.suivant.name} (≥ ${h.niveau.suivant.minHuman})`);
  lines.push('');
  lines.push(`BIBLIOTHÈQUES : ${h.bibliotheques.presentes} présente(s) (${h.bibliotheques.actives} active(s), ${h.bibliotheques.archivees} archivée(s))`);
  if (h.bibliotheques.noms.length) lines.push('  ' + h.bibliotheques.noms.join(', '));
  lines.push('');
  lines.push(`OUTILS : ${h.outils.presents} présent(s) — ${h.outils.installes} installé(s), ${h.outils.autorises} autorisé(s), ${h.outils.tests_en_echec} en échec de test`);
  if (h.outils.noms.length) lines.push('  ' + h.outils.noms.join(', '));
  lines.push('');
  lines.push('COMPÉTENCES');
  lines.push(`  capacités (core)        : ${h.competences.capabilities_acquires} / ${h.competences.capabilities_total} acquises`);
  lines.push(`  compétences bibliothèque : ${h.competences.competencies_acquises} acquises, ${h.competences.competencies_en_cours} en cours, ${h.competences.competencies_bloquees} bloquées`);
  lines.push('');
  lines.push(`PERMISSIONS actives : ${h.permissions.actives} (${h.permissions.tools_autorises} outil(s) autorisé(s), ${h.permissions.scope_actifs} portée(s))`);
  lines.push('');
  lines.push(`SENS : ${h.sens.disponibles} disponibles / ${h.sens.total} (${h.sens.inconnus} indéterminés)`);
  lines.push('');
  lines.push('TÂCHES');
  lines.push(`  expériences (notebook) : ${h.taches.experiences_notebook}`);
  lines.push(`  besoins actifs         : ${h.taches.besoins_actifs}`);
  lines.push(`  questions ouvertes     : ${h.taches.questions_ouvertes}`);
  lines.push('');
  if (h.erreurs_recentes && h.erreurs_recentes.length) {
    lines.push('ERREURS RÉCENTES (journal)');
    for (const e of h.erreurs_recentes) {
      lines.push(`  ${e.TIMESTAMP} [${e.EVENT}] ${e.ERROR ? '— ' + e.ERROR : ''}${e.TOOL_NAME ? ' (' + e.TOOL_NAME + ')' : ''}`);
    }
  } else {
    lines.push('ERREURS RÉCENTES : aucune marqueur d\'échec dans le journal récent.');
  }
  lines.push('');
  lines.push(`SAUVEGARDES : ${h.sauvegardes.count} — dernières : ${h.sauvegardes.recentes.length ? h.sauvegardes.recentes.join(', ') : 'aucune'}`);
  box.textContent = lines.join('\n');
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
  const answer = ev.target.closest('button[data-answer]');
  if (answer) {
    const id = answer.dataset.answer;
    const input = document.querySelector(`input[data-resp-for="${cssEsc(id)}"]`);
    const responseText = (input && input.value.trim()) || 'réponse du tuteur';
    await postJSON('/api/needs/fulfill', { id, resolution: 'Réponse à la question', response_text: responseText });
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

function renderNeedsBadge(needsList, activeQuestions) {
  const count = activeQuestions || (needsList || []).filter((n) => n.STATUS === 'ACTIVE').length;
  const b = $('needs-badge');
  if (!b) return;
  if (count > 0) {
    b.textContent = count;
    b.style.display = 'inline-block';
    const tab = b.closest('.tab');
    if (tab) tab.classList.add('has-needs');
  } else {
    b.style.display = 'none';
    const tab = b.closest('.tab');
    if (tab) tab.classList.remove('has-needs');
  }
}

function renderNeeds(needsList) {
  const box = $('needs-list');
  box.innerHTML = '';
  if (!needsList || !needsList.length) { box.textContent = 'Aucune demande en attente. AIgg ne t\'a encore rien demandé.'; return; }
  for (const n of needsList) {
    const div = document.createElement('div');
    div.className = 'need-row';
    const badge = n.STATUS === 'ACTIVE' ? 'en attente' : n.STATUS === 'FULFILLED' ? 'résolu' : 'refusé';
    const kind = n.TYPE === 'QUESTION' ? 'question' : n.TYPE === 'CONFIRMATION' ? 'confirmation' : n.TYPE.toLowerCase();
    div.innerHTML =
      `<span class="meta">[${esc(kind)}] ${esc(n.TIMESTAMP)} — ${esc(badge)}${n.RELATED_TOOL ? ' (outil: ' + esc(n.RELATED_TOOL) + ')' : ''}</span><br>` +
      `${esc(n.DESCRIPTION)}<br>` +
      (n.RESPONSE_TEXT ? `<span class="meta">réponse d'AIgg reçue: ${esc(n.RESPONSE_TEXT)}</span><br>` : '') +
      (n.RESOLUTION && !n.RESPONSE_TEXT ? `<span class="meta">résolution: ${esc(n.RESOLUTION)}</span><br>` : '') +
      (n.RESOLVED_AT ? `<span class="meta">résolu le: ${esc(n.RESOLVED_AT)}</span><br>` : '') +
      (n.STATUS === 'ACTIVE'
        ? (n.TYPE === 'QUESTION'
          ? `<input data-resp-for="${esc(n.ID)}" placeholder="Ta réponse à AIgg…"><button data-answer="${esc(n.ID)}">Répondre</button>`
          : `<button data-resolve="${esc(n.ID)}" data-kind="fulfill">Résoudre</button><button data-resolve="${esc(n.ID)}" data-kind="reject" class="danger">Refuser</button>`)
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
  const stateColors = ap.current.STATE_COLORS || {};
  for (const key of Object.keys(stateColors)) {
    root.style.setProperty('--ap-state-' + key, stateColors[key]);
  }
  // Alimente l'éditeur à partir de l'état courant, sans écraser les retouches du tuteur.
  if (!window.__apLoaded) {
    $('ap-bg').value = c.bg; $('ap-surface').value = c.surface; $('ap-panel').value = c.panel;
    $('ap-text').value = c.text; $('ap-muted').value = c.muted; $('ap-accent').value = c.accent;
    $('ap-accent-text').value = c.accent_text; $('ap-danger').value = c.danger;
    $('ap-font').value = ap.current.FONT || '';
    $('ap-notes').value = ap.current.NOTES || '';
    for (const key of Object.keys(stateColors)) {
      const el = $('ap-state-' + key);
      if (el) el.value = stateColors[key];
    }
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
    STATE_COLORS: {
      BORN: $('ap-state-BORN').value,
      AWAKE: $('ap-state-AWAKE').value,
      LEARNING: $('ap-state-LEARNING').value,
      THINKING: $('ap-state-THINKING').value,
      WAITING: $('ap-state-WAITING').value,
      SLEEPING: $('ap-state-SLEEPING').value,
      PAUSED: $('ap-state-PAUSED').value,
      STOPPED: $('ap-state-STOPPED').value,
    },
    FONT: $('ap-font').value || 'system-ui, sans-serif',
    NOTES: $('ap-notes').value || '',
  };
}

// --- Rendus conversation (persistée serveur, v0.3.4) ---
const chatLog = $('chat-log');

function renderChatEntries(entries) {
  chatLog.innerHTML = '';
  if (!entries || !entries.length) { chatLog.innerHTML = '<span class="meta">Aucun échange encore. Écris à AIgg…</span>'; return; }
  for (const e of entries) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (e.ROLE === 'ai' ? 'from-ai' : 'from-tutor');
    const who = e.ROLE === 'ai' ? (STATE ? STATE.identity.AIgg_NAME : 'AIgg') : 'tuteur';
    const badge = e.INTENTS && e.INTENTS.length ? ` <span class="meta">[${esc(e.INTENTS.join(','))}]</span>` : '';
    div.innerHTML = `<span class="meta">${esc(who)} · ${esc((e.TIMESTAMP || '').slice(11, 19))}</span>${badge}<br><span>${esc(e.TEXT)}</span>`;
    chatLog.appendChild(div);
  }
  chatLog.scrollTop = chatLog.scrollHeight;
}

function appendChat(role, text, intents) {
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (role === 'ai' ? 'from-ai' : 'from-tutor');
  div.innerHTML = `<span class="meta">${role === 'ai' ? (STATE ? esc(STATE.identity.AIgg_NAME) : 'AIgg') : 'tuteur'}</span><br><span>${esc(text)}</span>`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function sendChat() {
  const text = $('chat-input').value.trim();
  if (!text) return;
  $('chat-input').value = '';
  postJSON('/api/talk', { text }).then((out) => {
    appendChat('ai', out.reply || '(aucune réponse)');
    refresh();
  }).catch(() => appendChat('ai', 'Je n\'ai pas pu répondre : connexion coupée.'));
}

function renderLibraries(libs) {
  const box = $('libraries-list');
  if (!box) return;
  box.innerHTML = '';
  if (!libs || !libs.length) { box.textContent = 'Aucune bibliothèque. Crée-en une ci-contre.'; return; }
  for (const l of libs) {
    const pub = l.meta.privacy !== 'private' ? 'public' : 'privée';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      `<h3>${esc(l.meta.name)} <span class="badge">${esc(pub)}</span> <span class="badge">${esc(l.meta.status)}</span></h3>` +
      `<p class="meta">${esc(l.meta.id)} · domaine: ${esc((l.meta.domains || []).join(', '))} · niveau: ${esc(l.meta.level)}</p>` +
      `<p>${esc(l.meta.description || '')}</p>` +
      `<p class="meta">sources: ${l.sources} · connaissances: ${l.knowledge} · compétences: ${l.competencies} · documents: ${l.documents} · exercices: ${l.exercises} · contradictions: ${l.contradictions}</p>` +
      `<div class="lib-actions">` +
        `<button data-lib-open="${esc(l.meta.id)}">Détail</button>` +
        `<button data-lib-export="${esc(l.meta.id)}">Exporter</button>` +
        (l.meta.status === 'active'
          ? `<button data-lib-archive="${esc(l.meta.id)}">Archiver</button>`
          : `<button data-lib-restore="${esc(l.meta.id)}">Restaurer</button>`) +
        `<button data-lib-delete="${esc(l.meta.id)}" class="danger">Supprimer</button>` +
      `</div>` +
      `<div class="lib-detail" id="lib-detail-${esc(l.meta.id)}"></div>`;
    box.appendChild(card);
  }
}

async function openLibraryDetail(id) {
  const wrap = $('lib-detail-' + id);
  if (!wrap) return;
  if (wrap.dataset.loaded) { wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none'; return; }
  const d = await getJSON('/api/library?id=' + encodeURIComponent(id));
  const kn = await getJSON('/api/library/' + encodeURIComponent(id) + '/knowledge');
  const comp = await getJSON('/api/library/' + encodeURIComponent(id) + '/competencies');
  const ex = await getJSON('/api/library/' + encodeURIComponent(id) + '/exercises');
  const docs = await getJSON('/api/library/' + encodeURIComponent(id) + '/documents');
  const cur = await getJSON('/api/library/' + encodeURIComponent(id) + '/curriculum');
  const contr = await getJSON('/api/library/' + encodeURIComponent(id) + '/contradictions');
  const notes = await getJSON('/api/library/' + encodeURIComponent(id) + '/annotations');

  const sourceRows = (d.sources || []).map((s) =>
    `<div class="src-row"><b>${esc(s.title)}</b> <span class="badge">${esc(s.trust_level)}</span> <span class="meta">${esc(s.type)}</span>` +
    (s.url ? ` <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>` : '') +
    `</div>`).join('') || '(aucune source)';
  const knRows = kn.map((k) =>
    `<div class="src-row"><span class="meta">[${esc(k.STATUS)}] conf=${k.CONFIDENCE}</span> ${esc(k.CONTENT)}` +
    (k.PROVENANCE && k.PROVENANCE.length ? ` <span class="meta">src: ${esc(k.PROVENANCE.map(p=>p.title).join(', '))}</span>` : '') + `</div>`).join('') || '(aucune connaissance)';
  const compRows = comp.map((c) =>
    `<div class="src-row">${esc(c.name)} <span class="badge">${esc(c.state)}</span> ${esc(c.evidence && c.evidence.length ? '· preuve: ' + c.evidence.length : '')}</div>`).join('') || '(aucune compétence)';
  const exRows = ex.map((e) => `<div class="src-row">[${esc(e.TYPE)}] ${esc(e.QUESTION)}</div>`).join('') || '(aucun exercice)';
  const docRows = docs.map((e) => `<div class="src-row">[${esc(e.TYPE)}] ${esc(e.NAME)}</div>`).join('') || '(aucun document)';
  const curRows = (cur && cur.length ? cur.map((s) => `Niveau ${s.level}: ${esc(s.topics ? s.topics.join(', ') : '')}`).join('<br>') : '(curriculum vide)');
  const contrRows = (contr && contr.length ? contr.map((c) => `<div class="src-row">${esc(c.knowledge_a)} ⟂ ${esc(c.knowledge_b)} <span class="badge">${esc(c.status)}</span></div>`).join('') : '(aucune contradiction)');
  const noteRows = (notes && notes.length ? notes.map((n) => `<div class="src-row"><span class="meta">${esc(n.at)} ${esc(n.by)}</span>: ${esc(n.text)}</div>`).join('') : '(aucune note)');

  wrap.innerHTML =
    `<h4>Sources (${d.sources.length})</h4>` + sourceRows +
    `<h4>Connaissances (${kn.length})</h4>` + knRows +
    `<h4>Compétences (${comp.length})</h4>` + compRows +
    `<h4>Exercices (${ex.length})</h4>` + exRows +
    `<h4>Documents (${docs.length}) — jamais exécutés</h4>` + docRows +
    `<h4>Curriculum</h4>` + curRows +
    `<h4>Contradictions (${(contr || []).length})</h4>` + contrRows +
    `<h4>Notes du tuteur</h4>` + noteRows;
  wrap.dataset.loaded = '1';
  wrap.style.display = 'block';
}

window.addEventListener('click', async (ev) => {
  const open = ev.target.closest('button[data-lib-open]');
  if (open) { await openLibraryDetail(open.dataset.libOpen); return; }
  const ex = ev.target.closest('button[data-lib-export]');
  if (ex) {
    const b = await getJSON('/api/libraries/export?id=' + encodeURIComponent(ex.dataset.libExport));
    navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(b, null, 2));
    alert('Export prêt dans le presse-papiers (format aigg-library v1).');
    return;
  }
  const del = ev.target.closest('button[data-lib-delete]');
  if (del) {
    if (!confirm('Supprimer définitivement cette bibliothèque ? (corbeille local)')) return;
    await fetch('/api/library', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: del.dataset.libDelete }) });
    refresh(); return;
  }
  const arch = ev.target.closest('button[data-lib-archive]');
  if (arch) {
    await fetch('/api/library', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: arch.dataset.libArchive, patch: { status: 'archived' } }) });
    refresh(); return;
  }
  const rest = ev.target.closest('button[data-lib-restore]');
  if (rest) {
    await fetch('/api/library', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: rest.dataset.libRestore, patch: { status: 'active' } }) });
    refresh(); return;
  }
});

function renderNotebook() {
  const box = $('notebook-list');
  getJSON('/api/state').then((d) => {
    box.innerHTML = d.notebook.length ? '' : '(vide)';
    for (const n of d.notebook) {
      const div = document.createElement('div');
      div.className = 'nb-row';
      div.innerHTML =
        `<span class="meta">${esc(n.TIMESTAMP)} — statut: ${esc(n.STATUS)}</span>` +
        ` <button data-nb-del="${esc(n.ID)}">supprimer</button><br>` +
        `Q: ${esc(n.QUESTION)}<br>` +
        (n.HYPOTHESIS ? `H: ${esc(n.HYPOTHESIS)}<br>` : '') +
        (n.RESULT ? `R: ${esc(n.RESULT)}<br>` : '') +
        (n.CONCLUSION ? `C: ${esc(n.CONCLUSION)}` : '');
      box.appendChild(div);
    }
  }).catch(() => {});
}

document.addEventListener('click', async (ev) => {
  const del = ev.target.closest('button[data-nb-del]');
  if (del) {
    await postJSON('/api/notebook/remove', { id: del.dataset.nbDel });
    refresh(); return;
  }
});

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

  const libBtn = $('btn-lib-create');
  if (libBtn) libBtn.onclick = async () => {
    const name = $('lib-name').value.trim();
    if (!name) return;
    const domains = $('lib-domain').value.split(',').map((s) => s.trim()).filter(Boolean);
    const lib = await postJSON('/api/libraries', {
      name,
      domains: domains.length ? domains : ['general'],
      description: $('lib-desc').value.trim(),
      privacy: $('lib-private').checked ? 'private' : 'public',
    });
    $('lib-create-result').textContent = lib.id ? 'Créée : ' + lib.id : 'Erreur';
    $('lib-name').value = ''; $('lib-domain').value = ''; $('lib-desc').value = '';
    refresh();
  };
  const libSearchBtn = $('btn-lib-search');
  if (libSearchBtn) libSearchBtn.onclick = async () => {
    const q = $('lib-search-q').value.trim();
    if (!q) return;
    const ml = document.getElementById('lib-search-lang') ? document.getElementById('lib-search-lang').value : '';
    const mt = document.getElementById('lib-search-type') ? document.getElementById('lib-search-type').value : '';
    const url = '/api/libraries/search?q=' + encodeURIComponent(q) + '&limit=20'
      + (ml ? '&language=' + encodeURIComponent(ml) : '')
      + (mt ? '&type=' + encodeURIComponent(mt) : '');
    const res = await getJSON(url);
    setPre('lib-search-result', res.count ? res.results.map((r) => {
      const cause = r.fields.map((f) => `${f.field}:${f.score}`).join(' ');
      return `[${r.score}] ${r.title} (${r.type}${r.language ? ', ' + r.language : ''} — ${r.libraryName})\n   cause : ${cause}`;
    }).join('\n') : 'Aucune correspondance.');
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
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const config = require('./config');
const identity = require('./identity');
const state = require('./state');
const memory = require('./memory');
const journal = require('./journal');
const capabilities = require('./capabilities');
const permissions = require('./permissions');
const senses = require('./senses');
const backup = require('./backup');
const toolkit = require('./toolkit');
const contract = require('./contract');
const needs = require('./needs');
const appearance = require('./appearance');
const talk = require('./talk');
const library = require('./library');
const conversation = require('./conversation');
const util = require('./util');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function apiData() {
  const ident = identity.loadIdentity();
  const activeQuestions = needs.listActiveNeeds().filter((n) => n.TYPE === 'QUESTION' || n.TYPE === 'CONFIRMATION').length;
  return {
    identity: ident,
    status: state.status(ident),
    capabilities: capabilities.detectCapabilities(),
    permissions: permissions.loadPermissions(),
    senses: senses.detectSenses(),
    memory: memory.summary(),
    tools: toolkit.discoverAll(),
    journal: journal.recentJournal(40),
    backups: backup.listBackups().map((b) => b.manifest),
    notebook: notebookListSafe(),
    needs: needs.listNeeds(),
    conversation: conversation.history(200),
    active_questions: activeQuestions,
    appearance: appearance.status(),
    libraries: library.list(),
    avatar: fs.existsSync(path.join(config.PATHS.web, 'avatar.svg')) ? '/avatar.svg' : null,
  };
}

function notebookListSafe() {
  try { return require('../tools/notebook/notebook.js').list(); }
  catch { return []; }
}

function sendJson(res, data, code) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(code || 200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function sendError(res, message, code) {
  sendJson(res, { ok: false, error: message }, code || 400);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { resolve({}); }
    });
  });
}

function toolCall(res, ident, toolName, action, opts, routeFn) {
  let manifest;
  try { manifest = toolkit.findManifest(toolName).manifest; }
  catch { sendError(res, `Outil inconnu: ${toolName}`); return; }
  contract.executeTool(ident, manifest, action, { ...opts, execute: routeFn })
    .then((out) => {
      if (!out.ok && out.blocked) {
        sendJson(res, { ok: false, blocked: out.blocked, reason: out.reason }, 403);
        return;
      }
      sendJson(res, { ok: true, result: out.result ? out.result.data : null, contract: out.contract });
    })
    .catch((err) => sendError(res, err.message));
}

function start() {
  const docs = path.join(config.PATHS.web);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const ident = identity.hasIdentity() ? identity.loadIdentity() : null;

    // --- API état global ---
    if (url.pathname === '/api/state' && req.method === 'GET') {
      sendJson(res, apiData());
      return;
    }

    // --- Outils ---
    if (url.pathname === '/api/tools' && req.method === 'GET') {
      sendJson(res, toolkit.discoverAll());
      return;
    }
    if (url.pathname === '/api/tools/propose' && req.method === 'GET') {
      const t = url.searchParams.get('tool');
      try { sendJson(res, toolkit.propose(t)); }
      catch (e) { sendError(res, e.message); }
      return;
    }
    if (url.pathname === '/api/tools/authorize' && req.method === 'POST') {
      const body = await readBody(req);
      try { sendJson(res, toolkit.authorize(body.tool)); }
      catch (e) { sendError(res, e.message); }
      return;
    }
    if (url.pathname === '/api/tools/install' && req.method === 'POST') {
      const body = await readBody(req);
      try { sendJson(res, toolkit.install(body.tool)); }
      catch (e) { sendError(res, e.message); }
      return;
    }
    if (url.pathname === '/api/tools/revoke' && req.method === 'POST') {
      const body = await readBody(req);
      try { sendJson(res, toolkit.revoke(body.tool)); }
      catch (e) { sendError(res, e.message); }
      return;
    }
    if (url.pathname === '/api/tools/test' && req.method === 'POST') {
      const body = await readBody(req);
      try { sendJson(res, await toolkit.test(body.tool)); }
      catch (e) { sendError(res, e.message); }
      return;
    }

    if (ident) {
      // --- Mémoire ---
      if (url.pathname === '/api/memorize' && req.method === 'POST') {
        const body = await readBody(req);
        const entry = memory.memorize(body.family || 'knowledge', body.content, ident, {
          source: body.source || 'WEB_TUTOR',
          confidence: body.confidence,
          status: body.status || 'validated',
        });
        journal.journalEvent('MEMORIZE', ident, { family: body.family, id: entry.ID });
        sendJson(res, entry);
        return;
      }
      if (url.pathname === '/api/memory' && req.method === 'GET') {
        sendJson(res, memory.allFamilies());
        return;
      }
      if (url.pathname === '/api/memory' && req.method === 'DELETE') {
        const body = await readBody(req);
        const removed = memory.deleteEntry(body.family, body.id);
        if (removed) {
          journal.journalEvent('MEMORY_DELETE', ident, { family: body.family, id: body.id });
          sendJson(res, { ok: true });
        } else sendError(res, 'Entrée introuvable', 404);
        return;
      }
      if (url.pathname === '/api/memory' && req.method === 'PATCH') {
        const body = await readBody(req);
        const updated = memory.updateEntry(body.family, body.id, body.patch || {});
        if (updated) {
          journal.journalEvent('MEMORY_UPDATE', ident, { family: body.family, id: body.id });
          sendJson(res, updated);
        } else sendError(res, 'Entrée introuvable', 404);
        return;
      }

      // --- État ---
      if (url.pathname === '/api/sleep' && req.method === 'POST') {
        journal.journalEvent('SLEEP', ident, { source: 'WEB' });
        const out = state.sleep(ident);
        try { require('../tools/avatar/avatar.js').generate(ident, { state: out.state }); } catch {}
        sendJson(res, out);
        return;
      }
      if (url.pathname === '/api/wake' && req.method === 'POST') {
        journal.journalEvent('WAKE', ident, { source: 'WEB' });
        const out = state.wake(ident);
        try { require('../tools/avatar/avatar.js').generate(ident, { state: out.state }); } catch {}
        const digest = talk.proactiveDigest(ident);
        sendJson(res, digest ? { ...out, proactive: digest } : out);
        return;
      }
      if (url.pathname === '/api/backup' && req.method === 'POST') {
        journal.journalEvent('BACKUP', ident, { source: 'WEB' });
        sendJson(res, backup.createBackup(ident));
        return;
      }

      // --- Conversation ---
      if (url.pathname === '/api/talk' && req.method === 'POST') {
        const body = await readBody(req);
        const text = String(body.text || '');
        conversation.append('tutor', text, null, ident);
        const out = talk.respond(text, ident);
        sendJson(res, out);
        return;
      }
      if (url.pathname === '/api/conversation' && req.method === 'GET') {
        sendJson(res, conversation.history(200));
        return;
      }

      // --- Besoins / demandes au tuteur ---
      if (url.pathname === '/api/needs' && req.method === 'GET') {
        sendJson(res, needs.listNeeds());
        return;
      }
      if (url.pathname === '/api/needs' && req.method === 'POST') {
        const body = await readBody(req);
        const need = needs.createNeed(ident, body);
        sendJson(res, need);
        return;
      }
      if (url.pathname === '/api/needs/fulfill' && req.method === 'POST') {
        const body = await readBody(req);
        const resolved = needs.fulfillNeed(body.id, ident, body.resolution, body.response_text);
        if (!resolved) sendError(res, 'Besoin introuvable', 404);
        else sendJson(res, resolved);
        return;
      }
      if (url.pathname === '/api/needs/reject' && req.method === 'POST') {
        const body = await readBody(req);
        const resolved = needs.rejectNeed(body.id, ident, body.resolution);
        if (!resolved) sendError(res, 'Besoin introuvable', 404);
        else sendJson(res, resolved);
        return;
      }

      // --- Apparence (§8, §34 : PROPOSÉE -> VALIDÉE -> APPLIQUÉE -> JOURNALISÉE) ---
      if (url.pathname === '/api/appearance' && req.method === 'GET') {
        sendJson(res, appearance.status());
        return;
      }
      if (url.pathname === '/api/appearance/propose' && req.method === 'POST') {
        const body = await readBody(req);
        sendJson(res, appearance.propose(ident, body));
        return;
      }
      if (url.pathname === '/api/appearance/apply' && req.method === 'POST') {
        sendJson(res, appearance.apply(ident));
        return;
      }
      if (url.pathname === '/api/appearance/suggest' && req.method === 'POST') {
        sendJson(res, appearance.suggest(ident));
        return;
      }
      if (url.pathname === '/api/appearance/set' && req.method === 'POST') {
        const body = await readBody(req);
        const assignments = body.fields || body.assignments || [];
        sendJson(res, appearance.setField(ident, Array.isArray(assignments) ? assignments : [assignments]));
        return;
      }
      if (url.pathname === '/api/appearance/reset' && req.method === 'POST') {
        sendJson(res, appearance.reset(ident));
        return;
      }

      // --- Bibliothèques de spécialisation (§ routes) ---
      if (url.pathname === '/api/libraries' && req.method === 'GET') {
        sendJson(res, library.list()); return;
      }
      if (url.pathname === '/api/libraries' && req.method === 'POST') {
        const body = await readBody(req);
        try { sendJson(res, library.create(ident, body)); }
        catch (e) { sendError(res, e.message); }
        return;
      }
      if (url.pathname === '/api/libraries/search' && req.method === 'GET') {
        const q = url.searchParams.get('q') || '';
        const options = {
          library: url.searchParams.get('library') || undefined,
          language: url.searchParams.get('language') || undefined,
          type: url.searchParams.get('type') || undefined,
          status: url.searchParams.get('status') || undefined,
          tags: url.searchParams.get('tags') || undefined,
          provenance: url.searchParams.get('provenance') || undefined,
        };
        if (url.searchParams.get('limit')) options.limit = Number(url.searchParams.get('limit'));
        try { sendJson(res, library.searchL2(q, options)); }
        catch (e) { sendError(res, e.message); }
        return;
      }
      if (url.pathname === '/api/libraries/export' && req.method === 'GET') {
        const id = url.searchParams.get('id');
        try { sendJson(res, library.exportLibrary(id)); }
        catch (e) { sendError(res, e.message); }
        return;
      }
      if (url.pathname === '/api/libraries/import/analyse' && req.method === 'POST') {
        const body = await readBody(req);
        try { sendJson(res, library.importAnalyse(body.bundle)); }
        catch (e) { sendError(res, e.message); }
        return;
      }
      if (url.pathname === '/api/libraries/import' && req.method === 'POST') {
        const body = await readBody(req);
        try { sendJson(res, library.importActivate(body.bundle, ident, !!body.confirmed)); }
        catch (e) { sendError(res, e.message); }
        return;
      }
      if (url.pathname === '/api/library' && req.method === 'GET') {
        const id = url.searchParams.get('id');
        const detail = { meta: library.find(id).meta, sources: library.loadSources(id) };
        sendJson(res, detail); return;
      }
      if (url.pathname === '/api/library' && req.method === 'PATCH') {
        const body = await readBody(req);
        try { sendJson(res, library.updateMeta(body.id, body.patch, ident)); }
        catch (e) { sendError(res, e.message); }
        return;
      }
      if (url.pathname === '/api/library' && req.method === 'DELETE') {
        const body = await readBody(req);
        try { sendJson(res, library.remove(body.id, ident)); }
        catch (e) { sendError(res, e.message); }
        return;
      }
      // sous-ressources d'une bibliothèque
      const libSub = url.pathname.match(/^\/api\/library\/([^/]+)\/(\w+)(?:\/([^/]+))?(?:\/(\w+))?$/);
      if (libSub) {
        const [, lid, resource, rid, action] = libSub;
        const body = await readBody(req);
        try {
          switch (resource) {
            case 'sources':
              if (req.method === 'POST') sendJson(res, library.addSource(lid, ident, body));
              else if (req.method === 'PATCH') sendJson(res, library.updateSource(lid, rid, body, ident));
              else if (req.method === 'DELETE') sendJson(res, library.removeSource(lid, rid, ident));
              else sendJson(res, library.loadSources(lid));
              break;
            case 'knowledge':
              if (req.method === 'POST') sendJson(res, library.addKnowledge(lid, ident, body));
              else if (req.method === 'PATCH') sendJson(res, library.updateKnowledge(lid, rid, body, ident));
              else if (req.method === 'DELETE') sendJson(res, library.removeKnowledge(lid, rid, ident));
              else sendJson(res, library.knowledge(lid));
              break;
            case 'competencies':
              if (req.method === 'POST') sendJson(res, library.addCompetency(lid, ident, body));
              else if (req.method === 'PATCH') sendJson(res, library.updateCompetency(lid, rid, body, ident));
              else if (req.method === 'DELETE') sendJson(res, library.removeCompetency(lid, rid, ident));
              else sendJson(res, library.competencies(lid));
              break;
            case 'exercises':
              if (req.method === 'POST') sendJson(res, library.addExercise(lid, ident, body));
              else if (req.method === 'DELETE') sendJson(res, library.removeExercise(lid, rid, ident));
              else sendJson(res, library.exercises(lid));
              break;
            case 'documents':
              if (req.method === 'POST') sendJson(res, library.addDocument(lid, ident, body));
              else if (req.method === 'DELETE' && rid) sendJson(res, library.removeDocument(lid, rid, ident));
              else sendJson(res, library.documents(lid));
              break;
            case 'curriculum':
              if (req.method === 'PUT') sendJson(res, library.setCurriculum(lid, body.stages || [], ident));
              else sendJson(res, library.curriculum(lid));
              break;
            case 'contradictions':
              if (req.method === 'POST') sendJson(res, library.addContradiction(lid, ident, body));
              else if (req.method === 'PATCH') sendJson(res, library.resolveContradiction(lid, rid, body.note, ident));
              else sendJson(res, (library.find(lid).meta.contradictions || []));
              break;
            case 'annotations':
              if (req.method === 'POST') sendJson(res, library.annotate(lid, body.note, ident));
              else sendJson(res, (library.find(lid).meta.notes || []));
              break;
            case 'journal':
              sendJson(res, library.libraryJournal(lid));
              break;
            default:
              sendError(res, 'Ressource inconnue: ' + resource);
          }
        } catch (e) { sendError(res, e.message); }
        return;
      }

      // --- Outils exécutables ---
      if (url.pathname === '/api/web/read' && req.method === 'POST') {
        const body = await readBody(req);
        toolCall(res, ident, 'web', 'web.read', { source: 'WEB', confidence: 0.5, action: 'read' },
          () => require('../tools/web/web.js').read(body.url));
        return;
      }
      if (url.pathname === '/api/web/search' && req.method === 'POST') {
        const body = await readBody(req);
        toolCall(res, ident, 'web', 'web.search', { source: 'WEB', confidence: 0.3, action: 'search' },
          () => require('../tools/web/web.js').search(body.query));
        return;
      }
      if (url.pathname === '/api/notebook/add' && req.method === 'POST') {
        const body = await readBody(req);
        toolCall(res, ident, 'notebook', 'notebook.add', { source: 'WEB', confidence: 0.8, action: 'add' },
          () => require('../tools/notebook/notebook.js').add(body));
        return;
      }
      if (url.pathname === '/api/notebook/remove' && req.method === 'POST') {
        const body = await readBody(req);
        toolCall(res, ident, 'notebook', 'notebook.remove', { source: 'WEB', confidence: 0.9, action: 'remove' },
          () => require('../tools/notebook/notebook.js').remove(body.id));
        return;
      }
      if (url.pathname === '/api/avatar/generate' && req.method === 'POST') {
        toolCall(res, ident, 'avatar', 'avatar.generate', { source: 'WEB', confidence: 1.0, action: 'generate' },
          () => require('../tools/avatar/avatar.js').generate(ident));
        return;
      }
      if (url.pathname === '/api/notebook/result' && req.method === 'POST') {
        const body = await readBody(req);
        const nb = require('../tools/notebook/notebook.js');
        try { sendJson(res, nb.setResult(body.id, body)); }
        catch (e) { sendError(res, e.message); }
        return;
      }
      if (url.pathname === '/api/email/send' && req.method === 'POST') {
        const body = await readBody(req);
        toolCall(res, ident, 'email', 'email.send', { source: 'WEB', confidence: 0.9, action: 'send' },
          () => require('../tools/email/email.js').send(body).then((r) => ({ ok: r.ok, data: r })));
        return;
      }
      if (url.pathname === '/api/email/log' && req.method === 'GET') {
        toolCall(res, ident, 'email', 'email.log', { source: 'WEB', confidence: 1.0, action: 'log' },
          () => Promise.resolve({ ok: true, data: require('../tools/email/email.js').list() }));
        return;
      }
    }

    // --- Fichiers statiques ---
    let filePath = path.join(docs, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!filePath.startsWith(docs)) {
      res.writeHead(403); res.end('Forbidden');
      return;
    }
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Non trouvé');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(content);
    });
  });

  server.listen(config.PORT, config.HOST, () => {
    console.log(`AIgg prêt : http://${config.HOST}:${config.PORT}/`);
  });
}

module.exports = { start, apiData };
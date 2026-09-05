'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const WEB_DIR = __dirname;

function cleanText(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHttpUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function readProviders() {
  const file = path.join(WEB_DIR, 'providers.json');
  if (fs.existsSync(file)) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  return { search: [] };
}

async function read(rawUrl, timeoutMs) {
  if (!isHttpUrl(rawUrl)) {
    return { ok: false, url: rawUrl, error: 'URL invalide (http/https requis)' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 15000);
  try {
    const res = await fetch(rawUrl, { signal: controller.signal, redirect: 'follow', headers: { 'User-Agent': 'AIgg/0.1 (+incubateur local)' } });
    const body = await res.text();
    const size = body.length;
    let snippet = cleanText(body).slice(0, 1200);
    clearTimeout(timer);
    return {
      ok: res.ok,
      url: rawUrl,
      status: res.status,
      size,
      snippet,
      fetched_at: new Date().toISOString(),
      confidence: 'medium',
      note: 'Vérité non automatique : à recouper avec d’autres sources.',
    };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, url: rawUrl, error: err.message };
  }
}

async function search(query, options) {
  const opts = options || {};
  const providerName = opts.provider || 'ddg';
  const providers = readProviders().search;
  let provider = providers.find((p) => p.name === providerName);

  // Fournisseur par défaut sans clé : DuckDuckGo (HTML lite).
  if (!provider && providerName === 'ddg') {
    provider = { name: 'ddg', type: 'html', endpoint: 'https://html.duckduckgo.com/html/' };
  }

  if (!provider) {
    return {
      ok: false,
      error: `Aucun fournisseur '${providerName}'. Ajoute-le dans tools/web/providers.json (jamais de clé dans Git).`,
      results: [],
    };
  }

  try {
    if (provider.type === 'html') {
      const res = await fetch(provider.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (AIgg)' },
        body: 'q=' + encodeURIComponent(query),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, results: [] };
      const html = await res.text();
      const results = parseDdg(html, query);
      return {
        ok: results.length > 0,
        provider: providerName,
        query,
        results: results.slice(0, opts.limit || 8),
        confidence: 'low',
        note: 'Résultats bruts : à comparer et vérifier.',
      };
    }
    return { ok: false, error: 'Fournisseur non pris en charge: ' + provider.type, results: [] };
  } catch (err) {
    return { ok: false, error: err.message, results: [] };
  }
}

function parseDdg(html, query) {
  const results = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 12) {
    const url = decodeURIComponent(stripDdgRedirect(m[1]));
    const title = cleanText(m[2]);
    results.push({ title, url });
  }
  return results;
}

function stripDdgRedirect(href) {
  try {
    const u = new URL(href);
    const listed = u.searchParams.get('uddg');
    if (listed) return listed;
    return href;
  } catch { return href; }
}

async function runTest() {
  // Test web.read sur un serveur HTTP local (aucune dépendance réseau).
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<html><body><p>Bonjour, petit AIgg test.</p></body></html>');
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', async () => {
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}/`;
      const r = await read(url);
      server.close();
      if (r.ok && r.snippet && r.status === 200) {
        resolve({ status: 'PASS', note: `web.read local OK (${r.size} octets)`, detail: { snippet: r.snippet.slice(0, 80) } });
      } else {
        resolve({ status: 'FAIL', note: r.error || 'réponse inattendue', detail: r });
      }
    });
  });
}

module.exports = { read, search, runTest, cleanText };
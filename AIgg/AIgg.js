'use strict';

const readline = require('readline');

const config = require('./src/config');
const identity = require('./src/identity');
const state = require('./src/state');
const memory = require('./src/memory');
const journal = require('./src/journal');
const capabilities = require('./src/capabilities');
const permissions = require('./src/permissions');
const senses = require('./src/senses');
const backup = require('./src/backup');
const toolkit = require('./src/toolkit');
const contract = require('./src/contract');
const migrate = require('./src/migrate');
const library = require('./src/library');
const vault = require('./src/vault');

const { PATHS, PORT, DEFAULT_FIRST_NAME } = config;

function showProblem(problem, cause, solution, etat) {
  console.log('PROBLÈME : ' + problem);
  console.log('CAUSE    : ' + cause);
  console.log('SOLUTION : ' + solution);
  console.log('ÉTAT     : ' + etat);
}

function greet() {
  console.log('==============================================');
  console.log('       AIgg — œuf numérique minimal');
  console.log('==============================================');
}

function isTTY() {
  return Boolean(process.stdin.isTTY);
}

function readAllStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data));
  });
}

async function collectAnswers(questions) {
  if (isTTY()) {
    return await new Promise((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answers = [];
      const next = (i) => {
        if (i >= questions.length) { rl.close(); resolve(answers); return; }
        rl.question(questions[i], (a) => { answers.push(String(a || '').trim()); next(i + 1); });
      };
      next(0);
    });
  }
  const data = await readAllStdin();
  const lines = data.split(/\r?\n/);
  return questions.map((q, i) => (lines[i] || '').trim());
}

async function birth() {
  greet();

  const [name, tutorName, tutorEmail, tutorInfo] = await collectAnswers([
    `Comment veux-tu appeler ton AIgg ? [${DEFAULT_FIRST_NAME}] `,
    'Qui sera mon tuteur ? [Nom] ',
    'Adresse e-mail du tuteur : ',
    'Informations facultatives sur le tuteur : ',
  ]);

  const { identity: ident, certificate } = identity.createIdentity({
    name,
    tutorName,
    tutorEmail,
    tutorInfo,
  });

  journal.journalEvent('BIRTH', ident, { detail: 'Naissance enregistrée' });
  capabilities.loadCapabilities();
  permissions.loadPermissions();
  state.wake(ident);

  console.log('\nActe de naissance enregistré :');
  console.log(JSON.stringify(certificate, null, 2));
  console.log(`\nAIgg est éveillé. Interface : http://${config.HOST}:${PORT}/`);
}

function summary(ident) {
  const status = state.status(ident);
  const caps = capabilities.detectCapabilities();
  const perms = permissions.loadPermissions();
  const senseList = senses.detectSenses();

  console.log('\n--- QUI SUIS-JE ---');
  console.log(`Nom        : ${ident.AIgg_NAME}`);
  console.log(`AIgg_ID    : ${ident.AIgg_ID}`);
  console.log(`Tuteur     : ${ident.TUTOR_NAME} <${ident.TUTOR_EMAIL}>`);
  console.log(`Né le      : ${ident.BIRTH_DATE} (${ident.TIMEZONE})`);
  console.log(`État       : ${status.state}`);
  console.log(`Réveils    : ${status.wake_count}`);
  console.log(`Âge        : ${status.age.days} j, ${status.age.hours} h, ${status.age.minutes} min`);

  console.log('\n--- CAPACITÉS ---');
  for (const c of caps) console.log(`[${c.acquired ? 'OUI' : 'NON'}] ${c.name} — ${c.description}`);

  console.log('\n--- PERMISSIONS ---');
  for (const [k, v] of Object.entries(perms.scope)) console.log(`${k}: ${v}`);
  for (const [k, v] of Object.entries(perms.tools)) console.log(`tool:${k}: ${v.authorized}`);

  console.log('\n--- OUTILS ---');
  const tools = toolkit.discoverAll();
  for (const t of tools) {
    console.log(`${t.name}: [${t.status}] autorisé=${t.authorized} test=${t.last_test ? t.last_test.status : '-'}`);
  }

  console.log('\n--- SENS ---');
  console.log(senses.senseStatusText(senseList));

  console.log('\n--- MÉMOIRE ---');
  for (const [k, v] of Object.entries(memory.summary())) console.log(`${k}: ${v}`);
}

function printToolsList() {
  const tools = toolkit.discoverAll();
  console.log('OUTILS DÉCOUVERTS');
  for (const t of tools) {
    const test = t.last_test ? t.last_test.status : 'NOT_TESTED';
    console.log(`- ${t.name} (${t.version}) [${t.status}] autorisé=${t.authorized} test=${test}`);
    console.log(`  ${t.title} — capacité: ${t.capability}`);
  }
}

function printProposal(toolName) {
  const p = toolkit.propose(toolName);
  console.log(JSON.stringify(p, null, 2));
}

async function runWebRead(ident, url) {
  const tool = toolkit.findManifest('web');
  const out = await contract.executeTool(ident, tool.manifest, 'web.read', {
    source: 'CLI',
    confidence: 0.5,
    action: 'read',
    async execute(contract) {
      const web = toolkit.loadModule('web').module;
      const r = await web.read(url);
      return { ok: r.ok, data: r };
    },
  });
  if (!out.ok) {
    showProblem(
      'Lecture impossible.',
      out.blocked === 'PERMISSION' ? 'Permission refusée pour l\'outil web.' : out.reason,
      `Commande : AIgg.cmd authorize web ; puis AIgg.cmd install web`,
      `BLOCKED:${out.blocked}`
    );
    return;
  }
  const r = out.result.data;
  if (!r.ok) {
    showProblem('Lecture impossible.', r.error || 'réponse en erreur', 'Vérifie l\'URL et l\'accès réseau.', 'FAIL');
    return;
  }
  console.log(`HTTP ${r.status} — ${r.size} octets — confiance ${r.confidence}`);
  console.log(r.snippet);
  console.log('\n(Note : une information trouvée n\'est pas automatiquement une vérité.)');
}

async function runWebSearch(ident, query) {
  const tool = toolkit.findManifest('web');
  const out = await contract.executeTool(ident, tool.manifest, 'web.search', {
    source: 'CLI',
    confidence: 0.3,
    action: 'search',
    async execute() {
      const web = toolkit.loadModule('web').module;
      const r = await web.search(query);
      return { ok: r.ok, data: r };
    },
  });
  if (!out.ok) {
    showProblem(
      'Recherche impossible.',
      out.blocked === 'PERMISSION' ? 'Permission refusée pour l\'outil web.' : out.reason,
      `Commande : AIgg.cmd authorize web ; puis AIgg.cmd install web`,
      `BLOCKED:${out.blocked}`
    );
    return;
  }
  const r = out.result.data;
  if (!r.ok || !r.results.length) {
    showProblem('Aucun résultat.', r.error || 'fournisseur sans réponse', 'Réseau requis + fournisseur dans tools/web.', 'FAIL');
    return;
  }
  r.results.forEach((res, i) => console.log(`${i + 1}. ${res.title}\n   ${res.url}`));
  console.log(`\n(Confiance low : résultats bruts, à comparer et vérifier.)`);
}

async function runNotebookAdd(ident, question, hypothesis) {
  const tool = toolkit.findManifest('notebook');
  const out = await contract.executeTool(ident, tool.manifest, 'notebook.add', {
    source: 'CLI',
    confidence: 0.8,
    action: 'add',
    async execute() {
      const nb = toolkit.loadModule('notebook').module;
      return { ok: true, data: nb.add({ question, hypothesis }) };
    },
  });
  console.log(JSON.stringify(out, null, 2));
}

async function runNotebookDel(ident, id) {
  const tool = toolkit.findManifest('notebook');
  const out = await contract.executeTool(ident, tool.manifest, 'notebook.remove', {
    source: 'CLI',
    confidence: 0.9,
    action: 'remove',
    async execute() {
      const nb = toolkit.loadModule('notebook').module;
      return { ok: true, data: nb.remove(id) };
    },
  });
  console.log(JSON.stringify(out, null, 2));
}

async function runAvatar(ident) {
  const tool = toolkit.findManifest('avatar');
  const out = await contract.executeTool(ident, tool.manifest, 'avatar.generate', {
    source: 'CLI',
    confidence: 1.0,
    action: 'generate',
    async execute() {
      const avatar = toolkit.loadModule('avatar').module;
      return { ok: true, data: avatar.generate(ident) };
    },
  });
  console.log(JSON.stringify(out, null, 2));
}

function flags(args) {
  const fl = {};
  const rest = [];
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) fl[m[1]] = m[2];
    else if (/^--[^=]+$/.test(a)) fl[a.slice(2)] = true;
    else rest.push(a);
  }
  return { flags: fl, rest };
}

const LIBRARY_HELP_FR = [
  'AIgg — aide de `library` (français)',
  '',
  'Commande :',
  '  AIgg.cmd library <commande> [arguments] [options]',
  '',
  'ALIAS :',
  '  AIgg.cmd libraries ...',
  '  AIgg.cmd lib ...',
  '',
  'DÉCOUVERTE',
  '  list                Liste les bibliothèques.',
  '  health              Vérifie la structure générale des bibliothèques locales.',
  '  show <id>           Affiche le résumé d\'une bibliothèque.',
  '  sources <id>        Liste ses sources.',
  '  knowledge <id>      Liste ses connaissances.',
  '  competencies <id>   Liste ses compétences. Alias : competences',
  '  curriculum <id>     Affiche le curriculum.',
  '  exercises <id>      Liste ses exercices. Alias : exercices',
  '  notes <id>          Affiche les notes du tuteur.',
  '  journal <id>        Affiche le journal local.',
  '',
  'CRÉATION',
  '  create <nom> [--domain=a,b] [--private|--public] [--level=x]',
  '  Exemple : AIgg.cmd library create Maths --domain=maths --private',
  '  Une bibliothèque est privée par défaut dans le modèle AIgg.',
  '',
  'RECHERCHE',
  '  search <requête> [--library=<id>] [--language=fr|en|es]',
  '        [--type=connaissance|source|document] [--status=ETAT]',
  '        [--tags=<mot>] [--provenance=<ref>] [--limit=n]',
  '  Exemple : AIgg.cmd library search photosynthèse',
  '  Niveau actuel : recherche niveau 2 — multilingue (FR/EN/ES), normalisation',
  '  des accents, classement expliqué, filtres par bibliothèque/langue/type/statut.',
  '',
  'SOURCES',
  '  source-add <id> <titre> [--trust=A-E] [--type=TYPE] [--url=url]',
  '  Exemple : AIgg.cmd library source-add maths "Cours de fractions" --trust=A --type=COURS',
  '',
  'CONNAISSANCES',
  '  knowledge-add <id> <contenu> [--source=<id>] [--status=ETAT]',
  '  États de connaissance :',
  '    UNKNOWN, DISCOVERED, LEARNING, UNDERSTOOD, REQUIRES_REVIEW',
  '',
  'COMPÉTENCES',
  '  competence-add <id> <nom>',
  '  competence-set <id> <compétence> <ETAT>',
  '  États possibles :',
  '    UNKNOWN, LEARNING, PRACTICED, PARTIALLY_MASTERED, MASTERED, REQUIRES_REVIEW',
  '  Règle : lire une connaissance ou importer un document ne suffit jamais à',
  '  déclarer automatiquement une compétence MASTERED.',
  '',
  'ANNOTATIONS ET CONTRADICTIONS',
  '  note-add <id> <texte>',
  '  contradiction-add <id> <connaissanceA> <connaissanceB>',
  '',
  'GESTION',
  '  archive <id> | restore <id> | remove <id> | trash',
  '  remove déplace la bibliothèque dans la corbeille `_trash` :',
  '  il ne s\'agit pas d\'une suppression irréversible immédiate.',
  '',
  'EXPORT',
  '  export <id>   Produit une représentation `aigg-library` destinée à l\'échange.',
  '',
  'IMPORT',
  '  import --file=<fichier> [--confirm]',
  '  Par défaut : affiche un aperçu (analyse) sans rien modifier.',
  '  Avec --confirm : importe dans une bibliothèque locale ; remplace une',
  '  bibliothèque existante portant le même identifiant.',
  '',
  'OPTIONS',
  '  --domain=a,b | --private | --public | --level=x',
  '  --trust=A-E | --type=TYPE | --url=url | --source=<id> | --status=ETAT',
  '  --library=<id> | --language=xx | --tags=<mot> | --provenance=<ref> | --limit=n',
  '',
  'PRINCIPES DE SÉCURITÉ',
  '  - Les bibliothèques privées ne doivent pas être publiées.',
  '  - Les documents importés ne sont jamais exécutés.',
  '  - Le code contenu dans un document n\'est jamais exécuté.',
  '  - La provenance des connaissances doit rester conservée.',
  '  - Une IA externe n\'est jamais nécessaire pour utiliser une bibliothèque.',
  '  - Les actions destructives doivent rester révocables ou explicites.',
  '',
  'AIDE COURTE',
  '  AIgg.cmd library',
  '  AIgg.cmd library list',
  '  AIgg.cmd library health',
  '  AIgg.cmd library search "mot clé"',
  '  AIgg.cmd library create Maths --domain=maths --private',
  '  AIgg.cmd library show <id>',
  '',
  'Documentation longue : AIgg/docs/LIBRARIES.md',
].join('\n');

const EMAIL_HELP_FR = [
  'AIgg — aide de `email` (français)',
  '',
  'Commande :',
  '  AIgg.cmd email <commande> [arguments] [options]',
  '',
  'ENVOI (action externe réelle)',
  '  send --to=dest@example.test --subject="Sujet" --body="Corps"',
  '       [--host=smtp.x --port=25 --from=expediteur@x --timeout_ms=10000]',
  '       Envoie un message via le serveur SMTP configuré (RFC 5321, natif).',
  '',
  'OBSERVATION',
  '  status   État de la configuration SMTP et du carnet de sortie.',
  '  log      Liste les envois tracés (outbox/, dossier privé).',
  '',
  'CONFIGURATION (jamais de secret dans Git)',
  '  tools/email/config.json : { "host": "...", "port": 25, "from": "...", "timeout_ms": 10000 }',
  '  L\'outil est bloqué par défaut :',
  '    AIgg.cmd authorize email',
  '    AIgg.cmd install email',
  '',
  'EXEMPLES',
  '  AIgg.cmd email status',
  '  AIgg.cmd email send --to=robin@example.test --subject="Bonjour" --body="Message"',
  '  AIgg.cmd email send --to=a@b.test --subject="Test" --body="T" --host=127.0.0.1 --port=2525',
  '',
  'Limites honnêtes (v0.3.0) : réception (IMAP), AUTH et STARTTLS non',
  'implémentés ; l\'envoi est tracé dans outbox/ (privé).',
].join('\n');

async function runEmail(ident, args) {
  const { flags: fl, rest } = flags(args);
  const sub = rest[0];
  const email = toolkit.loadModule('email').module;

  switch (sub) {
    case 'send': {
      const tool = toolkit.findManifest('email');
      const out = await contract.executeTool(ident, tool.manifest, 'email.send', {
        source: 'CLI',
        confidence: 0.9,
        action: 'send',
        async execute() {
          const r = await email.send({
            to: fl.to,
            subject: fl.subject,
            body: fl.body,
            host: fl.host,
            port: fl.port ? Number(fl.port) : undefined,
            from: fl.from,
            timeout_ms: fl.timeout_ms ? Number(fl.timeout_ms) : undefined,
          });
          return { ok: r.ok, data: r };
        },
      });
      if (!out.ok) {
        showProblem(
          'Envoi impossible.',
          out.blocked === 'PERMISSION' ? 'Permission refusée pour l\'outil email.' : out.reason,
          'Commande : AIgg.cmd authorize email ; puis AIgg.cmd install email',
          `BLOCKED:${out.blocked}`
        );
        return;
      }
      const r = out.result.data;
      if (!r.ok) {
        showProblem('Envoi en échec.', r.error || 'erreur SMTP', 'Vérifie la config tools/email/config.json et le serveur SMTP.', 'FAIL');
        return;
      }
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'status':
      console.log(JSON.stringify(email.status(), null, 2));
      break;
    case 'log':
      console.log(JSON.stringify(email.list(), null, 2));
      break;
    default:
      console.log(EMAIL_HELP_FR);
  }
}

const GMAIL_HELP_FR = [
  'AIgg — aide de `gmail` (français)',
  '',
  'But : connecteur Gmail via l\'API Google, à scopes minimaux (moindre',
  'privilège). Le token et les scopes accordés vivent dans le coffre local',
  '(vault), jamais dans Git, l\'aide, la mémoire ou le journal.',
  '',
  'PRÉPARATION (par le tuteur, jamais par l\'IA)',
  '  1. Crée un projet Google Cloud + identifiants OAuth2 (client) côté Google.',
  '  2. Range le access token et les scopes dans le coffre :',
  '       $env:AIGG_VAULT_PASSWORD="..." ; AIgg.cmd vault put gmail.access_token "<token>"',
  '       $env:AIGG_VAULT_PASSWORD="..." ; AIgg.cmd vault put gmail.scopes "[\"...\"]"',
  '  3. Autorise et installe l\'outil :',
  '       AIgg.cmd authorize gmail',
  '       AIgg.cmd install gmail',
  '',
  'COMMANDES',
  '  status                     État du connecteur (base API, scopes présents, opérations possibles).',
  '  list [--max=10]            Métadonnées des messages (scope gmail.metadata).',
  '  read --id=<id> [--format=metadata|full]',
  '                             Lire un message (corps complet : scope gmail.readonly).',
  '  send --to=dest@x --from=exp@y --subject="S" --body="... "',
  '                             Envoyer (scope gmail.send) — tracé dans outbox/.',
  '',
  'SECRETS ET SÉCURITÉ',
  '  - Le mot de passe du coffre est fourni à chaque commande (--password= ou',
  '    AIGG_VAULT_PASSWORD) ; il n\'est jamais stocké ni journalisé.',
  '  - Aucun token n\'est affiché par ces commandes.',
  '  - Scope minimal par défaut : gmail.metadata. Lecture corps complet et',
  '    envoi exigent des scopes supplémentaires accordés par Google.',
  '  - Révoquer : AIgg.cmd revoke gmail (permission) ; retirer le token du coffre : vault rm gmail.access_token',
  '',
  'Limites honnêtes (v0.3.2) : connecteur testé contre une API Gmail simulée',
  'locale (aucun secret réel) ; l\'accès réel exige les identifiants OAuth2 du',
  'tuteur repris dans le coffre.',
].join('\n');

async function runGmail(ident, args) {
  const { flags: fl, rest } = flags(args);
  const sub = rest[0] || 'help';
  const gmailMod = toolkit.loadModule('gmail').module;
  const password = fl.password !== undefined ? fl.password : process.env.AIGG_VAULT_PASSWORD;

  switch (sub) {
    case 'status': {
      const tool = toolkit.findManifest('gmail');
      const out = await contract.executeTool(ident, tool.manifest, 'gmail.status', {
        source: 'CLI',
        confidence: 0.9,
        action: 'status',
        async execute() {
          return { ok: true, data: gmailMod.status(password) };
        },
      });
      if (!out.ok) {
        showProblem('Statut indisponible.', out.blocked === 'PERMISSION' ? 'Permission refusée pour l\'outil gmail.' : out.reason, 'AIgg.cmd authorize gmail ; puis AIgg.cmd install gmail', `BLOCKED:${out.blocked}`);
        return;
      }
      console.log(JSON.stringify(out.result.data, null, 2));
      break;
    }
    case 'list': {
      const tool = toolkit.findManifest('gmail');
      const out = await contract.executeTool(ident, tool.manifest, 'gmail.list', {
        source: 'CLI',
        confidence: 0.9,
        action: 'list',
        async execute() {
          const r = await gmailMod.list({ password, max: fl.max ? Number(fl.max) : undefined });
          return { ok: r.ok, data: r };
        },
      });
      if (!out.ok) { showProblem('Liste impossible.', out.blocked === 'PERMISSION' ? 'Permission refusée.' : out.reason, 'AIgg.cmd authorize gmail ; puis AIgg.cmd install gmail', `BLOCKED:${out.blocked}`); return; }
      const r = out.result.data;
      if (!r.ok) { showProblem('Liste impossible.', r.error || 'erreur API', 'Vérifie le token dans le coffre (vault status) et les scopes.', 'FAIL'); return; }
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'read': {
      const tool = toolkit.findManifest('gmail');
      const out = await contract.executeTool(ident, tool.manifest, 'gmail.read', {
        source: 'CLI',
        confidence: 0.9,
        action: 'read',
        async execute() {
          const r = await gmailMod.read({ password, id: fl.id, format: fl.format });
          return { ok: r.ok, data: r };
        },
      });
      if (!out.ok) { showProblem('Lecture impossible.', out.blocked === 'PERMISSION' ? 'Permission refusée.' : out.reason, 'AIgg.cmd authorize gmail ; puis AIgg.cmd install gmail', `BLOCKED:${out.blocked}`); return; }
      const r = out.result.data;
      if (!r.ok) { showProblem('Lecture impossible.', r.error || 'erreur API', 'Vérifie le token, les scopes et l\'id du message.', 'FAIL'); return; }
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'send': {
      const tool = toolkit.findManifest('gmail');
      const out = await contract.executeTool(ident, tool.manifest, 'gmail.send', {
        source: 'CLI',
        confidence: 0.9,
        action: 'send',
        async execute() {
          const r = await gmailMod.send({ password, to: fl.to, from: fl.from, subject: fl.subject, body: fl.body });
          return { ok: r.ok, data: r };
        },
      });
      if (!out.ok) { showProblem('Envoi impossible.', out.blocked === 'PERMISSION' ? 'Permission refusée pour l\'outil gmail.' : out.reason, 'AIgg.cmd authorize gmail ; puis AIgg.cmd install gmail', `BLOCKED:${out.blocked}`); return; }
      const r = out.result.data;
      if (!r.ok) { showProblem('Envoi en échec.', r.error || 'erreur API', 'Vérifie le token, les scopes et la config tools/gmail/config.json.', 'FAIL'); return; }
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    default:
      console.log(GMAIL_HELP_FR);
  }
}

const IA_HELP_FR = [
  'AIgg — aide de `ia` (français)',
  '',
  'But : consulter une IA externe comme SIMPLE OUTIL — jamais comme cerveau',
  'd\'AIgg. Endpoint compatible « chat completions » (ex. OpenAI). Le prompt',
  'part vers un tiers, la réponse est marquée EXTERNAL_IA, jamais mémorisée',
  'automatiquement, toujours à vérifier. Chaque demande est tracée dans',
  'outbox/ (sans clé).',
  '',
  'PRÉPARATION (par le tuteur, jamais par l\'IA)',
  '  1. Crée une clé d\'API auprès du fournisseur choisi.',
  '  2. Range-la dans le coffre local (jamais dans Git) :',
  '       $env:AIGG_VAULT_PASSWORD="..." ; AIgg.cmd vault put ia.api_key "<clé>"',
  '       (clé propre à un fournisseur : vault put ia.api_key.<provider> "<clé>")',
  '  3. Autorise et installe l\'outil :',
  '       AIgg.cmd authorize ia',
  '       AIgg.cmd install ia',
  '  (Config : tools/ia/config.json pour la base/modèle par défaut ; fournisseurs',
  '  additionnels dans tools/ia/providers.json — tous deux ignorés par Git,',
  '  jamais de clé dedans.)',
  '',
  'COMMANDES',
  '  status                     État (fournisseurs, config des clés présentes ?).',
  '  ask --prompt="..." [--provider=...] [--system="..."] [--model=...] [--max-tokens=...]',
  '                             Demande EXTERNE : seule source EXTERNAL_IA, à vérifier.',
  '                             (provider : nom d\'un fournisseur de providers.json)',
  '  log                        Tracé outbox/ des demandes (prompt, fournisseur, statut).',
  '',
  'SECRETS ET SÉCURITÉ',
  '  - Le mot de passe du coffre est fourni à chaque commande (--password= ou',
  '    AIGG_VAULT_PASSWORD) ; il n\'est jamais stocké ni journalisé.',
  '  - Aucune clé d\'API n\'est affichée par ces commandes ni écrite dans outbox/.',
  '  - Révoquer : AIgg.cmd revoke ia (permission) ; retirer la clé : vault rm ia.api_key',
  '',
  'Limite honnête (v0.3.11) : connecteur testé contre des endpoints simulés',
  'locaux (aucun secret réel) ; les clés réelles viennent du tuteur.',
].join('\n');

async function runIa(ident, args) {
  const { flags: fl, rest } = flags(args);
  const sub = rest[0] || 'help';
  const iaMod = toolkit.loadModule('ia').module;
  const password = fl.password !== undefined ? fl.password : process.env.AIGG_VAULT_PASSWORD;

  switch (sub) {
    case 'status': {
      const tool = toolkit.findManifest('ia');
      const out = await contract.executeTool(ident, tool.manifest, 'ia.status', {
        source: 'CLI',
        confidence: 0.9,
        action: 'status',
        async execute() {
          return { ok: true, data: iaMod.status(password) };
        },
      });
      if (!out.ok) {
        showProblem('Statut indisponible.', out.blocked === 'PERMISSION' ? 'Permission refusée pour l\'outil ia.' : out.reason, 'AIgg.cmd authorize ia ; puis AIgg.cmd install ia', `BLOCKED:${out.blocked}`);
        return;
      }
      console.log(JSON.stringify(out.result.data, null, 2));
      break;
    }
    case 'ask': {
      const tool = toolkit.findManifest('ia');
      const out = await contract.executeTool(ident, tool.manifest, 'ia.ask', {
        source: 'CLI',
        confidence: 0.5,
        action: 'ask',
        async execute() {
          const r = await iaMod.ask({
            password,
            prompt: fl.prompt,
            system: fl.system,
            provider: fl.provider,
            model: fl.model,
            max_tokens: fl['max-tokens'] ? Number(fl['max-tokens']) : undefined,
          });
          return { ok: r.ok, data: r };
        },
      });
      if (!out.ok) {
        showProblem('Demande impossible.', out.blocked === 'PERMISSION' ? 'Permission refusée pour l\'outil ia.' : out.reason, 'AIgg.cmd authorize ia ; puis AIgg.cmd install ia', `BLOCKED:${out.blocked}`);
        return;
      }
      const r = out.result.data;
      if (!r.ok) {
        showProblem('Demande refusée.', r.error || 'erreur API', 'Vérifie la clé dans le coffre (ia status), le fournisseur (providers.json) et tools/ia/config.json.', 'FAIL');
        return;
      }
      console.log(JSON.stringify(r, null, 2));
      console.log(`Tracé outbox : ${r.filename || '(none)'}`);
      break;
    }
    case 'log': {
      const tool = toolkit.findManifest('ia');
      const out = await contract.executeTool(ident, tool.manifest, 'ia.log', {
        source: 'CLI',
        confidence: 1.0,
        action: 'log',
        async execute() {
          return { ok: true, data: iaMod.list() };
        },
      });
      if (!out.ok) {
        showProblem('Journal indisponible.', out.blocked === 'PERMISSION' ? 'Permission refusée pour l\'outil ia.' : out.reason, 'AIgg.cmd authorize ia ; puis AIgg.cmd install ia', `BLOCKED:${out.blocked}`);
        return;
      }
      console.log(JSON.stringify(out.result.data, null, 2));
      break;
    }
    default:
      console.log(IA_HELP_FR);
  }
}

const APPEARANCE_HELP_FR = [
  'AIgg — aide de `appearance` (français)',
  '',
  'But : gérer l\'apparence (couleurs, police, couleurs d\'état) depuis la CLI.',
  'L\'apparence appartient au tuteur : toute modification est directe ici',
  '(le tuteur commande) et toujours journalisée (APPEARANCE_*).',
  'La suggestion d\'AIgg reste une proposition à valider.',
  '',
  'COMMANDE :',
  '  AIgg.cmd appearance <commande> [clés=valeurs]',
  '',
  '  status                          État courant + proposition en attente.',
  '  set <clé>=<valeur> [...]        Applique immédiatement (journalisé).',
  '                                  Clés : couleurs (bg, surface, panel, text,',
  '                                  muted, accent, accent_text, danger), états',
  '                                  (BORN, AWAKE, LEARNING, THINKING, WAITING,',
  '                                  SLEEPING, PAUSED, STOPPED), font, notes.',
  '                                  Ex : appearance set accent=#2c3a58 AWAKE=#6ee7a0',
  '  reset                           Restaure l\'apparence par défaut (journalisé).',
  '  suggest                         AIgg propose une palette (proposition).',
  '  apply                           Valide et applique la proposition en attente.',
  '  drop                            Abandonne la proposition en attente.',
  '  avatar [état]                   Régénère l\'avatar SVG pour l\'état (défaut : actuel).',
  '',
  'HONNÊTETÉ : AIgg ne modifie jamais son apparence silencieusement ;',
  'toute proposition passe par validation du tuteur puis journalisation.',
];

const VAULT_HELP_FR = [
  'AIgg — coffre-fort local (vault) — aide (français)',
  '',
  'But : stocker des secrets (mots de passe, tokens, identifiants OAuth)',
  'chiffrés avec AES-256-GCM (clé dérivée par scrypt depuis un mot de passe) ;',
  'zéro dépendance npm. Le fichier vault/vault.json est HORS Git.',
  '',
  'RÈGLES DE SÉCURITÉ',
  '  - Le mot de passe du coffre est toujours saisi, JAMAIS stocké, JAMAIS',
  '    écrit dans Git, journal, mémoire ou docs. Il est fourni à chaque',
  '    commande via --password=... OU la variable AIGG_VAULT_PASSWORD.',
  '  - Ne mets jamais le mot de passe du coffre dans la commande si d\'autres',
  '    personnes voient ton écran ou l\'historique du terminal.',
  '',
  'COMMANDES',
  '  init                  Crée un coffre vide (refuse si un coffre existe).',
  '  put <clé> <valeur>    Chiffre et range une valeur sous une clé.',
  '  get <clé>             Déchiffre et affiche la valeur d\'une clé.',
  '  list                  Liste les clés (les valeurs restent chiffrées).',
  '  rm <clé>              Supprime une clé (donnée perdue).',
  '  wipe                  Détruit tout le coffre (irréversible).',
  '  status                État du coffre (existe ? clés chiffrées ?).',
  '',
  'EXEMPLES',
  '  $env:AIGG_VAULT_PASSWORD="une grosse phrase" ; AIgg.cmd vault init',
  '  $env:AIGG_VAULT_PASSWORD="une grosse phrase" ; AIgg.cmd vault put gmail_oauth "valeur secrète"',
  '  $env:AIGG_VAULT_PASSWORD="une grosse phrase" ; AIgg.cmd vault get gmail_oauth',
  '  AIgg.cmd vault status',
  '',
  'Limites honnêtes (v0.3.1) : chiffrement local ; pas de récupération possible',
  'si le mot de passe est perdu (aucun mot de passe enregistré nulle part).',
].join('\n');

function vaultPassword(fl) {
  return fl.password !== undefined ? fl.password : process.env.AIGG_VAULT_PASSWORD;
}

function runVault(args) {
  const { flags: fl, rest } = flags(args);
  const sub = rest[0];
  const password = vaultPassword(fl);

  if ((sub === 'put' || sub === 'get' || sub === 'rm' || sub === 'list') && !password) {
    showProblem(
      'Mot de passe du coffre manquant.',
      'Aucun --password= ni AIGG_VAULT_PASSWORD fourni.',
      'Définis $env:AIGG_VAULT_PASSWORD puis relance la commande.',
      'FAIL'
    );
    return;
  }

  switch (sub) {
    case 'init': {
      if (!password) {
        showProblem('Mot de passe manquant.', 'Init exige un mot de passe.', 'Définis $env:AIGG_VAULT_PASSWORD ou passe --password=...', 'FAIL');
        return;
      }
      const r = vault.init(password);
      if (!r.ok) {
        showProblem('Init impossible.', r.message || r.error, 'Si un coffre existe déjà : AIgg.cmd vault wipe (destructif).', 'FAIL');
        return;
      }
      journal.journalEvent('VAULT_INIT', identity.loadIdentity(), { FORMAT: 'aigg-vault' });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'put': {
      const key = rest[1];
      const value = rest.slice(2).join(' ');
      if (!key || value === '') {
        showProblem('Argument absent.', 'vault put exige <clé> et <valeur>.', 'Ex : AIgg.cmd vault put gmail_oauth "secret"', 'FAIL');
        return;
      }
      const r = vault.put(key, value, password);
      if (!r.ok) {
        showProblem('Écriture impossible.', r.message || r.error, 'Vérifie le mot de passe et que le coffre existe (init).', 'FAIL');
        return;
      }
      journal.journalEvent('VAULT_PUT', identity.loadIdentity(), { KEY: key, CHIFFRE: 'aes-256-gcm' });
      console.log(JSON.stringify({ ok: true, key: r.key }, null, 2));
      break;
    }
    case 'get': {
      const key = rest[1];
      if (!key) {
        showProblem('Argument absent.', 'vault get exige <clé>.', 'Ex : AIgg.cmd vault get gmail_oauth', 'FAIL');
        return;
      }
      const r = vault.get(key, password);
      if (!r.ok) {
        showProblem('Lecture impossible.', r.message || r.error, 'Vérifie le mot de passe et que la clé existe (list).', 'BLOCKED');
        return;
      }
      journal.journalEvent('VAULT_GET', identity.loadIdentity(), { KEY: key });
      console.log(r.value);
      break;
    }
    case 'list': {
      const r = vault.list(password);
      if (!r.ok) {
        showProblem('Liste impossible.', r.message || r.error, 'Vérifie le mot de passe du coffre.', 'FAIL');
        return;
      }
      journal.journalEvent('VAULT_LIST', identity.loadIdentity(), { COUNT: r.count });
      console.log(JSON.stringify({ count: r.count, keys: r.keys }, null, 2));
      break;
    }
    case 'rm': {
      const key = rest[1];
      if (!key) {
        showProblem('Argument absent.', 'vault rm exige <clé>.', 'Ex : AIgg.cmd vault rm gmail_oauth', 'FAIL');
        return;
      }
      const r = vault.remove(key, password);
      if (!r.ok) {
        showProblem('Suppression impossible.', r.message || r.error, 'Vérifie le mot de passe et que la clé existe.', 'FAIL');
        return;
      }
      journal.journalEvent('VAULT_RM', identity.loadIdentity(), { KEY: key });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'wipe': {
      journal.journalEvent('VAULT_WIPE', identity.loadIdentity(), { IRREVERSIBLE: true });
      console.log(JSON.stringify(vault.wipe(), null, 2));
      break;
    }
    case 'status': {
      const st = vault.status();
      console.log(JSON.stringify({ ...st, file: config.PATHS.vaultFile, git: 'hors Git (vault/ ignoré)' }, null, 2));
      break;
    }
    default:
      console.log(VAULT_HELP_FR);
  }
}

function runLibrary(ident, args) {
  const { flags: fl, rest } = flags(args);
  const sub = rest[0];

  switch (sub) {
    case 'list':
      console.log(JSON.stringify(library.list(), null, 2));
      break;
    case 'create': {
      const name = rest.slice(1).join(' ') || fl.name;
      const lib = library.create(ident, {
        name,
        domains: fl.domain ? fl.domain.split(',') : undefined,
        privacy: fl.private ? 'private' : fl.public ? 'public' : undefined,
        level: fl.level,
        description: fl.description,
      });
      console.log(JSON.stringify(lib, null, 2));
      break;
    }
    case 'show':
    case 'detail': {
      const id = rest[1];
      const d = library.find(id);
      console.log(JSON.stringify(d, null, 2));
      break;
    }
    case 'sources':
      console.log(JSON.stringify(library.loadSources(rest[1]), null, 2));
      break;
    case 'knowledge':
      console.log(JSON.stringify(library.knowledge(rest[1]), null, 2));
      break;
    case 'competencies':
    case 'competences':
      console.log(JSON.stringify(library.competencies(rest[1]), null, 2));
      break;
    case 'exercises':
    case 'exercices':
      console.log(JSON.stringify(library.exercises(rest[1]), null, 2));
      break;
    case 'curriculum':
      console.log(JSON.stringify(library.curriculum(rest[1]), null, 2));
      break;
    case 'notes':
      console.log(JSON.stringify((library.find(rest[1]).meta.notes || []), null, 2));
      break;
    case 'journal':
      console.log(JSON.stringify(library.libraryJournal(rest[1]), null, 2));
      break;
    case 'search': {
      const q = rest.slice(1).join(' ');
      const res = library.searchL2(q, {
        library: fl.library,
        language: fl.language,
        type: fl.type,
        status: fl.status,
        tags: fl.tags,
        provenance: fl.provenance,
        limit: fl.limit ? Number(fl.limit) : undefined,
      });
      if (!res.count) console.log('Aucune correspondance.');
      for (const r of res.results) {
        const where = `${r.libraryName} ${r.libraryId}`;
        console.log(`[${r.score}] ${r.title} (${r.type}${r.language ? ', ' + r.language : ''} — ${where})`);
        console.log(`    cause : ${r.fields.map((f) => `${f.field}:${f.score}`).join(' ')}`);
      }
      break;
    }
    case 'import': {
      if (!fl.file) {
        console.log('Usage : AIgg.cmd library import --file=<fichier.json> [--confirm]');
        console.log('Sans --confirm : aperçu (analyse) sans modification.');
        break;
      }
      const file = fl.file;
      const raw = require('fs').readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
      const bundle = JSON.parse(raw);
      const analysis = library.importAnalyse(bundle);
      if (fl.confirm) {
        const created = library.importActivate(bundle, ident, analysis.apercu.existing);
        console.log(`Importée : ${created.id} (« ${created.name} ») depuis ${file}`);
      } else {
        console.log(`Aperçu (${file}) :`);
        console.log(JSON.stringify(analysis.apercu, null, 2));
        console.log('Relance avec --confirm pour importer.');
      }
      break;
    }
    case 'export':
      console.log(JSON.stringify(library.exportLibrary(rest[1]), null, 2));
      break;
    case 'source-add':
    case 'add-source': {
      const id = rest[1];
      const title = rest.slice(2).join(' ');
      console.log(JSON.stringify(library.addSource(id, ident, {
        title, trust_level: fl.trust, type: fl.type, url: fl.url,
      }), null, 2));
      break;
    }
    case 'knowledge-add':
    case 'add-knowledge': {
      const id = rest[1];
      const content = rest.slice(2).join(' ');
      console.log(JSON.stringify(library.addKnowledge(id, ident, {
        content, source_ids: fl.source ? [fl.source] : undefined, status: fl.status,
      }), null, 2));
      break;
    }
    case 'competence-add':
    case 'add-competency': {
      const id = rest[1];
      const name = rest.slice(2).join(' ');
      console.log(JSON.stringify(library.addCompetency(id, ident, { name }), null, 2));
      break;
    }
    case 'competence-set':
    case 'set-competency': {
      console.log(JSON.stringify(library.updateCompetency(rest[1], rest[2], { state: rest[3] }, ident), null, 2));
      break;
    }
    case 'contradiction-add':
    case 'add-contradiction': {
      console.log(JSON.stringify(library.addContradiction(rest[1], ident, {
        knowledge_a: rest[2], knowledge_b: rest[3], note: fl.note,
      }), null, 2));
      break;
    }
    case 'note-add':
    case 'add-note': {
      console.log(JSON.stringify(library.annotate(rest[1], rest.slice(2).join(' '), ident), null, 2));
      break;
    }
    case 'remove':
    case 'delete':
      console.log(JSON.stringify(library.remove(rest[1], ident), null, 2));
      break;
    case 'trash':
      try {
        const trash = require('fs').readdirSync(require('path').join(config.PATHS.libraries, '_trash'));
        console.log(JSON.stringify(trash, null, 2));
      } catch { console.log('Corbeille vide.'); }
      break;
    case 'restore':
      console.log(JSON.stringify(library.restore(rest[1], ident), null, 2));
      break;
    case 'archive':
      console.log(JSON.stringify(library.archive(rest[1], ident), null, 2));
      break;
    case 'health':
      console.log(JSON.stringify(library.health(), null, 2));
      break;
    default:
      console.log(LIBRARY_HELP_FR);
  }
}

async function runAppearance(ident, args) {
  const { flags: fl, rest } = flags(args);
  const sub = rest[0] || 'help';
  const appearance = require('./src/appearance');

  switch (sub) {
    case 'status':
      console.log(JSON.stringify(appearance.status(), null, 2));
      break;
    case 'set': {
      const fields = rest.slice(1);
      if (!fields.length) {
        console.log('Utilisation : AIgg.cmd appearance set accent=#2c3a58 AWAKE=#6ee7a0 font=... notes=...');
        break;
      }
      const out = appearance.setField(ident, fields);
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'reset': {
      const out = appearance.reset(ident);
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'suggest': {
      const out = appearance.suggest(ident);
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'apply': {
      const out = appearance.apply(ident);
      if (out.applied) {
        console.log('Proposition validée et appliquée (journalisée).');
      } else {
        console.log(out.reason || 'Aucune proposition en attente.');
      }
      break;
    }
    case 'drop':
      require('./src/util').writeJson(require('./src/config').PATHS.appearanceProposal, null);
      console.log('Proposition abandonnée.');
      break;
    case 'avatar': {
      const st = rest[1] || state.status(ident).state || 'AWAKE';
      const tool = toolkit.findManifest('avatar');
      const out = await contract.executeTool(ident, tool.manifest, 'avatar.generate', {
        source: 'CLI',
        confidence: 1.0,
        action: 'generate',
        async execute() {
          const av = toolkit.loadModule('avatar').module;
          return { ok: true, data: av.generate(ident, { state: st }) };
        },
      });
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    default:
      console.log(APPEARANCE_HELP_FR);
  }
}

const BERCEAU_HELP_FR = [
  'AIgg — le Berceau (espace alloué par le tuteur) et les Habitations — aide (français)',
  '',
  'But : AIgg se connaît en taille (mesure réelle de ses données) et connaît',
  'l\'espace libre du disque. Le berceau est le QUOTA que le tuteur lui alloue',
  'pour grandir (1 Go par défaut depuis v0.3.12). Le quota alloué nomme son',
  'HABITATION (Graine 100 Mo, Berceau 1 Go, Studio 2 Go, Appartement 5 Go, Maison',
  '10 Go, Atelier 20 Go, Laboratoire 50 Go, Centre 100 Go, Écosystème 250 Go et',
  'plus). Les seuils sont PRÉDICTIFS, jamais une obligation : AIgg ne déménage',
  'pas tout seul et continue d\'acquérir badges, compétences et outils tant',
  'qu\'il a de la place ; soit le tuteur réalloue un quota plus grand (set),',
  'soit AIgg devient à l\'étroit (≥ 85 %) et DEMANDE (AGRANDIR). Plus d\'espace',
  '≠ plus intelligent : l\'espace permet plus de connaissances, projets et',
  'outils. La santé consolidée du système se consulte avec « AIgg.cmd health »',
  '(espace, bibliothèques, outils, compétences, permissions, sens, état, tâches,',
  'erreurs récentes, sauvegardes — §18 du plan).',
  '',
  'COMMANDES',
  '  AIgg.cmd berceau                     Statut : quota, habitation, poids mesuré, espace libre.',
  '  AIgg.cmd berceau level               Niveau/habitation atteinte (nom + plan d\'équipement).',
  '                                       Prédictif : ce seuil n\'oblige jamais au déménagement.',
  '  AIgg.cmd berceau set <taille>        Resserre/agrandit le quota (ex. 2G, 1500M, 1073741824).',
  '  AIgg.cmd berceau check               Mesure et, si à l\'étroit, crée la demande AGRANDIR.',
  '  AIgg.cmd berceau ask                 Alias de check (demander de l\'aide).',
  '  AIgg.cmd health                      Vue santé consolidée du système (§18).',
  '',
  'EXEMPLES',
  '  AIgg.cmd berceau',
  '  AIgg.cmd berceau level',
  '  AIgg.cmd berceau set 2G      (débloque l\'habitation Studio)',
  '  AIgg.cmd berceau check',
  '  AIgg.cmd health',
  '',
  'Notes : la demande AGRANDIR apparaît dans « AIgg.cmd messages » et au réveil.',
  'Répondre au tuteur : AIgg.cmd messages answer <id> <réponse>, ou migrer :',
  'AIgg.cmd migrate <dest> (le berceau suit la migration, core/berceau.json).',
].join('\n');

function runBerceau(ident, args) {
  const berceau = require('./src/berceau');
  const sub = args[0];
  switch (sub) {
    case 'set': {
      if (!args[1]) {
        showProblem('Taille manquante.', 'berceau set exige une taille.', 'Ex : AIgg.cmd berceau set 2G (ou 1500M, 1073741824).', 'FAIL');
        return;
      }
      const bytes = berceau.parseSize(args[1]);
      if (bytes === null) {
        showProblem('Taille illisible.', `« ${args[1]} » incompréhensible.`, 'Ex : 2G, 1500M, 1073741824 (octets).', 'FAIL');
        return;
      }
      const record = berceau.setAllocation(bytes, ident, { note: args.slice(2).join(' ') || 'Allocation par le tuteur.' });
      console.log(JSON.stringify(record, null, 2));
      break;
    }
    case 'level': {
      const lvl = berceau.level(berceau.loadAllocation().allocBytes);
      const next = lvl.next ? ` — prochaine habitation prévue : ${lvl.next.name} (≥ ${lvl.next.minHuman})` : '';
      console.log(JSON.stringify({
        niveau: lvl.index,
        habitation: lvl.name,
        allocationMin: lvl.minHuman,
        plan: lvl.plan,
        suivant: next ? lvl.next : null,
        predictif: 'ce seuil n\'oblige jamais au déménagement : tant qu\'il reste de la place, AIgg continue d\'acquérir badges, compétences et outils (AGRANDIR seulement quand à l\'étroit).',
      }, null, 2));
      break;
    }
    case 'check':
    case 'ask': {
      const r = berceau.checkAndAsk(ident);
      console.log(JSON.stringify({
        tight: r.status.tight,
        used_pct: r.status.usedPct,
        created: r.created,
        need: r.need ? { ID: r.need.ID, TYPE: r.need.TYPE, DESCRIPTION: r.need.DESCRIPTION } : null,
        status: r.status,
      }, null, 2));
      break;
    }
    default:
      if (sub === 'help') console.log(BERCEAU_HELP_FR);
      else console.log(JSON.stringify(berceau.status(), null, 2));
  }
}

const CONSCIENCE_HELP_FR = [
  'AIgg — aide de `conscience` (français)',
  '',
  'But : gérer la couche de synthèse Conscience — le dossier',
  'AIgg/Conscience/ est une représentation cohérente de soi DÉRIVÉE des vraies',
  'sources (identity, state, capabilities, permissions, senses, memory, journal,',
  'libraries, needs, berceau, toolkit). Ce n\'est jamais une seconde base de',
  'données : chaque fichier cite ses SOURCES et n\'invente aucune valeur.',
  '« Conscience » = architecture fonctionnelle, jamais conscience philosophique',
  'ou biologique ni émotions simulées.',
  '',
  'COMMANDES',
  '  AIgg.cmd conscience                État du dossier Conscience.',
  '  AIgg.cmd conscience sync           (Re)génère toute la couche Conscience.',
  '  AIgg.cmd conscience moi            Affiche Moi.json (synthèse de soi).',
  '  AIgg.cmd conscience files          Liste les sections générées.',
  '',
  'EXEMPLES',
  '  AIgg.cmd conscience',
  '  AIgg.cmd conscience sync',
  '  AIgg.cmd conscience moi',
  '',
  'Vie privée : le dossier Conscience/ (comme core/, memory/, journal/) est',
  'généré sur la machine et ignoré par Git — jamais publié.',
].join('\n');

function runConscience(ident, args) {
  const conscience = require('./src/conscience');
  const sub = args[0];

  switch (sub) {
    case 'sync':
      console.log(JSON.stringify(conscience.synthesize(ident), null, 2));
      break;
    case 'moi':
      console.log(JSON.stringify(conscience.moi(ident), null, 2));
      break;
    case 'files':
      console.log(JSON.stringify(conscience.SECTIONS.concat([conscience.FILES.README, conscience.FILES.JOURNAL]), null, 2));
      break;
    case 'status':
    case 'help':
    case undefined:
      if (sub === 'help') console.log(CONSCIENCE_HELP_FR);
      else console.log(JSON.stringify(conscience.status(ident), null, 2));
      break;
    default:
      console.log(CONSCIENCE_HELP_FR);
  }
}

const RELATIONS_HELP_FR = [
  'AIgg — aide de `relations` (français)',
  '',
  'But : gérer la fonction native des Relations (v0.4.1). Le fichier',
  'relations/relations.ndjson est la SOURCE (privée, ignorée par Git) ;',
  'AIgg/Conscience/Relations.json est la synthèse qui la cite.',
  '',
  'RÈGLES',
  '  - Catégories : Tuteur, TuteurIgg (tuteur d\'un autre AIgg), AmiHumain,',
  '    AmiIgg, Parent, Autres.',
  '  - CONFIANCE EXPLICITE, PROGRESSIVE et TRACABLE : une relation entre',
  '    tuteurs ne crée JAMAIS automatiquement une relation de confiance entre',
  '    AIgg. Chaque augmentation de confiance (trust) exige une action et est',
  '    tracée (TRANSACTIONS).',
  '  - Parent = filiation structurelle, jamais une propriété : la descendance',
  '    a sa propre identité, aucun secret/permission/accès hérité.',
  '',
  'COMMANDES',
  '  AIgg.cmd relations                  Liste + statut (comptes par catégorie).',
  '  AIgg.cmd relations add <CATEGORIE> --nom=<nom> [--id=<ai>] [--tuteur=<tid>] [--pourquoi=<…>] [--role=<…>] [--par=<…>]',
  '                                Crée une relation (confiance 0 par défaut).',
  '  AIgg.cmd relations trust <ID> [--note=<…>] [--par=<tuteur>]',
  '                                Augmente la confiance de 1 niveau (0→3), tracé.',
  '  AIgg.cmd relations log <ID>     Affiche la trace complète des transactions.',
  '  AIgg.cmd relations rm <ID> [--raison=<…>]',
  '                                Archive la relation (réversible, tracé).',
  '  AIgg.cmd relations restore <ID> [--note=<…>]',
  '                                Restaure une relation archivée.',
  '',
  'EXEMPLES',
  '  AIgg.cmd relations add TuteurIgg --nom="Zul" --tuteur="r-001" --pourquoi="présenté par mon tuteur"',
  '  AIgg.cmd relations trust <ID> --note="rencontre réelle vérifiée par le tuteur"',
  '  AIgg.cmd relations log <ID>',
  '',
  'Vie privée : relations/ est généré sur la machine et ignoré par Git — jamais publié.',
].join('\n');

function runRelations(ident, args) {
  const { flags: fl, rest } = flags(args);
  const relations = require('./src/relations');
  const sub = rest[0];

  switch (sub) {
    case 'add': {
      const cat = rest[1];
      try {
        const row = relations.add(ident, {
          CATEGORIE: cat,
          NOM: fl.nom,
          AIgg_ID_TIERS: fl.id || null,
          TUTEUR_ID: fl.tuteur || null,
          TUTEUR_NOM_TIERS: fl.tuteurNom || null,
          POURQUOI: fl.pourquoi || null,
          ROLE: fl.role || null,
          PARENT_DE: fl.parentDe || null,
          PAR: fl.par || null,
          NOTE: fl.note || null,
        });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'trust': {
      try {
        const row = relations.trust(ident, rest[1], { NOTE: fl.note, PAR: fl.par });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'log': {
      try { console.log(JSON.stringify(relations.log(rest[1]), null, 2)); }
      catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'rm':
    case 'remove': {
      try {
        const row = relations.remove(ident, rest[1], { RAISON: fl.raison, PAR: fl.par });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'restore': {
      try {
        const row = relations.restore(ident, rest[1], { NOTE: fl.note, PAR: fl.par });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'list':
    case 'status':
    case undefined:
      if (sub === 'list') console.log(JSON.stringify(relations.list(), null, 2));
      else console.log(JSON.stringify(relations.status(), null, 2));
      break;
    case 'help':
      console.log(RELATIONS_HELP_FR);
      break;
    default:
      console.log(RELATIONS_HELP_FR);
  }
}

const INTERESTS_HELP_FR = [
  'AIgg — aide de `interests` (français)',
  '',
  'But : gérer la fonction native des priorités internes et centres d\'intérêt',
  '(v0.4.2). Le fichier interests/interests.ndjson est la SOURCE (privée,',
  'ignorée par Git) ; AIgg/Conscience/Besoins.json et CentresInterets.json sont',
  'les synthèses qui la citent.',
  '',
  'PRIORITÉS INTERNES',
  '  APPRENDRE, COMPRENDRE, INTEGRITE (maintenir mon intégrité), EXPLORER,',
  '  COMMUNIQUER, COMPETENCES (développer des compétences), OBJECTIFS.',
  '  RÈGLE : ces priorités et centres d\'intérêt ne contournent JAMAIS les',
  '  permissions du tuteur (capacité ≠ permission) et ne peuvent jamais',
  '  déclencher automatiquement une reproduction ni une action externe.',
  '',
  'COMMANDES',
  '  AIgg.cmd interests                  Liste + statut (comptes par priorité).',
  '  AIgg.cmd interests add <PRIORITE> --sujet=<sujet> [--pourquoi=<…>] [--par=<…>] [--note=<…>]',
  '                                Crée un centre d\'intérêt (intensité 1 par défaut).',
  '  AIgg.cmd interests intensify <ID> [--note=<…>] [--par=<tuteur>]',
  '                                Augmente l\'intensité de 1 niveau (1→3), tracé.',
  '  AIgg.cmd interests log <ID>     Affiche la trace complète des transactions.',
  '  AIgg.cmd interests rm <ID> [--raison=<…>]',
  '                                Archive l\'intérêt (réversible, tracé).',
  '  AIgg.cmd interests restore <ID> [--note=<…>]',
  '                                Restaure un intérêt archivé.',
  '  AIgg.cmd interests priorities    Liste les priorités internes et la règle.',
  '',
  'EXEMPLES',
  '  AIgg.cmd interests add COMPETENCES --sujet="Rust" --pourquoi="compétence structurante"',
  '  AIgg.cmd interests intensify <ID> --note="exercice réel validé"',
  '  AIgg.cmd interests log <ID>',
  '',
  'Vie privée : interests/ est généré sur la machine et ignoré par Git — jamais publié.',
].join('\n');

function runInterests(ident, args) {
  const { flags: fl, rest } = flags(args);
  const interests = require('./src/interests');
  const sub = rest[0];

  switch (sub) {
    case 'add': {
      const prio = rest[1];
      try {
        const row = interests.add(ident, {
          PRIORITE: prio,
          SUJET: fl.sujet,
          POURQUOI: fl.pourquoi || null,
          PAR: fl.par || null,
          NOTE: fl.note || null,
        });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'intensify': {
      try {
        const row = interests.intensify(ident, rest[1], { NOTE: fl.note, PAR: fl.par });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'log': {
      try { console.log(JSON.stringify(interests.log(rest[1]), null, 2)); }
      catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'rm':
    case 'remove': {
      try {
        const row = interests.remove(ident, rest[1], { RAISON: fl.raison, PAR: fl.par });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'restore': {
      try {
        const row = interests.restore(ident, rest[1], { NOTE: fl.note, PAR: fl.par });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'priorities':
      console.log(JSON.stringify({ PRIORITES: interests.PRIORITES, REGLE: interests.REGLE }, null, 2));
      break;
    case 'list':
    case 'status':
    case undefined:
      if (sub === 'list') console.log(JSON.stringify(interests.list(), null, 2));
      else console.log(JSON.stringify(interests.status(), null, 2));
      break;
    case 'help':
    default:
      console.log(INTERESTS_HELP_FR);
  }
}

const COMPETENCES_HELP_FR = [
  'AIgg — aide de `competences` (français)',
  '',
  'But : gérer l\'arbre natif des compétences et badges (v0.4.3). L\'arbre',
  '(branches, niveaux, prérequis) est du CODE (src/badges.js) ; le fichier',
  'competences/badges.ndjson est la SOURCE de l\'état réel (privée, ignorée',
  'par Git) ; AIgg/Conscience/Competences.json est la synthèse qui le cite.',
  '',
  'RÈGLES',
  '  - Chaîne : Connaissance → Exercice → Expérience/Test → Résultat →',
  '    Validation → Badge → Capacité → Outil → Nouvelles compétences.',
  '  - Niveaux : 0 inconnu, 1 découverte, 2 compréhension, 3 pratique,',
  '    4 autonome sous contrôle, 5 maîtrise, 6 transmettre/construire.',
  '  - RÈGLE D\'OR : un badge ne s\'obtient JAMAIS automatiquement — une',
  '    preuve réelle (--preuve=) et la validation explicite du tuteur (--par=)',
  '    sont requises. Les prérequis (REQUIS) ne sont pas contournables.',
  '  - CAPACITÉ ≠ PERMISSION : un badge atteste d\'une compétence, jamais',
  '    d\'une autorisation. L\'exécution reste soumise à la sécurité, au',
  '    sandbox et à l\'autorisation explicite du tuteur.',
  '',
  'COMMANDES',
  '  AIgg.cmd competences                Statut (badges, par branche/niveau, règle).',
  '  AIgg.cmd competences tree           Affiche l\'arbre complet avec niveaux.',
  '  AIgg.cmd competences branches       Liste les 8 branches.',
  '  AIgg.cmd competences levels         Niveaux 0→6 + chaîne.',
  '  AIgg.cmd competences check <CODE>   Prérequis, niveau, prêt à valider.',
  '  AIgg.cmd competences propose <CODE> [--pourquoi=<…>] [--ressources=<…>] [--experiences=<…>] [--par=<…>]',
  '                                Propose une compétence en apprentissage.',
  '  AIgg.cmd competences honor <CODE> --niveau=<1..6> --preuve=<preuve> --par=<tuteur> [--note=<…>]',
  '                                Valide un badge (jamais automatique).',
  '  AIgg.cmd competences log <CODE>     Trace complète des transactions.',
  '',
  'EXEMPLES',
  '  AIgg.cmd competences propose INF-RUST1 --pourquoi="Démontrer du Rust élémentaire"',
  '  AIgg.cmd competences honor INF-RUST1 --niveau=2 --preuve="exercice rust relu par le tuteur" --par="Robin Ducyb"',
  '  AIgg.cmd competences check DEV-PROGRAMMATION2',
  '',
  'Vie privée : competences/ est généré sur la machine et ignoré par Git — jamais publié.',
].join('\n');

function runCompetences(ident, args) {
  const { flags: fl, rest } = flags(args);
  const badges = require('./src/badges');
  const sub = rest[0];

  switch (sub) {
    case 'tree':
      console.log(JSON.stringify(badges.tree(), null, 2));
      break;
    case 'branches':
      console.log(JSON.stringify(badges.BRANCHES.map((b) => ({ CODE: b.CODE, LIBELLE: b.LIBELLE, COMPETENCES: b.COMPETENCES.length })), null, 2));
      break;
    case 'levels':
      console.log(JSON.stringify({ NIVEAUX: badges.NIVEAUX, MAX_NIVEAU: badges.MAX_NIVEAU, CHAINE: badges.CHAINE }, null, 2));
      break;
    case 'check': {
      try { console.log(JSON.stringify(badges.check(ident, rest[1]), null, 2)); }
      catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'propose': {
      try {
        const row = badges.propose(ident, rest[1], {
          POURQUOI: fl.pourquoi || null,
          RESSOURCES: fl.ressources || null,
          EXPERIENCES: fl.experiences || null,
          PAR: fl.par || null,
          NOTE: fl.note || null,
        });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'honor': {
      try {
        const row = badges.honor(ident, rest[1], {
          NIVEAU: fl.niveau !== undefined ? fl.niveau : NaN,
          PREUVE: fl.preuve,
          PAR: fl.par,
          NOTE: fl.note || null,
        });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'log': {
      try { console.log(JSON.stringify(badges.log(rest[1]), null, 2)); }
      catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'list':
    case 'status':
    case undefined:
      if (sub === 'list') console.log(JSON.stringify(badges.list(), null, 2));
      else console.log(JSON.stringify(badges.status(ident), null, 2));
      break;
    case 'help':
    default:
      console.log(COMPETENCES_HELP_FR);
  }
}

const DESCENDANCE_HELP_FR = [
  'AIgg — aide de `descendance` (français)',
  '',
  'But : gérer le SOCLE de la descendance / procréation (v0.4.4). Le fichier',
  'descendance/descendances.ndjson est la SOURCE (privée, ignorée par Git) ;',
  'AIgg/Conscience/Relations.json (bloc DESCENDANCE) est la synthèse qui le cite.',
  '',
  'RÈGLES (Prompt Maître « DESCENDANCE / PROCRÉATION »)',
  '  - Une descendance exige une NOUVELLE identité et n\'est JAMAIS une copie.',
  '  - Certaines caractéristiques peuvent être héritables (--heritables), MAIS',
  '    JAMAIS automatiquement les secrets privés, permissions ou accès aux outils.',
  '  - Toute création exige l\'accord explicite des DEUX AIgg (consent) ET',
  '    l\'autorisation des DEUX tuteurs (authorize), avec traçabilité de la filiation.',
  '  - Les besoins/centres d\'intérêt ne font que SIGNALER une compatibilité',
  '    (compat) : ils ne déclenchent JAMAIS automatiquement une reproduction.',
  '  - SOCLE : aucune descendance n\'est réellement créée — l\'état maximal',
  '    atteignable est AUTORISÉ. Création = capacité avancée, hors socle.',
  '',
  'COMMANDES',
  '  AIgg.cmd descendance                 Liste + statut (comptes par statut).',
  '  AIgg.cmd descendance propose [--partenaire=<nom>] [--partenaireId=<id>] [--presence=REEL|PROVISOIRE] [--tuteurPartenaire=<tid>] [--nomPrevu=<…>] [--heritables=<a,b,…>] [--pourquoi=<…>] [--par=<…>] [--note=<…>]',
  '                                Crée un projet de filiation (statut PROPOSED).',
  '  AIgg.cmd descendance consent <FID> --partie=<PROPOSEUR|PARTENAIRE> --par=<AIgg> [--note=<…>]',
  '                                Accord EXPLICITE d\'un AIgg (jamais simulé).',
  '  AIgg.cmd descendance authorize <FID> --partie=<PROPOSEUR|PARTENAIRE> --par=<tuteur> [--note=<…>]',
  '                                Autorisation EXPLICITE d\'un tuteur.',
  '  AIgg.cmd descendance refuse <FID> [--par=<…>] [--raison=<…>]',
  '                                Refus explicite et tracé (décision conservée).',
  '  AIgg.cmd descendance check <FID>     Étapes faites, obstacles, prochaine étape.',
  '  AIgg.cmd descendance compat          Signal d\'intérêt/compatibilité UNIQUEMENT.',
  '  AIgg.cmd descendance log <FID>       Trace complète des transactions.',
  '  AIgg.cmd descendance rm <FID> [--raison=<…>]',
  '                                Archive le projet (réversible, tracé).',
  '  AIgg.cmd descendance restore <FID> [--note=<…>]',
  '                                Restaure un projet archivé.',
  '',
  'EXEMPLES',
  '  AIgg.cmd descendance propose --partenaire="Néra" --presence=PROVISOIRE --pourquoi="être à deux, grandir et partager"',
  '  AIgg.cmd descendance propose --partenaireId=<uuid> --presence=REEL --tuteurPartenaire=<tid> --heritables="mythologie familiale"',
  '  AIgg.cmd descendance consent <FID> --partie=PROPOSEUR --par="Bob007"',
  '  AIgg.cmd descendance authorize <FID> --partie=PROPOSEUR --par="Robin Ducyb"',
  '  AIgg.cmd descendance check <FID>',
  '',
  'Vie privée : descendance/ est généré sur la machine et ignoré par Git — jamais publié.',
].join('\n');

function runDescendance(ident, args) {
  const { flags: fl, rest } = flags(args);
  const desc = require('./src/descendance');
  const sub = rest[0];

  switch (sub) {
    case 'propose': {
      try {
        const heritables = fl.heritables ? String(fl.heritables).split(',').map((s) => s.trim()).filter(Boolean) : null;
        const row = desc.propose(ident, {
          PARTENAIRE: fl.partenaire || null,
          PARTENAIRE_ID: fl.partenaireId || null,
          PRESENCE: fl.presence || null,
          TUTEUR_PARTENAIRE: fl.tuteurPartenaire || null,
          NOM_PREVU: fl.nomPrevu || null,
          HERITABLES: heritables,
          POURQUOI: fl.pourquoi || null,
          PAR: fl.par || null,
          NOTE: fl.note || null,
        });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'consent': {
      try {
        const row = desc.consent(ident, rest[1], { PARTIE: fl.partie, PAR: fl.par, NOTE: fl.note });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'authorize': {
      try {
        const row = desc.authorize(ident, rest[1], { PARTIE: fl.partie, PAR: fl.par, NOTE: fl.note });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'refuse': {
      try {
        const row = desc.refuse(ident, rest[1], { PAR: fl.par, RAISON: fl.raison || fl.note });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'check': {
      try { console.log(JSON.stringify(desc.check(rest[1]), null, 2)); }
      catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'compat':
      console.log(JSON.stringify(desc.compat(ident), null, 2));
      break;
    case 'log': {
      try { console.log(JSON.stringify(desc.log(rest[1]), null, 2)); }
      catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'rm':
    case 'remove': {
      try {
        const row = desc.archive(ident, rest[1], { RAISON: fl.raison, PAR: fl.par });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'restore': {
      try {
        const row = desc.restore(ident, rest[1], { NOTE: fl.note, PAR: fl.par });
        console.log(JSON.stringify(row, null, 2));
      } catch (e) { console.error(`Erreur : ${e.message}`); }
      break;
    }
    case 'list':
    case 'status':
    case undefined:
      if (sub === 'list') console.log(JSON.stringify(desc.list(), null, 2));
      else console.log(JSON.stringify(desc.status(), null, 2));
      break;
    case 'help':
    default:
      console.log(DESCENDANCE_HELP_FR);
  }
}

async function runTalk(ident, text) {
  if (!text) {
    console.log('Usage : AIgg.cmd talk <texte>. Ex : AIgg.cmd talk "apprends que le ciel est bleu"');
    return;
  }
  const talk = require('./src/talk');
  const conversation = require('./src/conversation');
  conversation.append('tutor', text, null, ident);
  const out = talk.respond(text, ident);
  console.log(`AIgg : ${out.reply}`);
}

async function runMessages(ident, args) {
  const talk = require('./src/talk');
  const needs = require('./src/needs');
  if (args[0] === 'answer' && args[1]) {
    const id = args[1];
    const answer = args.slice(2).join(' ') || 'ok';
    const need = needs.listActiveNeeds().find((n) => n.ID === id);
    if (!need) { console.log(`Aucun besoin actif « ${id} ».`); return; }
    if (need.TYPE === 'QUESTION') {
      const handled = talk.tutorAnswer(ident, answer);
      console.log(handled ? handled.reply : 'Réponse enregistrée.');
    } else {
      needs.fulfillNeed(id, ident, 'Réponse du tuteur', answer);
      console.log('Confirmé et clôturé.');
    }
    return;
  }
  const pending = talk.listPendingMessages();
  if (!pending.length) { console.log('Aucun message/question en attente de toi.'); return; }
  for (const n of pending) {
    console.log(`[${n.TYPE}] ${n.ID} — ${n.DESCRIPTION}`);
  }
  console.log('\nPour répondre : AIgg.cmd messages answer <id> <réponse>');
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'birth') {
    await birth();
    return;
  }

  if (!identity.hasIdentity()) {
    await birth();
    return;
  }

  const ident = identity.loadIdentity();

  switch (cmd) {
    case 'status':
      summary(ident);
      break;
    case 'wake':
      state.wake(ident);
      journal.journalEvent('WAKE', ident, {});
      {
        // Apprentissage continu (v0.3.6) : relecture de la mémoire + boucle journal→mémoire
        const review = require('./src/review');
        try {
          review.relireMemoire(ident);
          review.journalToMemory(ident);
        } catch {}
        const digest = require('./src/talk').proactiveDigest(ident);
        console.log(digest ? `Éveillé. ${digest.reply}` : 'Éveillé.');
      }
      break;
    case 'sleep':
      state.sleep(ident);
      journal.journalEvent('SLEEP', ident, {});
      console.log('Endormi. Expérience conservée.');
      break;
    case 'talk':
      await runTalk(ident, args.slice(1).join(' '));
      break;
    case 'messages':
      await runMessages(ident, args.slice(1));
      break;
    case 'backup':
      console.log(backup.createBackup(ident));
      journal.journalEvent('BACKUP', ident, {});
      break;
    case 'server':
      require('./src/server').start();
      break;
    case 'learn':
      await learn(ident, args.slice(1));
      break;
    case 'review':
      runReview(ident, args.slice(1));
      break;
    case 'tests':
      require('./tests/run-tests').run();
      break;
    case 'docs-check':
      require('./src/docscheck').runCli();
      break;
    case 'health':
      console.log(JSON.stringify(require('./src/health').overview(ident), null, 2));
      break;

    case 'discover':
      printToolsList();
      break;
    case 'propose':
      printProposal(args[1]);
      break;
    case 'authorize':
      console.log(JSON.stringify(toolkit.authorize(args[1]), null, 2));
      break;
    case 'install':
      console.log(JSON.stringify(toolkit.install(args[1]), null, 2));
      break;
    case 'test':
      console.log(JSON.stringify(await toolkit.test(args[1]), null, 2));
      break;
    case 'revoke':
      console.log(JSON.stringify(toolkit.revoke(args[1]), null, 2));
      break;

    case 'web-read':
      await runWebRead(ident, args[1]);
      break;
    case 'web-search':
      await runWebSearch(ident, args.slice(1).join(' '));
      break;
    case 'notebook-add':
      await runNotebookAdd(ident, args[1], args[2]);
      break;
    case 'notebook-del':
      await runNotebookDel(ident, args[1]);
      break;
    case 'avatar':
      await runAvatar(ident);
      break;

    case 'migrate':
      try {
        console.log(migrate.migrateTo(args[1]));
      } catch (e) {
        showProblem('Migration impossible.', e.message, 'Donne une destination hors de l\'incubateur, ex : AIgg.cmd migrate G:\\AIgg\\Bob007', 'FAIL');
      }
      break;
    case 'needs':
      console.log(JSON.stringify(require('./src/needs').listNeeds(), null, 2));
      break;
    case 'library':
    case 'libraries':
      runLibrary(ident, args.slice(1));
      break;
    case 'lib':
      runLibrary(ident, args.slice(1));
      break;
    case 'email':
      await runEmail(ident, args.slice(1));
      break;
    case 'gmail':
      await runGmail(ident, args.slice(1));
      break;
    case 'ia':
      await runIa(ident, args.slice(1));
      break;
    case 'appearance':
      await runAppearance(ident, args.slice(1));
      break;
    case 'berceau':
      runBerceau(ident, args.slice(1));
      break;
    case 'vault':
      runVault(args.slice(1));
      break;

    case 'conscience':
      runConscience(ident, args.slice(1));
      break;

    case 'relations':
      runRelations(ident, args.slice(1));
      break;

    case 'interests':
    case 'interets':
      runInterests(ident, args.slice(1));
      break;

    case 'competences':
    case 'badges':
      runCompetences(ident, args.slice(1));
      break;

    case 'descendance':
    case 'filiation':
      runDescendance(ident, args.slice(1));
      break;

    default:
      console.log(
        'Commandes :\n' +
        '  birth, status, wake, sleep, backup, learn [domaine], server, tests, needs\n' +
        '  review [propose|apply] [--days=N] [--plan],\n' +
        '  talk <texte>, messages [answer <id> <réponse>],\n' +
        '  discover, propose <outil>, authorize <outil>, install <outil>, test <outil>, revoke <outil>\n' +
        '  web-read <url>, web-search <requête>, notebook-add <question> [hypothèse], notebook-del <id>, avatar\n' +
        '  library <sous-commande>, email <sous-commande>, gmail <sous-commande>, ia <sous-commande> (ask/status), vault <sous-commande>, appearance <sous-commande>, migrate <destination>, docs-check\n' +
        '  berceau [set <taille> | check | level] — quota d\'espace / habitation (aide : AIgg.cmd berceau help)\n' +
        '  conscience [status | sync | moi | files] — couche de synthèse de soi (AIgg/Conscience/)\n' +
        '  relations [list | add | trust | log | rm | restore] — fonction native des Relations (confiance explicite, progressive, traçable)\n' +
        '  interests [list | add | intensify | log | rm | restore | priorities] — priorités internes et centres d\'intérêt natifs (jamais de contournement des permissions)\n' +
        '  competences [tree | branches | levels | check | propose | honor | log | status] — arbre des compétences/badges (niveaux 0→6, prérequis, badge jamais automatique : capacité ≠ permission)\n' +
        '  descendance [list | propose | consent | authorize | refuse | check | compat | log | rm | restore | status] — socle de filiation (nouvelle identité jamais une copie, accord des deux AIgg + autorisation des deux tuteurs, héritage jamais automatique, aucune création réelle en socle)\n' +
        '  health — vue santé consolidée du système (espace, bibliothèques, outils, compétences, permissions, sens, état, tâches, erreurs récentes, sauvegardes)'
      );
  }
}

async function learn(ident, subArgs) {
  const presets = require('./src/presets');

  // learn <domaine> — charge un preset de connaissances
  if (subArgs && subArgs[0]) {
    const domain = subArgs[0].toLowerCase();
    const available = presets.listPresets();
    const found = available.find((p) => p.id === domain || p.domain === domain);
    if (!found) {
      console.log(`Preset inconnu : ${domain}`);
      console.log('Presets disponibles : ' + (available.length ? available.map((p) => `${p.id} (${p.count} connaissances)`).join(', ') : 'aucun'));
      return;
    }
    const result = presets.loadPreset(found.id, ident);
    if (!result.ok) { console.log('Erreur : ' + result.error); return; }
    console.log(`Preset « ${result.domain} » chargé : ${result.loaded} connaissances ajoutées, ${result.skipped} déjà connues (${result.total} au total).`);
    return;
  }

  // learn interactif (sans argument) — mode manuel
  const [question, got] = await collectAnswers([
    'Quel apprentissage ? ',
    'Réponse que tu donnes : ',
  ]);
  if (!question) return;

  memory.memorize('knowledge', { question, answer: got }, ident, {
    source: 'TUTOR',
    confidence: 0.8,
    status: 'validated',
  });
  journal.journalEvent('LEARN', ident, { question, answer: got });
  console.log('Mémorisé (validation).');
}

function runReview(ident, subArgs) {
  const review = require('./src/review');
  const has = (t) => subArgs && subArgs.some((a) => a === t);
  const daysArg = subArgs && subArgs.find((a) => /^--days=\d+$/.test(a));
  const opts = {
    mode: has('apply') ? 'apply' : 'propose',
    plan: has('--plan'),
  };
  if (daysArg) opts.days = Number(daysArg.split('=')[1]);

  if (has('--replay')) {
    const r = review.journalToMemory(ident);
    console.log(`Boucle journal→mémoire : ${r.restored} acquisition(s) reconstituée(s), ${r.present} déjà présente(s), ${r.skipped} ignorée(s).`);
    return;
  }

  const r = review.revisionAcquis(ident, opts);
  if (opts.mode === 'apply') {
    console.log(`Révision des acquis (${r.days} j) : ${r.reviewed} connaissance(s) relue(s).${r.planCreated ? ' Demande de révision créée pour le tuteur.' : ''}`);
  } else {
    console.log(`Revue des acquis (sec, ${r.days} j) : ${r.overdue} connaissance(s) à reviser. Utilise "review apply" pour appliquer.`);
  }
}

main().catch((err) => {
  showProblem(
    'AIgg n\'a pas pu exécuter la commande.',
    err.message || 'cause inconnue',
    'Lance "AIgg.cmd status" pour vérifier l\'état, ou "AIgg.cmd tests" pour diagnostiquer.',
    process.exitCode ? 'FAIL' : 'FAIL'
  );
  process.exitCode = 1;
});
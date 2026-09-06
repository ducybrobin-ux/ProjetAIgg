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
      console.log('Éveillé.');
      break;
    case 'sleep':
      state.sleep(ident);
      journal.journalEvent('SLEEP', ident, {});
      console.log('Endormi. Expérience conservée.');
      break;
    case 'backup':
      console.log(backup.createBackup(ident));
      journal.journalEvent('BACKUP', ident, {});
      break;
    case 'server':
      require('./src/server').start();
      break;
    case 'learn':
      await learn(ident);
      break;
    case 'tests':
      require('./tests/run-tests').run();
      break;
    case 'docs-check':
      require('./src/docscheck').runCli();
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

    default:
      console.log(
        'Commandes :\n' +
        '  birth, status, wake, sleep, backup, learn, server, tests, needs\n' +
        '  discover, propose <outil>, authorize <outil>, install <outil>, test <outil>, revoke <outil>\n' +
        '  web-read <url>, web-search <requête>, notebook-add <question> [hypothèse], notebook-del <id>, avatar\n' +
        '  library <sous-commande>, migrate <destination>, docs-check'
      );
  }
}

async function learn(ident) {
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

main().catch((err) => {
  showProblem(
    'AIgg n\'a pas pu exécuter la commande.',
    err.message || 'cause inconnue',
    'Lance "AIgg.cmd status" pour vérifier l\'état, ou "AIgg.cmd tests" pour diagnostiquer.',
    process.exitCode ? 'FAIL' : 'FAIL'
  );
  process.exitCode = 1;
});
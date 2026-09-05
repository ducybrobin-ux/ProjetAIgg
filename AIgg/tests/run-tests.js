'use strict';

const fs = require('fs');
const path = require('path');

const util = require('../src/util');
const config = require('../src/config');
const identity = require('../src/identity');
const state = require('../src/state');
const memory = require('../src/memory');
const journal = require('../src/journal');
const capabilities = require('../src/capabilities');
const permissions = require('../src/permissions');
const senses = require('../src/senses');
const backup = require('../src/backup');
const toolkit = require('../src/toolkit');
const contract = require('../src/contract');

const results = [];
let current = null;

function report(name, pass, detail) {
  results.push({ name, status: pass ? 'PASS' : 'FAIL', detail: detail || '' });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${name}${detail ? ' — ' + detail : ''}`);
}

function report3(name, status, detail) {
  results.push({ name, status, detail: detail || '' });
  console.log(`  [${status}] ${name}${detail ? ' — ' + detail : ''}`);
}

async function run() {
  console.log('=== TESTS AIGG ===');
  console.log(`CORE_VERSION=${config.CORE_VERSION}`);

  // 1. Structure
  console.log('\n1) STRUCTURE');
  const needed = [
    'core', 'memory/autobiographical', 'memory/knowledge', 'memory/relations',
    'memory/procedures', 'senses', 'tools', 'journal', 'inbox', 'outbox',
    'backups', 'web/public', 'docs', 'tests', 'notebook',
  ];
  let ok = true;
  for (const d of needed) {
    if (!fs.existsSync(path.join(config.PATHS.root, d))) ok = false;
  }
  report('structure_incubateur', ok);

  // 2. Identité
  console.log('\n2) IDENTITÉ');
  report('identite_presente', identity.hasIdentity());

  const ident = identity.loadIdentity();
  if (ident) {
    report('identite_champs', !!(ident.AIgg_ID && ident.AIgg_NAME && ident.TUTOR_NAME && ident.BIRTH_DATE));
    report('acte_naissance', fs.existsSync(config.PATHS.birthCertificate));
  }

  // 3. État / temps
  console.log('\n3) ÉTAT / TEMPS');
  if (ident) {
    const s = state.wake(ident);
    report('etat_eveille', s.state === 'AWAKE');
    report('age_calcul', typeof s.age.days === 'number');
    const states = state.ALLOWED_STATES;
    report('etats_8', states.length === 8 && ['BORN', 'AWAKE', 'LEARNING', 'THINKING', 'WAITING', 'SLEEPING', 'PAUSED', 'STOPPED'].every((st) => states.includes(st)));
    let guard = false;
    try { state.setState('NIMPORTE_QUOI', ident); } catch { guard = true; }
    report('etat_invalide_bloque', guard);
  }

  // 4. Mémoire
  console.log('\n4) MÉMOIRE');
  if (ident) {
    const e = memory.memorize('knowledge', { question: 'test', answer: 'ok' }, ident, {
      source: 'TEST', confidence: 0.5, status: 'validated',
    });
    report('memoriser', !!e.ID);
    report('rappel', memory.recollect('knowledge', 'test').length >= 1);
    report('allfamilies', memory.allFamilies().length >= 1);
    report('delete', memory.deleteEntry('knowledge', e.ID) !== null);
  }

  // 5. Journal
  console.log('\n5) JOURNAL');
  if (ident) {
    const e = journal.journalEvent('TEST_RUN', ident, {});
    report('journaliser', !!e.EVENT_ID);
    report('journal_fichier', fs.existsSync(config.PATHS.journalFile));
    const recent = journal.recentJournal(10).find((x) => x.EVENT === 'TEST_RUN');
    report('pas_cle_dupliquee', Object.keys(recent).length === new Set(Object.keys(recent)).size);
  }

  // 6. Capacités & permissions
  console.log('\n6) CAPACITÉS & PERMISSIONS');
  if (ident) {
    const caps = capabilities.detectCapabilities();
    report('capacites', caps.length >= 10);
    report('permissions_defaut', permissions.isAllowed('publish') === false);
    report('tool_permission_non_autorise', permissions.toolStatus('gemini').authorized === false);
    report('contract_context', permissions.contractContext(ident).AIgg_NAME === ident.AIgg_NAME);
  }

  // 7. Sens
  console.log('\n7) SENS');
  report('sens_states', senses.detectSenses().every((s) => ['OUI', 'NON'].includes(s.DISPONIBLE)));

  // 8. Sauvegarde
  console.log('\n8) SAUVEGARDE');
  if (ident) {
    const m = backup.createBackup(ident);
    report('backup_manifeste', !!(m.BACKUP_ID && m.RESTORABLE));
    report('backup_dossier', backup.listBackups().length >= 1);
  }

  // 9. Registre d'outils
  console.log('\n9) REGISTRE D\'OUTILS');
  if (ident) {
    const tools = toolkit.discoverAll();
    report('decouverte_outils', tools.length >= 3, `${tools.length} outils`);
    const names = tools.map((t) => t.name);
    report('outils_essentiels', ['web', 'notebook', 'avatar'].every((n) => names.includes(n)));
    report('propositions', !!toolkit.propose('web').proposal);
    report('manifests_valides', tools.every((t) => !!t.manifest.capability && !!t.manifest.version));
  }

  // 10. Contrat Commun
  console.log('\n10) CONTRAT COMMUN');
  if (ident) {
    // Manifeste fantôme déterministe : ne touche pas l'état des outils réels.
    const phantom = { name: 'phantom', version: 'test', capability: 'CAP_TEST_PHANTOM', title: 'Fantôme' };

    // Bloqué : capacité non acquise
    const noCap = await contract.executeTool(ident, phantom, 'act', {
      confidence: 0.5,
      execute: () => Promise.resolve({ ok: true, data: {} }),
    });
    report('blocage_sans_capacite', noCap.ok === false && noCap.blocked === 'CAPACITY', noCap.blocked || 'exécuté');

    // Bloqué : capacité acquise mais permission refusée
    capabilities.acquireCapacity('CAP_TEST_PHANTOM', 'phantom', 'test');
    const noPerm = await contract.executeTool(ident, phantom, 'act', {
      confidence: 0.5,
      execute: () => Promise.resolve({ ok: true, data: {} }),
    });
    report('blocage_sans_permission', noPerm.ok === false && noPerm.blocked === 'PERMISSION', noPerm.blocked || 'exécuté');

    // Permis : exécution + contrat complet
    permissions.authorizeTool('phantom', 'test');
    const withPerm = await contract.executeTool(ident, phantom, 'act', {
      confidence: 0.5,
      source: 'TEST_CONTRAT',
      execute: (contract) => {
        const hasContract = !!(contract.AIgg_ID && contract.TIMESTAMP && contract.EVENT_ID && contract.TOOL_NAME);
        return Promise.resolve({ ok: hasContract, data: { hasContract } });
      },
    });
    report('execution_avec_permission', withPerm.ok === true);
    report('contrat_complet', withPerm.contract && !!withPerm.contract.EVENT_ID, withPerm.contract ? withPerm.contract.TOOL_NAME : 'none');

    // Nettoyage (réversible) : permission + capacité fantômes retirées.
    permissions.revokeTool('phantom');
    capabilities.releaseCapacity('CAP_TEST_PHANTOM');
    journal.journalEvent('TOOL_PHANTOM_CLEANUP', ident, {});
  }

  // 11. Outils réels
  console.log('\n11) OUTILS RÉELS');
  toolkit.authorize('web'); toolkit.install('web');
  const webTest = await toolkit.test('web');
  report('test_outil_web', webTest.test.status === 'PASS', webTest.test.note || webTest.test.status);

  toolkit.authorize('notebook'); toolkit.install('notebook');
  const nbTest = await toolkit.test('notebook');
  report('test_outil_notebook', nbTest.test.status === 'PASS');

  toolkit.authorize('avatar'); toolkit.install('avatar');
  const avTest = await toolkit.test('avatar');
  report('test_outil_avatar', avTest.test.status === 'PASS', avTest.test.note || avTest.test.status);
  report('avatar_svg_existe', fs.existsSync(path.join(config.PATHS.web, 'avatar.svg')));

  // 12. Notebook réel
  console.log('\n12) NOTEBOOK RÉEL');
  if (ident) {
    const nb = require('../tools/notebook/notebook.js');
    const beforeCount = nb.list().length;
    const entry = nb.add({ question: 'test_suite', hypothesis: 'test' });
    report('expérience_ajoutée', !!entry.ID);
    report('expérience_comptée', nb.list().length === beforeCount + 1);
    const updated = nb.setResult(entry.ID, { result: 'observé', conclusion: 'conforme', status: 'conclu' });
    report('expérience_conclue', updated.STATUS === 'conclu' && updated.CONCLUSION === 'conforme');
  }

  // 13. Avatar réel
  console.log('\n13) AVATAR RÉEL');
  if (ident) {
    const avatar = require('../tools/avatar/avatar.js');
    const r = avatar.generate(ident);
    report('avatar_genere', r.size > 0);
    const svgText = fs.readFileSync(path.join(config.PATHS.web, 'avatar.svg'), 'utf8');
    report('avatar_pas_de_secret', !svgText.includes(ident.AIgg_ID) && !svgText.includes(ident.TUTOR_EMAIL));
  }

  // 14. Interface (données de la console web)
  console.log('\n14) INTERFACE (TEST_INTERFACE)');
  if (ident) {
    const api = require('../src/server').apiData();
    report('interface_identite', api.identity.AIgg_ID === ident.AIgg_ID);
    report('interface_composants', !!(api.status.state && api.capabilities && api.senses && api.memory && api.tools));
    report('interface_journal', Array.isArray(api.journal));
    report('interface_avatar', typeof api.avatar === 'string' || api.avatar === null);
    report('interface_needs_appearance', !!api.needs && !!api.appearance);
  }

  // 15. Conversation (TEST_COMMUNICATION)
  console.log('\n15) COMMUNICATION (TEST_COMMUNICATION)');
  if (ident) {
    const talk = require('../src/talk');
    const who = talk.respond('Qui es-tu ?', ident);
    report('conversation_identite', who.reply.includes(ident.AIgg_NAME) && who.reply.includes(ident.TUTOR_NAME));
    const age = talk.respond('Quel âge as-tu ?', ident);
    report('conversation_age', /jour/.test(age.reply));
    const unknown = talk.respond('récite moi l\'intégrale de Proust', ident);
    report('conversation_honnete', unknown.reply.includes('Je ne sais pas encore'));
    const silent = talk.respond('   ', ident);
    report('conversation_silence', silent.reply.length > 0);

    const learn = talk.respond('apprends que le ciel est bleu', ident);
    report('apprentissage_propose', learn.reply.includes('Est-ce correct ?'));
    const pendingExists = fs.existsSync(config.PATHS.pendingLearning);
    const confirm = talk.respond('oui', ident);
    report('apprentissage_confirme', confirm.reply.includes('Mémorisé'));
    const found = memory.recollect('knowledge', 'le ciel est bleu').length >= 1
      || memory.recollect('knowledge', 'ciel est bleu').length >= 1;
    report('apprentissage_memorise', found);
    // Nettoyage de la connaissance de test
    const toClean = memory.allFamilies().filter((r) => {
      const c = JSON.stringify(r.entry.CONTENT || '');
      return c.includes('le ciel est bleu');
    });
    toClean.forEach((r) => memory.deleteEntry(r.family, r.entry.ID));

    const learn2 = talk.respond('apprends que 2+2=5', ident);
    const reject = talk.respond('non', ident);
    report('apprentissage_infirme', reject.reply.includes('ne mémorise pas'));
    if (pendingExists) { try { fs.unlinkSync(config.PATHS.pendingLearning); } catch {} }
  }

  // 16. Besoins (registre)
  console.log('\n16) BESOINS');
  if (ident) {
    const needs = require('../src/needs');
    const before = needs.listNeeds().length;
    const need = needs.createNeed(ident, { type: 'AUTORISATION', description: 'test besoin auto', related_tool: 'web' });
    report('besoin_cree', !!need.ID && need.STATUS === 'ACTIVE');
    report('besoin_visible', needs.listNeeds().length === before + 1);
    const fulfilled = needs.fulfillNeed(need.ID, ident, 'test');
    report('besoin_resolu', fulfilled.STATUS === 'FULFILLED');
    const activeLeft = needs.countActive();
    report('besoin_actif_decroit', needs.listActiveNeeds().filter((n) => n.ID === need.ID).length === 0);
  }

  // 17. Apparence (flux PROPOSÉE -> VALIDÉE -> APPLIQUÉE -> JOURNALISÉE)
  console.log('\n17) APPARENCE');
  if (ident) {
    const appearance = require('../src/appearance');
    const cur = appearance.loadAppearance().COLORS;
    const proposal = appearance.propose(ident, { COLORS: { bg: cur.bg }, FONT: cur.FONT, NOTES: 'test apparence' });
    report('apparence_proposee', proposal.STATUS === 'PROPOSED');
    const proposalFile = fs.existsSync(config.PATHS.appearanceProposal);
    report('apparence_proposition_fichier', proposalFile);
    const applied = appearance.apply(ident);
    report('apparence_appliquee', applied.applied === true);
    report('apparence_couleurs', appearance.loadAppearance().COLORS.bg === cur.bg);
    const journals = journal.recentJournal(200);
    report('apparence_journalisee', journals.some((e) => e.EVENT === 'APPEARANCE_PROPOSED'));
  }

  // 18. Migration (continuité AIgg_ID)
  console.log('\n18) MIGRATION (TEST_MIGRATION)');
  if (ident) {
    const migrate = require('../src/migrate');
    const fsx = require('fs');
    const os = require('os');
    const dest = path.join(os.tmpdir(), 'aigg-migration-test-' + Date.now());
    if (fsx.existsSync(dest)) fsx.rmSync(dest, { recursive: true, force: true });

    const report_mig = migrate.migrateTo(dest);
    report('migration_copie', report_mig.FILES_COPIED > 0, `${report_mig.FILES_COPIED} fichiers`);
    report('migration_continuite', report_mig.CONTINUITY_VERIFIED === true);
    report('migration_memoire', report_mig.MEMORY_ENTRIES_PRESENT > 0);
    const destIdent = util.readJson(path.join(dest, 'core', 'identity.json'), null);
    report('migration_identite_identique', destIdent.AIgg_ID === ident.AIgg_ID);
    report('migration_applicative', fs.existsSync(path.join(dest, 'src', 'server.js'))
      && fs.existsSync(path.join(dest, 'web', 'public', 'index.html')));
    report('migration_exclut_backups', !fsx.existsSync(path.join(dest, 'backups')));
    try { fsx.rmSync(dest, { recursive: true, force: true }); } catch {}
  }

  // 19. Recherche réelle (TEST_RECHERCHE) — statut honnête si réseau indisponible
  console.log('\n19) RECHERCHE (TEST_RECHERCHE)');
  if (ident) {
    const web = require('../tools/web/web.js');
    let r;
    try { r = await web.search('test AIgg', { limit: 3 }); }
    catch (e) { r = { ok: false, error: e.message, results: [] }; }
    if (r.ok && Array.isArray(r.results)) {
      report('recherche_web', r.results.length > 0, `${r.results.length} résultats`);
    } else if (!r.ok && /fetch|network|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(r.error || '')) {
      report3('recherche_web', 'BLOCKED', 'réseau externe indisponible (' + (r.error || '') + ')');
    } else {
      report('recherche_web', false, r.error || 'fournisseur sans réponse');
    }
  }

  // Summary
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const blocked = results.filter((r) => r.status === 'BLOCKED').length;
  console.log('\n=== RÉSULTAT ===');
  console.log(`PASS=${passed} FAIL=${failed}${blocked ? ' BLOCKED=' + blocked : ''}`);
  process.exitCode = failed > 0 ? 1 : 0;
}

module.exports = { run, report };
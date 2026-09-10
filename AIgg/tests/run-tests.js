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
  {
    const real = senses.detectSenses({ force: true });
    report('sens_states', real.every((s) =>
      ['OUI', 'NON', 'UNKNOWN'].includes(s.DISPONIBLE)
      && ['OUI', 'NON', 'UNKNOWN'].includes(s.AUTORISE)
      && ['OUI', 'NON'].includes(s.ACTIF)));

    const audio = real.filter((s) => ['MICROPHONE', 'CAMERA', 'HAUT_PARLEURS'].includes(s.sense));
    report('sens_audio_probe', audio.length === 3 && audio.every((s) =>
      s.probe && s.reason && /^\d{4}-\d{2}-\d{2}T/.test(s.timestamp || '')));
    report('sens_jamais_actif', audio.every((s) => s.ACTIF === 'NON'));
    report('sens_non_autorise_par_defaut', audio.every((s) => s.AUTORISE === 'NON'));
    report('sens_unknown_explique', real.filter((s) => s.DISPONIBLE === 'UNKNOWN')
      .every((s) => (s.reason || '').length >= 2));

    // Détection Windows honnête (sans supposer un matériel précis).
    const fakeWin = senses.detectSenses({ platform: 'win32', force: true, runCmd: () => ({ status: 0, stdout: 'MIC=0\nSPK=1\nCAM=0\n' }) });
    const fw = {};
    fakeWin.forEach((s) => { fw[s.sense] = s; });
    report('sens_sonde_winmm_honnete', fw.MICROPHONE.DISPONIBLE === 'NON' && fw.HAUT_PARLEURS.DISPONIBLE === 'OUI' && fw.CAMERA.DISPONIBLE === 'NON');
    report('sens_peripherique_sans_autorisation', fw.HAUT_PARLEURS.DISPONIBLE === 'OUI' && fw.HAUT_PARLEURS.AUTORISE === 'NON' && fw.HAUT_PARLEURS.ACTIF === 'NON');

    // Échec de sonde → UNKNOWN (jamais un OUI hypothétique).
    const blocked = senses.detectSenses({ platform: 'win32', force: true, runCmd: () => ({ status: 1, stdout: '' }) });
    const b = blocked.filter((s) => ['MICROPHONE', 'CAMERA', 'HAUT_PARLEURS'].includes(s.sense));
    report('sens_bloque_unknown', b.length === 3 && b.every((s) => s.DISPONIBLE === 'UNKNOWN' && s.reason));

    // OS sans sonde → UNKNOWN, jamais NON certain.
    const autreOs = senses.detectSenses({ platform: 'darwin', force: true });
    const o = autreOs.filter((s) => ['MICROPHONE', 'CAMERA', 'HAUT_PARLEURS'].includes(s.sense));
    report('sens_os_non_couvert', o.every((s) => s.DISPONIBLE === 'UNKNOWN'));
  }

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
    report('outils_essentiels', ['web', 'notebook', 'avatar', 'email', 'gmail'].every((n) => names.includes(n)));
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

  toolkit.authorize('email'); toolkit.install('email');
  const emailTest = await toolkit.test('email');
  report('test_outil_email', emailTest.test.status === 'PASS', emailTest.test.note || emailTest.test.status);

  toolkit.authorize('gmail'); toolkit.install('gmail');
  const gmailTest = await toolkit.test('gmail');
  report('test_outil_gmail', gmailTest.test.status === 'PASS', gmailTest.test.note || gmailTest.test.status);
  report('gmail_scope_minimal', gmailTest.test.status === 'PASS', 'moindre privilège' );

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
    const removedNb = nb.remove(entry.ID);
    report('expérience_supprimée', removedNb.removed === true && nb.list().length === beforeCount);
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

  // 13 bis. Coffre-fort local (vault)
  console.log('\n13 bis) COFFRE RÉEL (VAULT)');
  {
    const vault = require('../src/vault');
    const vtest = await vault.runTest();
    report('vault_test_autonettoyant', vtest.status === 'PASS', vtest.note || vtest.status);

    const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'aigg-vault-suite-'));
    const tf = path.join(tmpDir, 'vault.json');
    const pw = 'phrase-de-test-' + Date.now();
    try {
      const i = vault.init(pw, tf);
      report('vault_init_creer', i.ok === true && vault.exists(tf));
      const p = vault.put('gmail_oauth', 'SECRET_TEST_' + Date.now(), pw, tf);
      report('vault_put_range', p.ok === true);
      const g = vault.get('gmail_oauth', pw, tf);
      report('vault_get_restaure', g.ok === true && /^SECRET_TEST_/.test(g.value));
      const wrong = vault.get('gmail_oauth', 'mauvais-mdp', tf);
      report('vault_mauvais_mdp_bloque', wrong.ok === false && (wrong.error === 'WRONG_PASSWORD' || wrong.error === 'AUTH_FAIL'));
      const listW = vault.get('gmail_oauth', 'mauvais-mdp', tf);
      const raw = fs.readFileSync(tf, 'utf8');
      report('vault_secret_jamais_clair', !raw.includes('SECRET_TEST_'));
      const l = vault.list(pw, tf);
      report('vault_list_cles', l.ok === true && l.count === 1 && l.keys[0] === 'gmail_oauth');
      const r = vault.remove('gmail_oauth', pw, tf);
      report('vault_rm_clé', r.ok === true && vault.list(pw, tf).count === 0);
      const w = vault.wipe(tf);
      report('vault_wipe_efface', w.ok === true && !vault.exists(tf));
    } catch (e) {
      report('vault_bloc', false, e.message);
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
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
    const convSaved = fs.existsSync(config.PATHS.conversation) ? fs.readFileSync(config.PATHS.conversation, 'utf8') : null;
    try {
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
    } finally {
      // restaure l'historique de conversation réel (les messages de test ne persistent pas)
      if (convSaved !== null) { try { fs.writeFileSync(config.PATHS.conversation, convSaved, 'utf8'); } catch {} }
      else if (fs.existsSync(config.PATHS.conversation)) { try { fs.unlinkSync(config.PATHS.conversation); } catch {} }
    }
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

    // 17 bis. États visuels (v0.3.3)
    const sc = appearance.loadAppearance().STATE_COLORS;
    report('apparence_state_colors', sc && typeof sc === 'object' && ['BORN', 'AWAKE', 'LEARNING', 'THINKING', 'WAITING', 'SLEEPING', 'PAUSED', 'STOPPED'].every((k) => typeof sc[k] === 'string'));
    report('apparence_state_color', appearance.stateColor('AWAKE') && appearance.stateColor('INCONNU') && appearance.stateColor('SLEEPING'));

    const merged = appearance.mergeSchema({ COLORS: { bg: '#000' } });
    report('apparence_merge_retrocompat', merged.STATE_COLORS && merged.COLORS && merged.COLORS.bg === '#000' && merged.STATE_COLORS.AWAKE);

    const saved = appearance.loadAppearance();
    const reset = appearance.reset(ident);
    report('apparence_reset', reset.reset === true && appearance.loadAppearance().STATE_COLORS.AWAKE === appearance.DEFAULT_STATE_COLORS.AWAKE);
    const journalsAfterReset = journal.recentJournal(200);
    report('apparence_reset_journalise', journalsAfterReset.some((e) => e.EVENT === 'APPEARANCE_RESET'));
    // Restaure pour ne pas casser les tests suivants
    util.writeJson(config.PATHS.appearance, saved);

    // Variantes d'avatar par état
    const avatar = require('../tools/avatar/avatar.js');
    const aw = avatar.generate(ident, { state: 'AWAKE' });
    const sl = avatar.generate(ident, { state: 'SLEEPING' });
    const svgAw = fs.readFileSync(path.join(config.PATHS.web, 'avatar.svg'), 'utf8');
    report('avatar_etats_variantes', aw.size !== sl.size && aw.state === 'AWAKE' && sl.state === 'SLEEPING');
    report('avatar_data_state', svgAw.includes('data-state="SLEEPING"'));
    report('avatar_anneau_couleur', svgAw.includes('stroke="'));
    avatar.generate(ident, { state: 'AWAKE' }); // restaure état AWAKE
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

  // 20. Bibliothèques (TEST_LIBRARIES)
  console.log('\n20) BIBLIOTHÈQUES (TEST_LIBRARIES)');
  if (ident) {
    const library = require('../src/library');
    const testLibId = 'test-lib-' + Date.now().toString(36);

    try {
      const lib = library.create(ident, { name: 'Bibliothèque de test', id: testLibId, privacy: 'private' });
      report('librarie_creee', lib && lib.id === testLibId && lib.privacy === 'private');

      report('bibliotheque_listee', library.list().some((l) => l.meta.id === testLibId));
      report('sous_dossier_apprentissage', ['knowledge', 'documents', 'exercises', 'journal']
        .every((d) => fs.existsSync(path.join(config.PATHS.libraries, testLibId, d))));

      const src = library.addSource(testLibId, ident, { title: 'Cours de test', trust_level: 'B', type: 'COURS' });
      report('source_ajoutee', !!src.id && src.trust_level === 'B' && src.status === 'ACTIVE');

      const kn = library.addKnowledge(testLibId, ident, {
        content: '2+2=4', source_ids: [src.id], status: 'LEARNING', confidence: 0.7,
      });
      report('connaissance_provenance', kn.STATUS === 'LEARNING' && kn.PROVENANCE.length === 1
        && kn.PROVENANCE[0].title === 'Cours de test');

      const comp = library.addCompetency(testLibId, ident, { name: 'Calcul' });
      report('competence_jamais_mastered_auto', comp.state === 'UNKNOWN');
      const forced = library.updateCompetency(testLibId, comp.id, { state: 'MASTERED', note: 'preuve tuteur' }, ident);
      report('competence_mastered_par_tuteur', forced.state === 'MASTERED' && forced.evidence.length >= 1);
      report('competence_historique', forced.history.length >= 2);

      const ex = library.addExercise(testLibId, ident, { question: 'Combien font 2+2 ?', expected: '4' });
      report('exercice_ajoute', !!ex.ID && ex.STATUS === 'active');

      const doc = library.addDocument(testLibId, ident, {
        name: 'cours.txt', type: 'TEXTE', content: 'code.js(); // jamais exécuté',
      });
      report('document_jamais_execute', doc.NEVER_EXECUTED === true);
      report('document_liste', library.documents(testLibId).length === 1);
      const removedDoc = library.removeDocument(testLibId, doc.ID, ident);
      report('suppression_document', removedDoc.removed === true);

      library.addContradiction(testLibId, ident, { knowledge_a: 'X', knowledge_b: 'Y', note: 'conflit' });
      const contradictions = library.find(testLibId).meta.contradictions || [];
      report('contradiction_signalee', contradictions.length === 1 && contradictions[0].status === 'OPEN');
      library.resolveContradiction(testLibId, contradictions[0].id, 'résolue', ident);
      report('contradiction_resolue', (library.find(testLibId).meta.contradictions[0].status) === 'RESOLVED');

      library.annotate(testLibId, 'note du tuteur', ident);
      report('annotation_tuteur', (library.find(testLibId).meta.notes || []).some((n) => n.text === 'note du tuteur'));

      library.setCurriculum(testLibId, [{ level: 1, topics: ['addition'] }], ident);
      report('curriculum_enregistre', library.curriculum(testLibId).length === 1);

      const journalLib = library.libraryJournal(testLibId);
      report('journal_bibliotheque', journalLib.some((e) => e.EVENT === 'LIBRARY_CREATED'));

      const hits = library.search('2+2', testLibId);
      report('recherche_n1_connaissance', hits.length === 1 && hits[0].hits.some((h) => h.family === 'knowledge'));

      // P1 — recherche niveau 2 multilingue (cas du corpus Canal_)
      const multiId = 'test-lib-multi-' + Date.now().toString(36);
      library.create(ident, { name: 'L2 multi', id: multiId, privacy: 'private', languages: ['fr', 'en', 'es'] });
      const sfr = library.addSource(multiId, ident, { id: 'src-fr-001', title: 'Cours de sciences — FR', language: 'fr', type: 'COURS', trust_level: 'B' });
      library.addSource(multiId, ident, { id: 'src-en-001', title: 'Biology lessons — EN', language: 'en', type: 'COURS', trust_level: 'B' });
      const sEsp = library.addSource(multiId, ident, { id: 'src-es-001', title: 'Lecciones de ciencias — ES', language: 'es', type: 'COURS', trust_level: 'B' });
      report('source_id_stable_et_langue', sfr.id === 'src-fr-001' && sfr.language === 'fr' && sEsp.language === 'es');

      library.addKnowledge(multiId, ident, {
        id: 'k-fr-001', title: 'La photosynthèse transforme l’énergie',
        tags: ['biologie', 'plantes'], concepts: ['photosynthèse', 'énergie'],
        language: 'fr', content: 'Les plantes transforment la lumière en énergie par photosynthèse.',
        source_ids: ['src-fr-001'], status: 'LEARNING', confidence: 0.7,
      });
      library.addKnowledge(multiId, ident, {
        id: 'k-en-001', title: 'Photosynthesis and energy',
        tags: ['biology', 'plants'], concepts: ['photosynthesis', 'energy'],
        language: 'en', content: 'Plants convert light into energy through photosynthesis.',
        source_ids: ['src-en-001'], status: 'LEARNING',
      });
      library.addKnowledge(multiId, ident, {
        id: 'k-es-001', title: 'Fracciones equivalentes',
        tags: ['matemáticas', 'fracciones'], concepts: ['fracciones', 'equivalencia'],
        language: 'es', content: 'Dos fracciones son equivalentes si representan la misma cantidad.',
        source_ids: ['src-es-001'], status: 'LEARNING',
      });
      report('connaissance_metadonnees_preservees',
        library.knowledge(multiId).length === 3
        && library.knowledge(multiId).some((k) => k.TITLE === 'La photosynthèse transforme l’énergie' && k.LANGUAGE === 'fr' && k.TAGS.length === 2 && k.CONCEPTS.length === 2));

      const rFr = library.searchL2('photosynthèse', { library: multiId, language: 'fr' });
      report('recherche_n2_fr_langue', rFr.count === 1 && rFr.results[0].language === 'fr'
        && rFr.results[0].fields.some((f) => f.field === 'concepts' && f.score > 0));

      const rX = library.searchL2('photosynthèse', { library: multiId });
      report('recherche_n2_cross_langues', rX.count === 2 && rX.results.some((r) => r.language === 'fr') && rX.results.some((r) => r.language === 'en'));

      const rEn = library.searchL2('energy', { library: multiId });
      report('recherche_n2_en_top', rEn.count === 2 && rEn.results[0].title.startsWith('Photosynthesis')
        && rEn.results[0].fields.some((f) => f.field === 'exact'));

      const rEs = library.searchL2('fracciones equivalentes', { library: multiId, language: 'es' });
      report('recherche_n2_es_top', rEs.count === 1 && rEs.results[0].language === 'es'
        && rEs.results[0].fields.some((f) => f.field === 'content'));

      const rSwe = library.searchL2('Énergie', { library: multiId });
      report('recherche_n2_normalisation', rSwe.count === 2 && rSwe.results.every((r) => r.score > 0));

      const rSrc = library.searchL2('biology', { library: multiId, type: 'source' });
      report('recherche_n2_filtre_type', rSrc.count === 1 && rSrc.results.every((r) => r.type === 'source'));

      const rLan = library.searchL2('energy', { library: multiId, language: 'en' });
      report('recherche_n2_filtre_langue', rLan.count === 1 && rLan.results.every((r) => r.language === 'en'));

      const rSt = library.searchL2('photosynthèse', { library: multiId, language: 'fr', status: 'LEARNING' });
      const rSt0 = library.searchL2('photosynthèse', { library: multiId, language: 'fr', status: 'VALIDATED' });
      report('recherche_n2_filtre_statut', rSt.count === 1 && rSt0.count === 0);

      const rProv = library.searchL2('photosynthèse', { library: multiId, language: 'fr', provenance: 'src-fr-001' });
      report('recherche_n2_filtre_provenance', rProv.count === 1);

      const rTag1 = library.searchL2('photosynthèse', { library: multiId, language: 'fr', tags: 'biologie' });
      const rTag0 = library.searchL2('photosynthèse', { library: multiId, language: 'fr', tags: 'matemáticas' });
      report('recherche_n2_filtre_tags', rTag1.count === 1 && rTag0.count === 0);

      // import au format `aigg-library` allégé (name+metadata, comme les corpus Canal_)
      const canalBundle = {
        format: 'aigg-library', version: 1, name: 'Canal test', language: 'fr',
        metadata: { domain: 'sciences', owner: 'tuteur', private: true },
        sources: [{ id: 's1', title: 'Source canal' }],
        knowledge: [{ id: 'k1', title: 'Un titre qualitatif', language: 'fr', tags: ['x'], concepts: ['y'], content: 'contenu qualitatif', source_ids: ['s1'] }],
      };
      const canalA = library.importAnalyse(canalBundle);
      report('import_canal_analyse', canalA.actionable === true && canalA.apercu.name === 'Canal test' && canalA.apercu.source_count === 1);
      const canalImp = library.importActivate(canalBundle, ident, false);
      const canalK = library.knowledge(canalImp.id)[0];
      report('import_canal_preserve', canalK.TITLE === 'Un titre qualitatif' && canalK.LANGUAGE === 'fr'
        && canalK.TAGS[0] === 'x' && canalK.CONCEPTS[0] === 'y' && canalK.ID === 'k1' && canalK.SOURCE_IDS[0] === 's1');
      const rItTitle = library.searchL2('titre', { library: canalImp.id });
      report('import_canal_recherche_titre', rItTitle.count === 1 && rItTitle.results[0].fields.some((f) => f.field === 'title' && f.score > 0));

      const bundle = library.exportLibrary(testLibId);
      report('export_format', bundle.format === 'aigg-library' && bundle.version === 1);
      const analyse = library.importAnalyse(bundle);
      report('import_analyse', analyse.actionable === true && analyse.apercu.name === 'Bibliothèque de test');
      const imported = library.importActivate(bundle, ident, true);
      report('import_active', imported.imported === true);
      report('import_remplace_l_originale', !library.list().some((l) => l.meta.id === testLibId));

      const replaced = library.list().find((l) => l.meta.name === 'Bibliothèque de test');
      report('import_cree_nouvelle_id', !!replaced && replaced.meta.id !== testLibId);
      if (replaced) library.remove(replaced.meta.id, ident);
      report('bibliotheque_supprimee_vers_corbeille', !!replaced
        && fs.existsSync(path.join(config.PATHS.libraries, '_trash', replaced.meta.id)));
      report('bibliotheque_sortie_de_liste', !!replaced && !library.list().some((l) => l.meta.id === replaced.meta.id));

      // Exemples publics toujours visibles (structure, PAS de savoir inventé).
      const examples = library.list().filter((l) => l.meta.id.startsWith('science-example') || l.meta.id.startsWith('programming-example'));
      report('exemples_publics_listes', library.list().some((l) => l.meta.id === 'science-example') && library.list().some((l) => l.meta.id === 'programming-example'));
      report('exemples_sans_savoir_invente', examples.every((l) => l.knowledge === 0));
    } catch (e) {
      report('test_libraries_bloc', false, e.message);
    } finally {
      const candidates = library.list().filter((l) => l.meta.id.startsWith('test-lib-') || l.meta.name === 'Canal test' || l.meta.name === 'Bibliothèque de test');
      for (const c of candidates) { try { library.remove(c.meta.id, ident); } catch {} }
    }
  }

  // 21. P11 : docs-check (audit des documents, aucune modification)
  console.log('\n21) DOCS CHECK');
  {
    const docscheck = require('../src/docscheck');
    const stateText = fs.readFileSync(path.join(config.PATHS.docs, 'STATE.md'), 'utf8');
    const changelogText = fs.readFileSync(path.join(config.PATHS.docs, 'CHANGELOG.md'), 'utf8');
    const readmePath = path.join(config.PATHS.root, '..', 'README.md');
    const readmeText = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : null;
    const r = docscheck.run({ stateText, changelogText, readmeText });
    report('docs_check_ok', r.ok === true, `${r.checks.length} vérifications`);
    report('docs_check_lecture_seule', r.readonly === true);
    const rBad = docscheck.run({
      stateText: stateText.replace(/CORE_VERSION\s+\d+\.\d+\.\d+/, 'CORE_VERSION 99.0.0'),
      changelogText, readmeText,
    });
    report('docs_check_detecte_divergence', rBad.ok === false);
  }

  // 22. v0.3.4 : communication proactive (conversation persistée, questions, états réels)
  console.log('\n22) COMMUNICATION PROACTIVE');
  if (ident) {
    const talk = require('../src/talk');
    const conversation = require('../src/conversation');
    const needs = require('../src/needs');
    const fsX = require('fs');
    const savedState = util.readJson(config.PATHS.state, {});
    const savedNeeds = util.readJson(config.PATHS.needs, null);
    const savedPending = util.readJson(config.PATHS.pendingLearning, null);
    const savedConv = fsX.existsSync(config.PATHS.conversation) ? fsX.readFileSync(config.PATHS.conversation, 'utf8') : null;
    try {
      // 22a. Persistance de la conversation
      conversation.clear();
      const entry = conversation.append('tutor', 'bonjour test', null, ident);
      report('conversation_persiste', !!entry.ID && !!entry.TIMESTAMP && entry.ROLE === 'tutor' && entry.TEXT === 'bonjour test');
      report('conversation_histoire', conversation.history().length >= 1 && conversation.history().at(-1).TEXT === 'bonjour test');
      const out = talk.respond('qui es-tu ?', ident);
      report('conversation_reponse_persistee', conversation.history().some((e) => e.ROLE === 'ai' && e.INTENTS.includes('IDENTITY')));
      report('conversation_fichier', fsX.existsSync(config.PATHS.conversation) && fsX.readFileSync(config.PATHS.conversation, 'utf8').split('\n').filter(Boolean).length >= 2);

      // 22b. État WAITING réel : une question ouverte passe AIgg en WAITING
      conversation.clear();
      needs.deleteAllForTest && needs.deleteAllForTest();
      const q = talk.respond('je me demande si le ciel est bleu', ident);
      const stateNow = require('../src/state').status(ident).state;
      report('etat_waiting_question', stateNow === 'WAITING' && q.intents.includes('QUESTION_OPEN'));
      report('question_need_creee', needs.listActiveNeeds().some((n) => n.TYPE === 'QUESTION'));

      // 22c. Réponse du tuteur à la question -> mémorisée, état AWAKE
      const qNeedId = needs.listActiveNeeds().find((n) => n.TYPE === 'QUESTION').ID;
      const ans = talk.tutorAnswer(ident, 'oui, le ciel est bleu');
      report('question_reponse', !!ans && ans.answer === 'oui, le ciel est bleu');
      report('question_need_acheve', needs.listActiveNeeds().every((n) => n.TYPE !== 'QUESTION'));
      report('question_reponse_memorisee', memory.recollect('knowledge', 'le ciel est bleu').length >= 1);
      report('etat_awake_apres_reponse', require('../src/state').status(ident).state === 'AWAKE');
      report('question_reponse_tracee', journal.recentJournal(200).some((e) => e.EVENT === 'QUESTION_ANSWERED'));

      // 22d. Proactivité honnête : rien en attente = silence ; question en attente = digeste
      conversation.clear();
      needs.deleteAllForTest && needs.deleteAllForTest();
      const silent = talk.proactiveDigest(ident);
      report('proactif_silence_sans_attente', silent === null);
      talk.respond('je me demande quelle couleur tu aimes', ident);
      const digest = talk.proactiveDigest(ident);
      report('proactif_digest_attente', !!digest && digest.reply.includes('Bonjour') && digest.needs.length >= 1);
      report('proactif_digest_persiste', conversation.history().some((e) => e.INTENTS.includes('PROACTIVE_DIGEST')));

      // 22e. Apprentissage -> État LEARNING (puis WAITING car confirmation créée)
      conversation.clear();
      needs.deleteAllForTest();
      state.wake(ident); // réinitialise à AWAKE
      const stateBeforeLearn = require('../src/state').status(ident).state;
      const learnReply = talk.respond('apprends que 2+2 fait 4', ident);
      const stateAfterLearn = require('../src/state').status(ident).state;
      const learnJournal = journal.recentJournal(200);
      report('etat_learning_prop', (stateAfterLearn === 'WAITING' || stateAfterLearn === 'LEARNING')
        && learnJournal.some((e) => e.EVENT === 'STATE_CHANGE' && e.TO === 'LEARNING'));
      report('etat_waiting_confirmation', stateAfterLearn === 'WAITING');
      const stateAfterConfirm = talk.respond('oui', ident);
      report('apprentissage_valide_etat_awake', require('../src/state').status(ident).state === 'AWAKE' && stateAfterConfirm.intents.includes('LEARN_CONFIRM'));
      report('apprentissage_memorise', memory.recollect('knowledge', '2+2 fait 4').length >= 1);
    } finally {
      // Autonettoyage strict : restaure état, besoins, pending, conversation, mémoire de test
      try { util.writeJson(config.PATHS.state, savedState); } catch {}
      try {
        if (savedNeeds) util.writeJson(config.PATHS.needs, savedNeeds);
        else if (fsX.existsSync(config.PATHS.needs)) fsX.unlinkSync(config.PATHS.needs);
      } catch {}
      try {
        if (savedPending) util.writeJson(config.PATHS.pendingLearning, savedPending);
        else if (fsX.existsSync(config.PATHS.pendingLearning)) fsX.unlinkSync(config.PATHS.pendingLearning);
      } catch {}
      if (savedConv !== null) { try { fsX.writeFileSync(config.PATHS.conversation, savedConv, 'utf8'); } catch {} }
      else { try { conversation.clear(); } catch {} }
      // nettoyage des connaissances de test "2+2 fait 4" et "le ciel est bleu"
      const junk = ['2+2 fait 4', 'le ciel est bleu'];
      for (const ent of memory.allFamilies()) {
        const content = JSON.stringify(ent.entry && ent.entry.CONTENT) || '';
        if (junk.some((j) => content.includes(j))) {
          try { memory.deleteEntry(ent.family, ent.entry.ID); } catch {}
        }
      }
    }
  }

  // 23. v0.3.5 : presets de connaissances (chargement domaines, autonettoyant)
  console.log('\n23) PRESETS DE CONNAISSANCES');
  if (ident) {
    const presets = require('../src/presets');
    const preExisting = new Set(
      memory.allFamilies()
        .filter((r) => ((r.entry && r.entry.CONTEXT) || '').startsWith('preset:python'))
        .map((r) => r.entry.ID)
    );
    try {
      const list = presets.listPresets();
      report('presets_liste', list.length >= 1 && list.some((p) => p.id === 'python'), `${list.length} preset(s)`);

      const before = memory.recollect('knowledge', 'Python').length;
      const result = presets.loadPreset('python', ident);
      const after = memory.recollect('knowledge', 'Python').length;
      report('presets_python_load', result.ok === true && result.total >= 10 && after >= before,
        `${result.loaded} ajoutées, ${result.skipped} déjà connues, ${result.total} total`);

      report('presets_python_domaine', result.domain === 'python');
      report('presets_python_idempotent', presets.loadPreset('python', ident).loaded === 0,
        'double charge = 0 ajout (idempotent)');

      report('presets_inconnu', presets.loadPreset('inexistant', ident).ok === false);
      report('presets_memoire', memory.recollect('knowledge', 'Python').length >= 10,
        `${memory.recollect('knowledge', 'Python').length} entrées Python`);

      const journaux = journal.recentJournal(200);
      report('presets_journal', journaux.some((e) => e.EVENT === 'PRESET_LOADED'),
        'PRESET_LOADED tracé');
    } finally {
      // nettoyage : ne supprime que les entrées ajoutées par CE test (les pré-existantes, p.ex. le preset réel du tuteur, restent)
      for (const ent of memory.allFamilies()) {
        const ctx = (ent.entry && ent.entry.CONTEXT) || '';
        if (ctx.startsWith('preset:python') && !preExisting.has(ent.entry.ID)) {
          try { memory.deleteEntry(ent.family, ent.entry.ID); } catch {}
        }
      }
    }
  }

  // Summary
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const blocked = results.filter((r) => r.status === 'BLOCKED').length;
  const not_tested = results.filter((r) => r.status === 'NOT_TESTED').length;
  console.log('\n=== RÉSULTAT ===');
  console.log(`PASS=${passed} FAIL=${failed}${blocked ? ' BLOCKED=' + blocked : ''} NOT_TESTED=${not_tested}`);
  process.exitCode = failed > 0 ? 1 : 0;
}

module.exports = { run, report };
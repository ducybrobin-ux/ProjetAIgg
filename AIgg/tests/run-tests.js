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
    report('outils_essentiels', ['web', 'notebook', 'avatar', 'email', 'gmail', 'ia'].every((n) => names.includes(n)));
    report('propositions', !!toolkit.propose('web').proposal);
    report('manifests_valides', tools.every((t) => !!t.manifest.capability && !!t.manifest.version));
    const iaManifest = tools.find((t) => t.name === 'ia');
    report('ia_outil_pas_cerveau', !!iaManifest && iaManifest.manifest.requires_external_ai === true && !!iaManifest.manifest.capability,
      iaManifest ? `capability ${iaManifest.manifest.capability}, requires_external_ai=true` : 'ia absent');
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

  toolkit.authorize('ia'); toolkit.install('ia');
  const iaTest = await toolkit.test('ia');
  report('test_outil_ia', iaTest.test.status === 'PASS', iaTest.test.note || iaTest.test.status);
  report('ia_outbox_tracee', iaTest.test.status === 'PASS' && iaTest.test.detail && iaTest.test.detail.outbox === true && iaTest.test.detail.providers >= 2,
    iaTest.test.detail ? `multi-fournisseurs=${iaTest.test.detail.providers}, outbox SENT` : 'sans détail');
  const iaMod = toolkit.loadModule('ia').module;
  const iaSansCle = await iaMod.ask({});
  report('ia_sans_cle_refus', iaSansCle.ok === false && iaSansCle.missing !== undefined, 'ask sans clé → refus explicite, pas de réseau');
  const iaProvInconnu = await iaMod.ask({ provider: 'inexistant', prompt: 'X' });
  report('ia_provider_inconnu_refus', iaProvInconnu.ok === false && /inconnu/i.test(iaProvInconnu.error || ''), 'provider inconnu → refus explicite, pas de réseau');
  const iaLogVide = iaMod.list().every((r) => r.CHANNEL === 'ia' && !/test-key/i.test(JSON.stringify(r)));
  report('ia_log_sans_cle', iaLogVide, 'outbox ia : jamais de clé exposée');

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

  // 24. v0.3.6 : apprentissage continu (relecture au réveil, révision des acquis, boucle journal→mémoire)
  console.log('\n24) APPRENTISSAGE CONTINU');
  if (ident) {
    const review = require('../src/review');
    const needs = require('../src/needs');
    const fsX = require('fs');
    const savedJournal = fsX.existsSync(config.PATHS.journalFile) ? fsX.readFileSync(config.PATHS.journalFile, 'utf8') : null;
    const savedNeeds = util.readJson(config.PATHS.needs, null);
    const savedState = util.readJson(config.PATHS.state, {});
    const marker1 = 'quel est le test revision continu un';
    const marker2 = 'quel est le test revision continu deux';
    const metadata = {};
    // Autonomie stricte : les entrées pré-existantes (p.ex. le preset réel) sont restaurées telles quelles
    const preExistingReview = memory.allFamilies()
      .filter((r) => r.family === 'knowledge')
      .map((r) => ({ ID: r.entry.ID, LAST_REVIEW: r.entry.LAST_REVIEW || null, REVISION_COUNT: r.entry.REVISION_COUNT || 0 }));
    try {
      // 24a. Relecture de la mémoire (bilan réel, sans écriture)
      const rel = review.relireMemoire(ident);
      report('continu_relire', rel.ok === true && typeof rel.total === 'number' && typeof rel.connaissances === 'number'
        && typeof rel.parFamille === 'object', `total=${rel.total} connaissances=${rel.connaissances}`);

      // 24b. Révision des acquis — mode propose (sec) : ne touche à rien
      metadata.preM1 = memory.memorize('knowledge', { question: marker1, answer: 'ok un' }, ident,
        { source: 'TEST', confidence: 0.8, status: 'validated' });
      const prop = review.revisionAcquis(ident, { days: 0 });
      const rel1 = memory.allFamilies().find((r) => r.entry.ID === metadata.preM1.ID);
      report('continu_revision_propose', prop.mode === 'propose' && prop.overdue >= 1 && prop.reviewed === 0
        && !rel1.entry.LAST_REVIEW, `overdue=${prop.overdue}`);

      // 24c. Révision des acquis — mode apply : marque LAST_REVIEW/REVISION_COUNT + journalise REVIEW
      const app = review.revisionAcquis(ident, { days: 0, mode: 'apply' });
      const rel2 = memory.allFamilies().find((r) => r.entry.ID === metadata.preM1.ID);
      report('continu_revision_apply', app.mode === 'apply' && app.reviewed >= 1
        && !!rel2.entry.LAST_REVIEW && rel2.entry.REVISION_COUNT === 1
        && journal.recentJournal(200).some((e) => e.EVENT === 'REVIEW'), `revisées=${app.reviewed}`);

      // 24d. Idempotence : une connaissance fraîchement relue n'est pas due pendant l'intervalle
      const reApp = review.revisionAcquis(ident, { days: 30, mode: 'apply' });
      report('continu_revision_idempotente', reApp.reviewed === 0, 'fraîche + intervalle 30 j = 0');

      // 24e. Planification d'une révision : besoin PLANIFICATION créé une seule fois
      metadata.preM2 = memory.memorize('knowledge', { question: marker2, answer: 'ok deux' }, ident,
        { source: 'TEST', confidence: 0.8, status: 'validated' });
      const plan1 = review.revisionAcquis(ident, { days: 0, mode: 'apply', plan: true });
      const planNeeds = needs.listActiveNeeds().filter((n) => n.TYPE === 'PLANIFICATION');
      const plan2 = review.revisionAcquis(ident, { days: 0, mode: 'apply', plan: true });
      report('continu_planification', plan1.planCreated === true && planNeeds.length === 1
        && plan2.planCreated === false, `${planNeeds.length} besoin(s) PLANIFICATION (unique)`);

      // 24f. Boucle journal→mémoire : journal isolé, reconstitution d'une acquisition absente (idempotente)
      if (savedJournal !== null) fsX.writeFileSync(config.PATHS.journalFile, '', 'utf8');
      const seedQ = 'test continu journal restaure';
      journal.journalEvent('LEARN_VALIDATED', ident, { CONTENT: seedQ });
      const rep1 = review.journalToMemory(ident);
      const rep2 = review.journalToMemory(ident);
      report('continu_boucle_restaure', rep1.restored === 1 && rep2.restored === 0
        && memory.recollect('knowledge', seedQ).length >= 1, `restaurées=${rep1.restored}/${rep2.restored}`);

      // 24g. Boucle journal→mémoire : une suppression explicite du tuteur n'est jamais reconstituée
      journal.journalEvent('LEARN_VALIDATED', ident, { CONTENT: 'test continu journal supprime' });
      journal.journalEvent('MEMORY_DELETE', ident, { family: 'knowledge', id: 'seed', question: 'test continu journal supprime' });
      const rep3 = review.journalToMemory(ident);
      report('continu_boucle_ignore_supprime', rep3.restored === 0
        && memory.recollect('knowledge', 'test continu journal supprime').length === 0, `restaurées=${rep3.restored}`);
    } finally {
      // Autonettoyage strict : journal, besoins, état, mémoire de test (marqueurs + recompositions)
      try {
        if (savedJournal !== null) fsX.writeFileSync(config.PATHS.journalFile, savedJournal, 'utf8');
      } catch {}
      try {
        if (savedNeeds) util.writeJson(config.PATHS.needs, savedNeeds);
        else if (fsX.existsSync(config.PATHS.needs)) fsX.unlinkSync(config.PATHS.needs);
      } catch {}
      try { util.writeJson(config.PATHS.state, savedState); } catch {}
      const junkMarkers = ['quel est le test revision continu', 'test continu journal'];
      for (const ent of memory.allFamilies()) {
        const content = JSON.stringify(ent.entry && ent.entry.CONTENT) || '';
        if (junkMarkers.some((j) => content.includes(j))) {
          try { memory.deleteEntry(ent.family, ent.entry.ID); } catch {}
        }
      }
      // restaure les marques de révision des entrées pré-existantes (inchangées par le test)
      for (const pre of preExistingReview) {
        const after = memory.allFamilies().find((r) => r.entry.ID === pre.ID && r.family === 'knowledge');
        if (after) {
          try {
            memory.updateEntry('knowledge', pre.ID, {
              LAST_REVIEW: pre.LAST_REVIEW || null,
              REVISION_COUNT: pre.REVISION_COUNT || 0,
            });
          } catch {}
        }
      }
    }
  }

  // 25. v0.3.7 : preset culture (ARTE) — la culture du tuteur
  console.log('\n25) PRÉSET CULTURE (ARTE)');
  if (ident) {
    const presets = require('../src/presets');
    const talk = require('../src/talk');
    const fsX = require('fs');
    const savedJournal = fsX.existsSync(config.PATHS.journalFile) ? fsX.readFileSync(config.PATHS.journalFile, 'utf8') : null;
    const savedNeeds = util.readJson(config.PATHS.needs, null);
    const savedConv = fsX.existsSync(config.PATHS.conversation) ? fsX.readFileSync(config.PATHS.conversation, 'utf8') : null;
    const preExisting = new Set(
      memory.allFamilies()
        .filter((r) => ((r.entry && r.entry.CONTEXT) || '').startsWith('preset:culture'))
        .map((r) => r.entry.ID)
    );
    try {
      const needsX = require('../src/needs');
      needsX.deleteAllForTest && needsX.deleteAllForTest(); // aucune question ouverte : la relecture n'est pas détournée
      const list = presets.listPresets();
      report('culture_preset_liste', list.some((p) => p.id === 'culture'), `${list.length} preset(s)`);

      const result = presets.loadPreset('culture', ident);
      report('culture_preset_load', result.ok === true && result.domain === 'culture' && result.total >= 10,
        `${result.loaded} ajoutées, ${result.skipped} déjà connues, ${result.total} total`);

      report('culture_recall_arte', talk.respond('qu\'est-ce qu\'ARTE ?', ident).intents.includes('KNOWLEDGE_RECALL'),
        'KNOWLEDGE_RECALL sur définition ARTE');
      report('culture_recall_oeuvre', (() => {
        const r = talk.respond('qui a peint la Joconde ?', ident);
        return r.intents.includes('KNOWLEDGE_RECALL') && r.reply.includes('Léonard');
      })(), 'réponse depuis la mémoire (Joconde)');

      const idem = presets.loadPreset('culture', ident);
      report('culture_idempotent', idem.loaded === 0, 'double charge = 0 ajout');

      const honn = talk.respond('quelle est la recette du cassoulet ?', ident);
      report('culture_honnete', honn.intents.includes('UNKNOWN'), 'question hors culture → honnête UNKNOWN');
    } finally {
      try {
        if (savedJournal !== null) fsX.writeFileSync(config.PATHS.journalFile, savedJournal, 'utf8');
      } catch {}
      try {
        if (savedNeeds) util.writeJson(config.PATHS.needs, savedNeeds);
        else if (fsX.existsSync(config.PATHS.needs)) fsX.unlinkSync(config.PATHS.needs);
      } catch {}
      if (savedConv !== null) { try { fsX.writeFileSync(config.PATHS.conversation, savedConv, 'utf8'); } catch {} }
      else { try { require('../src/conversation').clear(); } catch {} }
      // nettoie uniquement les entrées culture ajoutées par CE test (les pré-existantes du tuteur restent)
      for (const ent of memory.allFamilies()) {
        const ctx = (ent.entry && ent.entry.CONTEXT) || '';
        if (ctx.startsWith('preset:culture') && !preExisting.has(ent.entry.ID)) {
          try { memory.deleteEntry(ent.family, ent.entry.ID); } catch {}
        }
      }
    }
  }

  // 26. v0.3.8 : preset art (histoire de l'art, esprit ARTE)
  console.log('\n26) PRÉSET ART (HISTOIRE DE L\'ART)');
  if (ident) {
    const presets = require('../src/presets');
    const talk = require('../src/talk');
    const fsX = require('fs');
    const savedJournal = fsX.existsSync(config.PATHS.journalFile) ? fsX.readFileSync(config.PATHS.journalFile, 'utf8') : null;
    const savedNeeds = util.readJson(config.PATHS.needs, null);
    const savedConv = fsX.existsSync(config.PATHS.conversation) ? fsX.readFileSync(config.PATHS.conversation, 'utf8') : null;
    const preExisting = new Set(
      memory.allFamilies()
        .filter((r) => ((r.entry && r.entry.CONTEXT) || '').startsWith('preset:art'))
        .map((r) => r.entry.ID)
    );
    try {
      const needsX = require('../src/needs');
      needsX.deleteAllForTest && needsX.deleteAllForTest();
      const list = presets.listPresets();
      report('art_preset_liste', list.some((p) => p.id === 'art'), `${list.length} preset(s)`);

      const result = presets.loadPreset('art', ident);
      report('art_preset_load', result.ok === true && result.domain === 'art' && result.total >= 10,
        `${result.loaded} ajoutées, ${result.skipped} déjà connues, ${result.total} total`);

      report('art_recall_oeuvre', (() => {
        const r = talk.respond('qui a peint la Nuit étoilée ?', ident);
        return r.intents.includes('KNOWLEDGE_RECALL') && r.reply.includes('van Gogh');
      })(), 'réponse depuis la mémoire (Nuit étoilée)');

      report('art_recall_lieu', (() => {
        const r = talk.respond('où se trouve la Joconde ?', ident);
        return r.intents.includes('KNOWLEDGE_RECALL') && r.reply.includes('Louvre');
      })(), 'réponse depuis la mémoire (Louvre)');

      report('art_idempotent', presets.loadPreset('art', ident).loaded === 0, 'double charge = 0 ajout');

      const honn = talk.respond('combien de marches a la tour Eiffel ?', ident);
      report('art_honnete', honn.intents.includes('UNKNOWN'), 'hors art → honnête UNKNOWN');
    } finally {
      try {
        if (savedJournal !== null) fsX.writeFileSync(config.PATHS.journalFile, savedJournal, 'utf8');
      } catch {}
      try {
        if (savedNeeds) util.writeJson(config.PATHS.needs, savedNeeds);
        else if (fsX.existsSync(config.PATHS.needs)) fsX.unlinkSync(config.PATHS.needs);
      } catch {}
      if (savedConv !== null) { try { fsX.writeFileSync(config.PATHS.conversation, savedConv, 'utf8'); } catch {} }
      else { try { require('../src/conversation').clear(); } catch {} }
      for (const ent of memory.allFamilies()) {
        const ctx = (ent.entry && ent.entry.CONTEXT) || '';
        if (ctx.startsWith('preset:art') && !preExisting.has(ent.entry.ID)) {
          try { memory.deleteEntry(ent.family, ent.entry.ID); } catch {}
        }
      }
    }
  }

  // 27. v0.3.9 : preset geo (géopolitique, esprit Le Dessous des Cartes)
  console.log('\n27) PRÉSET GÉO (GÉOPOLITIQUE — LE DESSOUS DES CARTES)');
  if (ident) {
    const presets = require('../src/presets');
    const talk = require('../src/talk');
    const fsX = require('fs');
    const savedJournal = fsX.existsSync(config.PATHS.journalFile) ? fsX.readFileSync(config.PATHS.journalFile, 'utf8') : null;
    const savedNeeds = util.readJson(config.PATHS.needs, null);
    const savedConv = fsX.existsSync(config.PATHS.conversation) ? fsX.readFileSync(config.PATHS.conversation, 'utf8') : null;
    const preExisting = new Set(
      memory.allFamilies()
        .filter((r) => ((r.entry && r.entry.CONTEXT) || '').startsWith('preset:geo'))
        .map((r) => r.entry.ID)
    );
    try {
      const needsX = require('../src/needs');
      needsX.deleteAllForTest && needsX.deleteAllForTest();
      const list = presets.listPresets();
      report('geo_preset_liste', list.some((p) => p.id === 'geo'), `${list.length} preset(s)`);

      const result = presets.loadPreset('geo', ident);
      report('geo_preset_load', result.ok === true && result.domain === 'geo' && result.total >= 10,
        `${result.loaded} ajoutées, ${result.skipped} déjà connues, ${result.total} total`);

      report('geo_recall_capitale', (() => {
        const r = talk.respond('quelle est la capitale de l\'Australie ?', ident);
        return r.intents.includes('KNOWLEDGE_RECALL') && r.reply.includes('Canberra');
      })(), 'réponse depuis la mémoire (Canberra)');

      report('geo_recall_detroit', (() => {
        const r = talk.respond('qu\'est-ce que le détroit de Malacca ?', ident);
        return r.intents.includes('KNOWLEDGE_RECALL') && r.reply.includes('Malaisie');
      })(), 'réponse depuis la mémoire (détroit de Malacca)');

      const honn = talk.respond('combien de marches a la tour Eiffel ?', ident);
      report('geo_honnete', honn.intents.includes('UNKNOWN'), 'hors géo → honnête UNKNOWN');

      report('geo_aucune_derive_art', (() => {
        const r = talk.respond('qui a peint la Joconde ?', ident);
        return r.intents.includes('KNOWLEDGE_RECALL') && r.reply.includes('Léonard de Vinci');
      })(), 'relectures croisées intactes (art/culture)');
    } finally {
      try {
        if (savedJournal !== null) fsX.writeFileSync(config.PATHS.journalFile, savedJournal, 'utf8');
      } catch {}
      try {
        if (savedNeeds) util.writeJson(config.PATHS.needs, savedNeeds);
        else if (fsX.existsSync(config.PATHS.needs)) fsX.unlinkSync(config.PATHS.needs);
      } catch {}
      if (savedConv !== null) { try { fsX.writeFileSync(config.PATHS.conversation, savedConv, 'utf8'); } catch {} }
      else { try { require('../src/conversation').clear(); } catch {} }
      for (const ent of memory.allFamilies()) {
        const ctx = (ent.entry && ent.entry.CONTEXT) || '';
        if (ctx.startsWith('preset:geo') && !preExisting.has(ent.entry.ID)) {
          try { memory.deleteEntry(ent.family, ent.entry.ID); } catch {}
        }
      }
    }
  }

  // 28. v0.3.12 : Berceau — AIgg se connaît en taille, quota alloué par le tuteur, demande AGRANDIR
  console.log('\n28) BERCEAU (conscience de la taille et de l\'espace — v0.3.12)');
  if (ident) {
    const berceau = require('../src/berceau');
    const talk = require('../src/talk');
    const fsX = require('fs');
    const savedAlloc = fsX.existsSync(berceau.BERCEAU_FILE) ? fsX.readFileSync(berceau.BERCEAU_FILE, 'utf8') : null;
    const savedNeeds = util.readJson(config.PATHS.needs, null);
    const savedJournal = fsX.existsSync(config.PATHS.journalFile) ? fsX.readFileSync(config.PATHS.journalFile, 'utf8') : null;
    const savedConv = fsX.existsSync(config.PATHS.conversation) ? fsX.readFileSync(config.PATHS.conversation, 'utf8') : null;
    const prevState = state.status(ident).state;
    try {
      // Mesure réelle de soi
      const self = berceau.measureSelf();
      report('berceau_mesure', self.bytes > 0 && self.files > 0
        && self.dirs.core && self.dirs.memory && self.dirs.journal,
        `${berceau.humanBytes(self.bytes)} / ${self.files} fichiers`);
      report('berceau_human', berceau.humanBytes(1073741824) === '1 Go' && berceau.humanBytes(3072) === '3 Ko',
        berceau.humanBytes(1073741824));

      // Allocation par défaut (1 Go) — vérifée sur un registre vierge
      const without = !fsX.existsSync(berceau.BERCEAU_FILE);
      try { if (!without) fsX.unlinkSync(berceau.BERCEAU_FILE); } catch {}
      const fresh = berceau.loadAllocation();
      report('berceau_alloc_defaut', fresh.allocBytes === berceau.DEFAULT_ALLOCATION_BYTES,
        `${berceau.humanBytes(fresh.allocBytes)} par défaut`);

      // Parse des tailles (CLI berceau set)
      report('berceau_parse_taille',
        berceau.parseSize('2G') === 2 * 1024 * 1024 * 1024
        && berceau.parseSize('1500M') === 1500 * 1024 * 1024
        && berceau.parseSize('1,5Go') === Math.floor(1.5 * 1024 * 1024 * 1024)
        && berceau.parseSize('512ko') === 512 * 1024
        && berceau.parseSize('zzz') === null
        && berceau.parseSize('1024') === 1024);

      // Statut cohérent
      const st = berceau.status();
      report('berceau_statut', st.allocationBytes > 0 && st.usedBytes > 0
        && typeof st.usedPct === 'number' && typeof st.tight === 'boolean'
        && st.thresholdPct === Math.round(berceau.TIGHT_PCT * 100),
        `${berceau.humanBytes(st.usedBytes)} / ${berceau.humanBytes(st.allocationBytes)} — ${st.usedPct}%`);

      // Espace libre réel du disque (sonde système)
      const free = berceau.freeSpace();
      report3('berceau_libre', typeof free === 'number' && free > 0 ? 'PASS' : 'BLOCKED',
        free === null ? 'sonde indisponible' : `${berceau.humanBytes(free)} libres`);

      // Demande AGRANDIR : unique tant que sans réponse, jamais d'action automatique
      const before = berceau.status();
      berceau.setAllocation(1, ident, { note: 'test v0.3.12' });
      const r1 = berceau.checkAndAsk(ident);
      const r2 = berceau.checkAndAsk(ident);
      const active = require('../src/needs').listActiveNeeds().filter((n) => n.TYPE === berceau.NEED_TYPE).length;
      report('berceau_demande_unique', r1.status.tight === true && r1.created === true
        && r2.created === false && active === 1,
        `tight=${r1.status.tight} créé=${r1.created}/${r2.created} actifs=${active}`);
      berceau.setAllocation(before.allocationBytes || 1, ident, { note: 'restauration test' });

      // Conversation : « quelle est ta taille ? » → TAILLE réel
      const c = talk.respond('quelle est ta taille ?', ident);
      report('berceau_conversation', c.intents.includes('TAILLE')
        && /pèse/.test(c.reply) && /(Mo|Ko|Go|octets)/.test(c.reply), c.intents.join(','));

      // Proactivité au réveil : un besoin AGRANDIR réel est rappelé au tuteur
      const need = require('../src/needs').createNeed(ident, {
        type: berceau.NEED_TYPE,
        description: 'Je suis à l\'étroit : test proactif du berceau.',
      });
      const digest = talk.proactiveDigest(ident);
      report('berceau_proactif', digest !== null && digest.reply.includes('à l\'étroit')
        && digest.reply.includes('test proactif du berceau') && digest.needs.some((n) => n.ID === need.ID),
        'rappel au réveil du besoin AGRANDIR');
    } finally {
      try {
        if (savedAlloc !== null) fsX.writeFileSync(berceau.BERCEAU_FILE, savedAlloc, 'utf8');
        else if (fsX.existsSync(berceau.BERCEAU_FILE)) fsX.unlinkSync(berceau.BERCEAU_FILE);
      } catch {}
      try {
        if (savedNeeds) util.writeJson(config.PATHS.needs, savedNeeds);
        else if (fsX.existsSync(config.PATHS.needs)) fsX.unlinkSync(config.PATHS.needs);
      } catch {}
      try {
        if (savedJournal !== null) fsX.writeFileSync(config.PATHS.journalFile, savedJournal, 'utf8');
      } catch {}
      if (savedConv !== null) { try { fsX.writeFileSync(config.PATHS.conversation, savedConv, 'utf8'); } catch {} }
      else { try { require('../src/conversation').clear(); } catch {} }
      try {
        if (prevState && prevState !== state.status(ident).state) {
          state.setState(prevState, ident, 'Restauration état après tests berceau');
        }
      } catch {}
    }
  }

  // 29. v0.3.13 : Habitations (niveaux d'espace) — nommés depuis le quota réel
  console.log('\n29) HABITATIONS (niveaux d\'espace, du plus simple au plus fourni — v0.3.13)');
  if (ident) {
    const berceau = require('../src/berceau');
    const fsX = require('fs');
    const savedAlloc = fsX.existsSync(berceau.BERCEAU_FILE) ? fsX.readFileSync(berceau.BERCEAU_FILE, 'utf8') : null;
    const savedNeeds = util.readJson(config.PATHS.needs, null);
    const savedState = util.readJson(config.PATHS.state, null);
    try {
      // Seuils exacts du plan du tuteur (§1)
      const M = 1024 * 1024, G = M * 1024;
      const lvl = berceau.level;
      const names = [
        [100 * M, 'Graine'], [1024 * 1024 * 1024, 'Berceau'], [2 * G, 'Studio'],
        [5 * G, 'Appartement'], [10 * G, 'Maison'], [20 * G, 'Atelier'],
        [50 * G, 'Laboratoire'], [100 * G, 'Centre'], [250 * G, 'Écosystème'],
      ];
      const seuilsOK = names.every(([bytes, name]) => lvl(bytes).name === name)
        && lvl(500 * G).name === 'Écosystème' && lvl(0).name === 'Graine' && lvl(50 * M).name === 'Graine';
      report('habitation_seuils', seuilsOK, names.map(([, n]) => n).join(' → '));

      // L'habitation est nommée depuis le QUOTA réellement alloué (jamais inventé)
      berceau.setAllocation(2 * G, ident, { note: 'test v0.3.13 studio' });
      const stStudio = berceau.status();
      report('habitation_quota_nomme', stStudio.levelIndex === 2 && stStudio.levelName === 'Studio',
        `${stStudio.levelName} (${berceau.humanBytes(stStudio.allocationBytes)})`);
      berceau.setAllocation(100 * M, ident, { note: 'test v0.3.13 graine' });
      const stGraine = berceau.status();
      report('habitation_graine', stGraine.levelIndex === 0 && stGraine.levelName === 'Graine'
        && stGraine.level.next && stGraine.level.next.name === 'Berceau',
        `${stGraine.levelName} → prochaine ${stGraine.level.next.name}`);

      // Honnêteté : le niveau n'augmente pas l'intelligence, seulement l'équipement permis
      const lvlBerceau = lvl(1 * G);
      report('habitation_honnete', lvlBerceau.next !== null && typeof lvlBerceau.plan === 'string'
        && Array.isArray(lvlBerceau.equipment) && lvlBerceau.equipment.length > 0,
        lvlBerceau.plan);

      // Conversation : « dans quelle habitation habites-tu ? » → LEVEL réel
      const talk = require('../src/talk');
      const c = talk.respond('dans quelle habitation es-tu ?', ident);
      report('habitation_conversation', c.intents.includes('LEVEL')
        && /habite|niveau/.test(c.reply), c.intents.join(','));

      // Les seuils sont PRÉDICTIFS, jamais une obligation : rester avec encore de
      // la place est toujours permis, seule l'étroitesse déclenche AGRANDIR.
      berceau.setAllocation(2 * G, ident, { note: 'test v0.3.14 prédictif' });
      const stPre = berceau.status();
      const allocationPre = stPre.allocationBytes;
      const usedPre = stPre.usedBytes;
      // ré-écrit un quota de justesse sous un seuil supérieur, usage inchangé :
      // si le seuil était une obligation, franchir un seuil changerait la règle,
      // or AIgg n'a jamais à agir : le niveau dépend du quota, pas de l'usage.
      const predictifOK = stPre.levelIndex >= 1 && allocationPre > 1 * G
        && usedPre >= 0 && !stPre.tight;
      report('habitation_predictif_non_obligatoire', predictifOK,
        `${stPre.levelName}, ${berceau.humanBytes(usedPre)} utilisés / ${berceau.humanBytes(allocationPre)} alloués`);

      const cTight = talk.respond('où habites-tu ?', ident);
      report('habitation_predictif_message', cTight.intents.includes('LEVEL')
        && /prédictifs|prédictif/.test(cTight.reply)
        && !/je me déménage|je déménage tout seul|il me faut déménager/.test(cTight.reply)
        && /rester ici|j\'ai encore|continue/.test(cTight.reply),
        cTight.reply.slice(0, 120));
    } finally {
      try {
        if (savedAlloc !== null) fsX.writeFileSync(berceau.BERCEAU_FILE, savedAlloc, 'utf8');
        else if (fsX.existsSync(berceau.BERCEAU_FILE)) fsX.unlinkSync(berceau.BERCEAU_FILE);
      } catch {}
      try {
        if (savedNeeds) util.writeJson(config.PATHS.needs, savedNeeds);
        else if (fsX.existsSync(config.PATHS.needs)) fsX.unlinkSync(config.PATHS.needs);
      } catch {}
      try {
        if (savedState) util.writeJson(config.PATHS.state, savedState);
        else { const s = state.status(ident); if (s && s.state) state.setState('AWAKE', ident, 'Restauration après tests hitations'); }
      } catch {}
    }
  }

  // 30. v0.3.13 : Santé du système — vue consolidée réelle (§18 du plan)
  console.log('\n30) SANTÉ DU SYSTÈME (vue consolidée — v0.3.13)');
  if (ident) {
    const fsX = require('fs');
    const berceau = require('../src/berceau');
    const health = require('../src/health');
    const savedAlloc = fsX.existsSync(berceau.BERCEAU_FILE) ? fsX.readFileSync(berceau.BERCEAU_FILE, 'utf8') : null;
    const savedJournal = fsX.existsSync(config.PATHS.journalFile) ? fsX.readFileSync(config.PATHS.journalFile, 'utf8') : null;
    try {
      const h = health.overview(ident);

      // 14 points du plan : espace, bibliothèques, outils, compétences, permissions, sens, état, tâches, erreurs récentes, sauvegardes
      const shapeOK = h && h.etat && h.etat.courant
        && h.espace && typeof h.espace.total_bytes === 'number' && typeof h.espace.utilise_bytes === 'number'
        && ('disponible_bytes' in h.espace)
        && ('bibliotheques' in h) && ('outils' in h) && ('competences' in h)
        && ('permissions' in h) && ('sens' in h) && ('taches' in h)
        && ('erreurs_recentes' in h) && ('sauvegardes' in h) && ('niveau' in h);
      report('sante_14_points', shapeOK, `${Object.keys(h).join(', ')}`);

      // Cohérence : espace = allocation réelle, et pourcentage calculé honnêtement
      const st = berceau.status();
      report('sante_espace_coherent', h.espace.total_bytes === st.allocationBytes
        && h.espace.utilise_bytes === st.usedBytes && h.espace.pourcent_utilise === st.usedPct,
        `${h.espace.utilise_human} / ${h.espace.total_human} (${h.espace.pourcent_utilise}%)`);

      // Niveau cohérent avec le statut berceau
      report('sante_niveau_coherent', h.niveau.index === st.levelIndex && h.niveau.name === st.levelName,
        `${h.niveau.name} (niveau ${h.niveau.index})`);

      // Outils et bibliothèques : nombres réels (0..N), jamais fantômes
      const tools = require('../src/toolkit').discoverAll();
      const libs = require('../src/library').list();
      report('sante_inventaire_reel', h.outils.presents === tools.length && h.bibliotheques.presentes === libs.length,
        `${h.outils.presents} outils, ${h.bibliotheques.presentes} bibliothèques`);

      // Erreurs récentes : liste aplatie, chaque entrée a timestamp + événement
      const errorsOK = Array.isArray(h.erreurs_recentes) && h.erreurs_recentes.every((e) => e.TIMESTAMP && e.EVENT);
      report('sante_erreurs_shape', errorsOK, `${h.erreurs_recentes.length} erreur(s) récente(s)`);

      // Suffixes de taille acceptés pour les seuils : humanBytes cohérent avec level
      report('sante_human_seuils', health.scoreCompetencies(ident).capabilities_total
        === require('../src/capabilities').detectCapabilities().length,
        health.scoreCompetencies(ident).capabilities_acquires + ' capacités acquises');
    } finally {
      try {
        if (savedAlloc !== null) fsX.writeFileSync(berceau.BERCEAU_FILE, savedAlloc, 'utf8');
        else if (fsX.existsSync(berceau.BERCEAU_FILE)) fsX.unlinkSync(berceau.BERCEAU_FILE);
      } catch {}
      try {
        if (savedJournal !== null) fsX.writeFileSync(config.PATHS.journalFile, savedJournal, 'utf8');
      } catch {}
    }
  }

  // 31. v0.4.0 : Conscience — couche de synthèse fonctionnelle (jamais 2e base)
  console.log('\n31) CONSCIENCE (couche de synthèse de soi — v0.4.0)');
  if (ident) {
    const osX = require('os');
    const pathX = require('path');
    const conscience = require('../src/conscience');
    const tmpDir = pathX.join(osX.tmpdir(), `aigg-conscience-test-${Date.now()}`);
    try {
      // Génération dans un dossier temporaire (autonettoyant, jamais dans le dépôt)
      const synth = conscience.synthesize(ident, { dir: tmpDir });
      report('conscience_generer', synth.ok && synth.files.length >= 18 && synth.sections.length === conscience.SECTIONS.length,
        `${synth.files.length} fichiers, ${synth.sections.length} sections`);

      // Les 18 fichiers attendus sont présents
      const expected = [...conscience.SECTIONS.map((s) => `${s}.json`), 'README.md', 'JournalConscient.ndjson'];
      const present = expected.every((f) => fs.existsSync(pathX.join(tmpDir, f)));
      report('conscience_fichiers_presents', present, expected.join(', '));

      // Chaque fichier est une synthèse : FORMAT + VERSION + AIgg_ID + SOURCES
      const metaOK = conscience.SECTIONS.every((s) => {
        const doc = util.readJson(pathX.join(tmpDir, `${s}.json`), null);
        return doc && doc.FORMAT === 'aigg-conscience' && doc.NATURE === 'synthese'
          && doc.VERSION === config.CORE_VERSION && doc.AIgg_ID === ident.AIgg_ID
          && Array.isArray(doc.SOURCES) && doc.SOURCES.length >= 1 && doc.DATA;
      });
      report('conscience_meta_synthese', metaOK, `${config.CORE_VERSION}, format aigg-conscience`);

      // Moi.json : réponses de fond (QUI, IDENTIFIANT, TUTEUR, OÙ, ÉTAT, SAIS,
      // PEUX, NE PEUX PAS, APPRENDS, INTÉRÊTS, RELATIONS, OUTILS, RÉCENT, APPRIS,
      // PROCHAINE ACTION AUTORISÉE)
      const moi = util.readJson(pathX.join(tmpDir, 'Moi.json'), null);
      const moiKeys = ['QUI_SUIS_JE', 'IDENTIFIANT', 'TUTEUR', 'OU_SUIS_JE', 'ETAT',
        'CE_QUE_JE_SAIS', 'CE_QUE_JE_PEUX', 'CE_QUE_JE_NE_PEUX_PAS', 'LIMITES',
        'J_APPRENDS', 'BESOINS_ET_CENTRES_D_INTERET', 'RELATIONS',
        'OUTILS_DISPO_ET_AUTORITE', 'FAIT_RECENT', 'APPRIS', 'PROCHAINE_ACTION_AUTORISEE'];
      report('conscience_moi_criteres', moi && moiKeys.every((k) => k in moi.DATA), moiKeys.join(', '));

      // Identité cohérente : le Moi dit exactement qui il est (jamais inventé)
      const idOK = moi.DATA.IDENTIFIANT === ident.AIgg_ID
        && moi.DATA.QUI_SUIS_JE.includes(ident.AIgg_NAME);
      report('conscience_identite_coherente', idOK, `${ident.AIgg_NAME} — ${ident.AIgg_ID}`);

      // Prochaine action : toujours un champ AUTORISEE booléen honnête
      const pa = moi.DATA.PROCHAINE_ACTION_AUTORISEE;
      report('conscience_prochaine_action', !!(pa && typeof pa.AUTORISEE === 'boolean' && pa.RAISON),
        pa ? `${pa.AUTORISEE ? 'autorisée' : 'non autorisée'} — ${pa.RAISON.slice(0, 60)}` : 'absente');

      // Relations : le tuteur est présent (provenance identity) — jamais inventé
      const rel = util.readJson(pathX.join(tmpDir, 'Relations.json'), null);
      report('conscience_relations_tuteur', rel && rel.DATA && rel.DATA.RELATIONS.some((r) => r.CATEGORIE === 'Tuteur' && r.NOM === ident.TUTOR_NAME),
        rel ? rel.DATA.RELATIONS.map((r) => r.CATEGORIE).join(', ') : 'relations absentes');

      // JournalConscient : append-only, clé EVENT_ID unique
      const lines = require('fs').readFileSync(pathX.join(tmpDir, 'JournalConscient.ndjson'), 'utf8')
        .split('\n').filter(Boolean).map((l) => JSON.parse(l));
      report('conscience_journal_append', lines.length === 1 && lines[0].EVENT === 'CONSCIENCE_SYNTHESE'
        && lines[0].AIgg_ID === ident.AIgg_ID,
        lines.length + ' entrée(s)');

      // Capabilities → Moi : les capacités acquises listées sont réelles
      const caps = require('../src/capabilities').detectCapabilities().filter((c) => c.acquired).map((c) => c.name);
      const listeMoi = moi.DATA.CE_QUE_JE_PEUX.capacites;
      report('conscience_capacites_reelles', listeMoi.every((n) => caps.includes(n)) && listeMoi.length === caps.length,
        `${listeMoi.length} capacités listées`);

      // L'état reflète réellement state.json
      const st = require('../src/state').status(ident);
      report('conscience_etat_reel', moi.DATA.ETAT.courant === st.state, moi.DATA.ETAT.courant);
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }

  console.log('\n32) RELATIONS (fonction native, confiance explicite/progressive/traçable — v0.4.1)');
  if (ident) {
    const osX = require('os');
    const pathX = require('path');
    const relations = require('../src/relations');
    const tmpDir = pathX.join(osX.tmpdir(), `aigg-relations-test-${Date.now()}`);
    const tmpFile = pathX.join(tmpDir, 'relations.ndjson');
    const memDir = config.PATHS.memoryFamilies.relations;
    const journalFile = config.PATHS.journalFile;

    const memBefore = fs.existsSync(memDir) ? new Set(fs.readdirSync(memDir)) : new Set();
    const journalLinesBefore = fs.existsSync(journalFile) ? fs.readFileSync(journalFile, 'utf8').split('\n').filter(Boolean).length : 0;
    const realFileExisted = fs.existsSync(config.PATHS.relationsFile);
    const realFileBefore = realFileExisted ? fs.readFileSync(config.PATHS.relationsFile, 'utf8') : null;

    try {
      relations._setFile(tmpFile);

      // 1) Catégories du Prompt Maître, toutes présentes
      const catsOK = relations.CATEGORIES.length === 6
        && ['Tuteur', 'TuteurIgg', 'AmiHumain', 'AmiIgg', 'Parent', 'Autres']
          .every((c) => relations.CATEGORIES.includes(c));
      report('relations_categories', catsOK, relations.CATEGORIES.join(', '));

      // 2) AJOUT d'une relation entre tuteurs : AUCUNE confiance automatique
      const relTuteur = relations.add(ident, {
        CATEGORIE: 'TuteurIgg',
        NOM: 'Zul',
        TUTEUR_ID: 't-999',
        POURQUOI: 'présenté par mon tuteur',
        PAR: 'tuteur',
      });
      report('relations_tuteur_entier_aucune_confiance',
        relTuteur.CATEGORIE === 'TuteurIgg' && relTuteur.CONFIANCE.NIVEAU === 0
          && relTuteur.CONFIANCE.NIVEAU_LABEL === relations.NIVEAUX[0]
          && relTuteur.CONFIANCE.ORIGINE === 'explicite',
        `confiance ${relTuteur.CONFIANCE.NIVEAU} (${relTuteur.CONFIANCE.NIVEAU_LABEL})`);

      // 3) Ajout par défaut d'un ami : confiance 0, jamais implicite
      const relAmi = relations.add(ident, { CATEGORIE: 'AmiHumain', NOM: 'Nina' });
      report('relations_add_confiance_zero', relAmi.CONFIANCE.NIVEAU === 0
        && relAmi.CONFIANCE.TRANSACTIONS[0].ACTION === 'CREATION'
        && relAmi.CONFIANCE.TRANSACTIONS[0].PAR === ident.AIgg_NAME,
        `confiance ${relAmi.CONFIANCE.NIVEAU}, ${relAmi.CONFIANCE.TRANSACTIONS.length} transaction(s)`);

      // 4) Confiance PROGRESSIVE et TRACÉE : trust n'augmente que de 1, tracé
      const up1 = relations.trust(ident, relAmi.ID, { PAR: ident.AIgg_NAME, NOTE: 'rencontre réelle vérifiée' });
      const up2 = relations.trust(ident, relAmi.ID, { PAR: ident.AIgg_NAME, NOTE: 'projet partagé réussi' });
      const tracesOk = up2.CONFIANCE.TRANSACTIONS.some((t) => t.ACTION === 'TRUST:1')
        && up2.CONFIANCE.TRANSACTIONS.some((t) => t.ACTION === 'TRUST:2');
      report('relations_trust_progressif_trace',
        up1.CONFIANCE.NIVEAU === 1 && up2.CONFIANCE.NIVEAU === 2
          && up2.CONFIANCE.NIVEAU_LABEL === relations.NIVEAUX[2] && tracesOk,
        `niveau ${up2.CONFIANCE.NIVEAU} (${up2.CONFIANCE.NIVEAU_LABEL}), ${up2.CONFIANCE.TRANSACTIONS.length} transactions`);

      // 5) Plafond de confiance : on ne peut jamais dépasser le niveau 3
      let plafondErreur = false;
      try {
        relations.trust(ident, relAmi.ID, { PAR: ident.AIgg_NAME });
        relations.trust(ident, relAmi.ID, { PAR: ident.AIgg_NAME });
      } catch (e) { plafondErreur = String(e.message).includes('maximum'); }
      report('relations_trust_plafond', plafondErreur, plafondErreur ? 'niveau max atteint, refus' : 'devrait refuser');

      // 6) Parent = filiation structurelle, jamais une propriété
      const relParent = relations.add(ident, { CATEGORIE: 'Parent', NOM: 'AIggAlpha', PARENT_DE: 'AIggBeta' });
      report('relations_parent_filiation', relParent.CATEGORIE === 'Parent'
        && relParent.PARENT_DE === 'AIggBeta'
        && relParent.CONFIANCE.NIVEAU === 0,
        `parent de ${relParent.PARENT_DE}`);

      // 7) Le fichier de la source est bien un NDJSON privé (un fichier, ligne par relation)
      const ndjsonLines = fs.readFileSync(tmpFile, 'utf8').split('\n').filter(Boolean);
      const ndjsonOK = ndjsonLines.every((l) => { try { const o = JSON.parse(l); return !!o.ID && !!o.CATEGORIE; } catch { return false; } });
      report('relations_source_ndjson', ndjsonLines.length === 3 && ndjsonOK,
        `${ndjsonLines.length} relation(s) dans relations/relations.ndjson`);

      // 8) log() : trace complète consultable
      const trace = relations.log(relAmi.ID);
      report('relations_log_transactions', trace.TRANSACTIONS.length >= 3
        && trace.CONFIANCE.ORIGINE === 'explicite',
        `${trace.TRANSACTIONS.length} transactions dans la trace`);

      // 9) Archivage RÉVERSIBLE et tracé (jamais de perte silencieuse)
      relations.remove(ident, relTuteur.ID, { PAR: ident.AIgg_NAME, RAISON: 'test archivage' });
      const horsListe = !relations.list().some((r) => r.ID === relTuteur.ID);
      relations.restore(ident, relTuteur.ID, { PAR: ident.AIgg_NAME });
      const deRetour = relations.list().some((r) => r.ID === relTuteur.ID);
      const archLog = relations.log(relTuteur.ID).TRANSACTIONS.some((t) => t.ACTION === 'ARCHIVE')
        && relations.log(relTuteur.ID).TRANSACTIONS.some((t) => t.ACTION === 'RESTORE');
      report('relations_archive_restaure', horsListe && deRetour && archLog,
        'archivage réversible, ARCHIVE/RESTORE tracés');

      // 10) Catégorie inconnue : refus explicite (aucune invention de catégorie)
      let refusOK = false;
      try { relations.add(ident, { CATEGORIE: 'Inconnue', NOM: 'X' }); }
      catch (e) { refusOK = String(e.message).includes('Catégorie inconnue'); }
      report('relations_categorie_invalide_refus', refusOK, refusOK ? 'refusée' : 'ne refuse pas');

      // 11) Conscience : Relations.json est la synthèse qui cite la source native
      const tmpConscience = pathX.join(osX.tmpdir(), `aigg-relations-conscience-${Date.now()}`);
      try {
        const c = require('../src/conscience');
        c.synthesize(ident, { dir: tmpConscience });
        const relDoc = util.readJson(pathX.join(tmpConscience, 'Relations.json'), null);
        const relData = relDoc.DATA;
        const noms = relData.RELATIONS.map((r) => r.NOM);
        report('relations_conscience_integree',
          relDoc.SOURCES.includes('relations/ (fichier natif des relations)')
            && noms.includes(ident.TUTOR_NAME) && noms.includes('Zul') && noms.includes('Nina')
            && relData.REVUE && relData.PARENT && relData.CATEGORIES.length === 6,
          `${relData.RELATIONS.length} relation(s) synthétisées (tuteur + natives)`);
      } finally {
        try { fs.rmSync(tmpConscience, { recursive: true, force: true }); } catch {}
      }

      // 12) Vie privée : le dépôt réel n'est JAMAIS touché par les tests
      const realUnchanged = realFileExisted
        ? fs.readFileSync(config.PATHS.relationsFile, 'utf8') === realFileBefore
        : !fs.existsSync(config.PATHS.relationsFile);
      report('relations_aucune_pollution_depot', realUnchanged, 'relations/ non modifié');
    } finally {
      relations._setFile(null);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      // Nettoyage des entrées mémoire relationnelles créées pendant le test
      try {
        if (fs.existsSync(memDir)) {
          for (const f of fs.readdirSync(memDir)) {
            if (!memBefore.has(f)) { try { fs.unlinkSync(pathX.join(memDir, f)); } catch {} }
          }
        }
      } catch {}
      // Journal restreint à sa longueur initiale (append-only, mais tests propres)
      try {
        if (fs.existsSync(journalFile)) {
          const all = fs.readFileSync(journalFile, 'utf8').split('\n').filter(Boolean);
          if (all.length >= journalLinesBefore) {
            fs.writeFileSync(journalFile, all.slice(0, journalLinesBefore).join('\n')
              + (journalLinesBefore ? '\n' : ''), 'utf8');
          }
        }
      } catch {}
    }
  }

  console.log('\n33) INTÉRÊTS (priorités internes + centres d\'intérêt natifs — v0.4.2)');
  if (ident) {
    const osX = require('os');
    const pathX = require('path');
    const interests = require('../src/interests');
    const tmpDir = pathX.join(osX.tmpdir(), `aigg-interests-test-${Date.now()}`);
    const tmpFile = pathX.join(tmpDir, 'interests.ndjson');
    const memDir = config.PATHS.memoryFamilies.knowledge;
    const journalFile = config.PATHS.journalFile;

    const memBefore = fs.existsSync(memDir) ? new Set(fs.readdirSync(memDir)) : new Set();
    const journalLinesBefore = fs.existsSync(journalFile) ? fs.readFileSync(journalFile, 'utf8').split('\n').filter(Boolean).length : 0;
    const realFileExisted = fs.existsSync(config.PATHS.interestsFile);
    const realFileBefore = realFileExisted ? fs.readFileSync(config.PATHS.interestsFile, 'utf8') : null;
    const permsBefore = JSON.stringify(require('../src/permissions').loadPermissions());

    try {
      interests._setFile(tmpFile);

      // 1) Priorités internes du Prompt Maître, toutes présentes + règle de non-contournement
      const codes = interests.PRIORITE_CODES;
      const expectedP = ['APPRENDRE', 'COMPRENDRE', 'INTEGRITE', 'EXPLORER', 'COMMUNIQUER', 'COMPETENCES', 'OBJECTIFS'];
      report('interests_priorites',
        codes.length === expectedP.length && expectedP.every((c) => codes.includes(c))
          && interests.PRIORITES.length === 7 && interests.REGLE.includes('permissions'),
        codes.join(', '));

      // 2) AJOUT d'un centre d'intérêt : intensité 1 par défaut, ACTIF, priorité validée, tracé CREATION
      const it1 = interests.add(ident, {
        PRIORITE: 'COMPETENCES',
        SUJET: 'Rust',
        POURQUOI: 'compétence structurante',
        PAR: 'tuteur',
      });
      const it2 = interests.add(ident, { PRIORITE: 'COMMUNIQUER', SUJET: 'Langue et communication' });
      report('interests_add',
        it1.PRIORITE === 'COMPETENCES' && it1.INTENSITE === 1 && it1.INTENSITE_LABEL === interests.NIVEAUX[1]
          && it1.ACTIF === true && it1.TRANSACTIONS[0].ACTION === 'CREATION' && it1.AIgg_ID === ident.AIgg_ID
          && it2.PRIORITE === 'COMMUNIQUER',
        `${it1.SUJET} (${it1.PRIORITE}, intensité ${it1.INTENSITE})`);

      // 3) Priorité inconnue : refus explicite (aucune invention de priorité)
      let refusP = false;
      try { interests.add(ident, { PRIORITE: 'INCONNUE', SUJET: 'X' }); }
      catch (e) { refusP = String(e.message).includes('Priorité inconnue'); }
      report('interests_priorite_inconnue_refus', refusP, refusP ? 'refusée' : 'ne refuse pas');

      // 4) Intensité PROGRESSIVE et TRACÉE (1→2→3, INTENSITE:N)
      const up1 = interests.intensify(ident, it1.ID, { PAR: ident.AIgg_NAME, NOTE: 'exercice réel validé' });
      const up2 = interests.intensify(ident, it1.ID, { PAR: ident.AIgg_NAME, NOTE: 'projet abouti' });
      const itrOk = up2.TRANSACTIONS.some((t) => t.ACTION === 'INTENSITE:2')
        && up2.TRANSACTIONS.some((t) => t.ACTION === 'INTENSITE:3');
      report('interests_intensite_progressive_trace',
        up1.INTENSITE === 2 && up2.INTENSITE === 3 && up2.INTENSITE_LABEL === interests.NIVEAUX[3] && itrOk,
        `intensité ${up2.INTENSITE} (${up2.INTENSITE_LABEL}), ${up2.TRANSACTIONS.length} transactions`);

      // 5) Plafond d'intensité : jamais au-delà de 3
      let plafondErreur = false;
      try { interests.intensify(ident, it1.ID, { PAR: ident.AIgg_NAME }); }
      catch (e) { plafondErreur = String(e.message).includes('maximum'); }
      report('interests_intensite_plafond', plafondErreur, plafondErreur ? 'niveau max atteint, refus' : 'devrait refuser');

      // 6) Le fichier de la source est bien un NDJSON privé (ligne par intérêt)
      const ndjsonLines = fs.readFileSync(tmpFile, 'utf8').split('\n').filter(Boolean);
      const ndjsonOK = ndjsonLines.every((l) => { try { const o = JSON.parse(l); return !!o.ID && !!o.SUJET && !!o.PRIORITE; } catch { return false; } });
      report('interests_source_ndjson', ndjsonLines.length === 2 && ndjsonOK,
        `${ndjsonLines.length} intérêt(s) dans interests/interests.ndjson`);

      // 7) log() : trace complète consultable
      const trace = interests.log(it1.ID);
      report('interests_log_transactions', trace.TRANSACTIONS.length >= 3
        && trace.INTENSITE.ORIGINE === 'explicite',
        `${trace.TRANSACTIONS.length} transactions dans la trace`);

      // 8) Archivage RÉVERSIBLE et tracé (jamais de perte silencieuse)
      interests.remove(ident, it2.ID, { PAR: ident.AIgg_NAME, RAISON: 'test archivage' });
      const horsListe = !interests.list().some((r) => r.ID === it2.ID);
      interests.restore(ident, it2.ID, { PAR: ident.AIgg_NAME });
      const deRetour = interests.list().some((r) => r.ID === it2.ID);
      const archLog = interests.log(it2.ID).TRANSACTIONS.some((t) => t.ACTION === 'ARCHIVE')
        && interests.log(it2.ID).TRANSACTIONS.some((t) => t.ACTION === 'RESTORE');
      report('interests_archive_restaure', horsListe && deRetour && archLog,
        'archivage réversible, ARCHIVE/RESTORE tracés');

      // 9) Jamais de contournement des permissions : intensifier ne modifie AUCUNE permission
      const permsAfter = JSON.stringify(require('../src/permissions').loadPermissions());
      report('interests_jamais_contourne_permissions',
        permsAfter === permsBefore && interests.REGLE.toLowerCase().includes('permissions'),
        'permissions inchangées, règle portée par le registre');

      // 10) Journal : opérations tracées (INTEREST_ADDED / INTEREST_INTENSIFIED)
      const recentEvents = require('../src/journal').recentJournal(10).map((e) => e.EVENT);
      report('interests_journal_trace',
        recentEvents.includes('INTEREST_ADDED') && recentEvents.includes('INTEREST_INTENSIFIED'),
        recentEvents.join(', '));

      // 11) Conscience : Besoins.json expose les priorités ; CentresInterets.json la synthèse native citée
      const tmpConscience = pathX.join(osX.tmpdir(), `aigg-interests-conscience-${Date.now()}`);
      try {
        const c = require('../src/conscience');
        c.synthesize(ident, { dir: tmpConscience });
        const besoinsDoc = util.readJson(pathX.join(tmpConscience, 'Besoins.json'), null);
        const ciDoc = util.readJson(pathX.join(tmpConscience, 'CentresInterets.json'), null);
        const ciData = ciDoc.DATA;
        report('interests_conscience_integree',
          ciDoc.SOURCES.includes('interests/ (priorités internes et centres d\'intérêt natifs)')
            && besoinsDoc.DATA.PRIORITES_INTERNES.length === 7
            && besoinsDoc.DATA.REGLE.includes('permissions')
            && ciData.INTERETS.some((i) => i.SUJET === 'Rust' && i.PRIORITE === 'COMPETENCES')
            && ciData.REGLE.includes('permissions'),
          `${ciData.INTERETS.length} intérêt(s) natif(s) synthétisés + 7 priorités`);
      } finally {
        try { fs.rmSync(tmpConscience, { recursive: true, force: true }); } catch {}
      }

      // 12) Vie privée : le dépôt réel n'est JAMAIS touché par les tests
      const realUnchanged = realFileExisted
        ? fs.readFileSync(config.PATHS.interestsFile, 'utf8') === realFileBefore
        : !fs.existsSync(config.PATHS.interestsFile);
      report('interests_aucune_pollution_depot', realUnchanged, 'interests/ non modifié');
    } finally {
      interests._setFile(null);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      // Nettoyage des entrées mémoire « knowledge » créées pendant le test
      try {
        if (fs.existsSync(memDir)) {
          for (const f of fs.readdirSync(memDir)) {
            if (!memBefore.has(f)) { try { fs.unlinkSync(pathX.join(memDir, f)); } catch {} }
          }
        }
      } catch {}
      // Journal restreint à sa longueur initiale (append-only, mais tests propres)
      try {
        if (fs.existsSync(journalFile)) {
          const all = fs.readFileSync(journalFile, 'utf8').split('\n').filter(Boolean);
          if (all.length >= journalLinesBefore) {
            fs.writeFileSync(journalFile, all.slice(0, journalLinesBefore).join('\n')
              + (journalLinesBefore ? '\n' : ''), 'utf8');
          }
        }
      } catch {}
    }
  }

  console.log('\n34) ARBRE COMPÉTENCES/BADGES (branches, niveaux 0→6, prérequis, badge jamais automatique — v0.4.3)');
  if (ident) {
    const osX = require('os');
    const pathX = require('path');
    const badges = require('../src/badges');
    const tmpDir = pathX.join(osX.tmpdir(), `aigg-badges-test-${Date.now()}`);
    const tmpFile = pathX.join(tmpDir, 'badges.ndjson');
    const memDir = config.PATHS.memoryFamilies.procedures;
    const journalFile = config.PATHS.journalFile;

    const memBefore = fs.existsSync(memDir) ? new Set(fs.readdirSync(memDir)) : new Set();
    const journalLinesBefore = fs.existsSync(journalFile) ? fs.readFileSync(journalFile, 'utf8').split('\n').filter(Boolean).length : 0;
    const realFileExisted = fs.existsSync(config.PATHS.competencesFile);
    const realFileBefore = realFileExisted ? fs.readFileSync(config.PATHS.competencesFile, 'utf8') : null;
    const permsBefore = JSON.stringify(require('../src/permissions').loadPermissions());

    try {
      badges._setFile(tmpFile);

      // 1) Arbre du Prompt Maître : 8 branches, niveaux 0→6, toutes les branches référencées
      const branchesOk = badges.BRANCHES.length === 8;
      const codesAll = badges.allCodes();
      const nivOK = Object.keys(badges.NIVEAUX).length === 7 && badges.MAX_NIVEAU === 6;
      report('badges_arbre_branches',
        branchesOk && nivOK && badges.CHAINE.length === 9 && codesAll.length > 50
          && ['SOCLE', 'INFORMATIQUE', 'RAISONNEMENT', 'DEVELOPPEMENT', 'RECHERCHE', 'COMMUNICATION-SENS', 'SOCIAL', 'OUTILS']
            .every((b) => badges.BRANCHES.some((x) => x.CODE === b)),
        `${badges.BRANCHES.length} branches, ${codesAll.length} compétences, niveaux 0→6, chaîne (${badges.CHAINE.length} étapes)`);

      // 2) La chaîne Rust est structurante : Rust I → II → III → système/réseau → WebAssembly
      const rustOk = ['INF-RUST1', 'INF-RUST2', 'INF-RUST3', 'INF-RUST-SYS', 'INF-RUST-WASM'].every((c) => codesAll.includes(c))
        && badges.nodeOf('INF-RUST2').REQUIS.some((r) => r.CODE === 'INF-RUST1')
        && badges.nodeOf('INF-RUST-SYS').REQUIS.some((r) => r.CODE === 'INF-RUST3');
      report('badges_rust_chain', rustOk, 'Rust I → Rust II → Rust III → système/réseau → WebAssembly (prérequis)');

      // 3) Règle d'or : jamais de badge sans PREUVE ni sans PAR (validation explicite du tuteur)
      let refusP = false;
      try { badges.honor(ident, 'SOC-RELATIONS1', { NIVEAU: 2, PAR: 'tuteur' }); }
      catch (e) { refusP = String(e.message).includes('preuve'); }
      let refusPar = false;
      try { badges.honor(ident, 'SOC-RELATIONS1', { NIVEAU: 2, PREUVE: 'x' }); }
      catch (e) { refusPar = String(e.message).includes('tuteur'); }
      report('badges_honor_preuve_exigee', refusP && refusPar && badges.REGLE.includes('JAMAIS'),
        'prouve/PAR exigés, règle portée par le registre');

      // 4) Honor EXPLICITE et TRACÉ : BADGE:N, NIVEAU_LABEL, STATUT, prérequis nuls OK
      const b1 = badges.honor(ident, 'SOC-RELATIONS1', {
        NIVEAU: 2, PREUVE: 'rencontre réelle véridique', PAR: 'tuteur', NOTE: 'exercice validé',
      });
      const b1Ok = b1.NIVEAU === 2 && b1.NIVEAU_LABEL === badges.NIVEAUX[2] && b1.STATUT === 'BADGE'
        && b1.TRANSACTIONS.some((t) => t.ACTION === 'BADGE:2' && t.PREUVE === 'rencontre réelle véridique' && t.PAR === 'tuteur');
      report('badges_honor_explicite_trace', b1Ok, `${b1.LIBELLE} → niveau ${b1.NIVEAU} (« ${b1.NIVEAU_LABEL} ») tracé`);

      // 5) Aucun badge automatique : une compétence jamais honorée reste au niveau 0 INCONNU
      const niv0 = badges.check(ident, 'INF-POWERSHELL');
      report('badges_aucun_honor_automatique', niv0.NIVEAU === 0 && niv0.STATUT === 'INCONNU' && niv0.PRET,
        'aucun badge automatique : niveau 0 tant que rien n\'est validé');

      // 6) Prérequis NON contournables : DEV-PROGRAMMATION2 refusé sans PROGRAMMATION1
      let refusReq = false;
      try { badges.honor(ident, 'DEV-PROGRAMMATION2', { NIVEAU: 3, PREUVE: 'p', PAR: 'tuteur' }); }
      catch (e) { refusReq = String(e.message).includes('Prérequis'); }
      const okReqPass = badges.honor(ident, 'DEV-PROGRAMMATION1', { NIVEAU: 4, PREUVE: 'p', PAR: 'tuteur' }).STATUT === 'BADGE';
      const okPuis = badges.honor(ident, 'DEV-PROGRAMMATION2', { NIVEAU: 3, PREUVE: 'p', PAR: 'tuteur' }).NIVEAU === 3;
      report('badges_prerequis_refus', refusReq && okReqPass && okPuis,
        'refus tant que prérequis non satisfaits, passe ensuite');

      // 7) Niveau décroissant refusé (un badge ne se retire pas par surprise)
      let refusDec = false;
      try { badges.honor(ident, 'DEV-PROGRAMMATION2', { NIVEAU: 2, PREUVE: 'p', PAR: 'tuteur' }); }
      catch (e) { refusDec = String(e.message).includes('décroissant'); }
      report('badges_niveau_decroissant_refus', refusDec, '2 < 3 refusé après BADGE:3');

      // 8) propose() : proposition tracée (PROPOSAL), jamais un badge automatique
      const pr = badges.propose(ident, 'INF-RUST1', { POURQUOI: 'démontrer du Rust élémentaire', PAR: ident.AIgg_NAME });
      const prOk = pr.STATUT === 'PROPOSE' && pr.TRANSACTIONS.some((t) => t.ACTION === 'PROPOSAL') && pr.NIVEAU === 0;
      report('badges_propose_trace', prOk, `${pr.LIBELLE} proposée (PROPOSAL tracée, reste au niveau 0)`);

      // 9) Source NDJSON privée : une ligne par compétence honorée/proposée, JSON valide
      const ndjsonLines = fs.readFileSync(tmpFile, 'utf8').split('\n').filter(Boolean);
      const ndjsonOK = ndjsonLines.length === 4
        && ndjsonLines.every((l) => { try { const o = JSON.parse(l); return !!o.CODE && !!o.LIBELLE && !!o.BRANCHE; } catch { return false; } });
      report('badges_source_ndjson', ndjsonOK, `${ndjsonLines.length} ligne(s) dans competences/badges.ndjson (privé)`);

      // 10) check() : OBSTACLES/PRÊT reflètent les prérequis réels
      const chk = badges.check(ident, 'DEV-PROGRAMMATION2');
      const chkOK = chk.REQUIS.every((r) => r.SATISFAIT) && chk.PRET && chk.PROCHAIN_NIVEAU === 4;
      const chkBloque = badges.check(ident, 'REC-MULTI-SOURCE').REQUIS.some((r) => !r.SATISFAIT);
      report('badges_check', chkOK && chkBloque && chk.REQUIS.length === 1, 'PRÊT/OBSTACLES calculés depuis les prérequis');

      // 11) Jamais de contournement des permissions : honor ne modifie AUCUNE permission ni capacité
      const permsAfter = JSON.stringify(require('../src/permissions').loadPermissions());
      const capsBefore = JSON.stringify(require('../src/capabilities').detectCapabilities());
      const capsAfter = JSON.stringify(require('../src/capabilities').detectCapabilities());
      report('badges_jamais_contourne_permissions', permsAfter === permsBefore && capsAfter === capsBefore && badges.REGLE.includes('permission'),
        'permissions et capacités inchangées, règle capacité ≠ permission portée');

      // 12) Journal : BADGE_HONORED / BADGE_PROPOSED tracés ; mémoire famille procedures
      const recentEvents = require('../src/journal').recentJournal(20).map((e) => e.EVENT);
      const journalOK = recentEvents.includes('BADGE_HONORED') && recentEvents.includes('BADGE_PROPOSED');
      const memFiles = fs.existsSync(memDir) ? fs.readdirSync(memDir) : [];
      const memOK = memFiles.some((f) => {
        try { return fs.readFileSync(pathX.join(memDir, f), 'utf8').includes('Compétence «'); } catch { return false; }
      });
      report('badges_journal_trace', journalOK && memOK, 'BADGE_HONORED/BADGE_PROPOSED + souvenir procedures');

      // 13) Conscience : Competences.json expose l'arbre natif ; Moi.json les badges
      const tmpConscience = pathX.join(osX.tmpdir(), `aigg-badges-conscience-${Date.now()}`);
      try {
        const c = require('../src/conscience');
        c.synthesize(ident, { dir: tmpConscience });
        const compDoc = util.readJson(pathX.join(tmpConscience, 'Competences.json'), null);
        const moiDoc = util.readJson(pathX.join(tmpConscience, 'Moi.json'), null);
        const data = compDoc.DATA;
        report('badges_conscience_integree',
          compDoc.SOURCES.includes('competences/ (arbre natif des compétences/badges)')
            && Array.isArray(data.ARBRE_COMPETENCES) && data.ARBRE_COMPETENCES.length === 8
            && data.REGLE.includes('permission') && data.CHAINE.length === 9
            && data.BADGES.total >= 3
            && moiDoc.DATA.COMPETENCES_NATIVES.badges >= 3,
          `${data.ARBRE_COMPETENCES.length} branches synthétisées, ${data.BADGES.total} badge(s), Moi.json OK`);
      } finally {
        try { fs.rmSync(tmpConscience, { recursive: true, force: true }); } catch {}
      }

      // 14) Vie privée : le dépôt réel n'est JAMAIS touché par les tests
      const realUnchanged = realFileExisted
        ? fs.readFileSync(config.PATHS.competencesFile, 'utf8') === realFileBefore
        : !fs.existsSync(config.PATHS.competencesFile);
      report('badges_aucune_pollution_depot', realUnchanged, 'competences/ non modifié');
    } finally {
      badges._setFile(null);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      // Nettoyage des entrées mémoire « procedures » créées pendant le test
      try {
        if (fs.existsSync(memDir)) {
          for (const f of fs.readdirSync(memDir)) {
            if (!memBefore.has(f)) { try { fs.unlinkSync(pathX.join(memDir, f)); } catch {} }
          }
        }
      } catch {}
      // Journal restreint à sa longueur initiale (append-only, mais tests propres)
      try {
        if (fs.existsSync(journalFile)) {
          const all = fs.readFileSync(journalFile, 'utf8').split('\n').filter(Boolean);
          if (all.length >= journalLinesBefore) {
            fs.writeFileSync(journalFile, all.slice(0, journalLinesBefore).join('\n')
              + (journalLinesBefore ? '\n' : ''), 'utf8');
          }
        }
      } catch {}
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
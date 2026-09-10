# AIgg — Journal de développement (CHANGELOG.md)

Format : `[version] date — type : description`. Types : ajout, correction,
amélioration, sécurité, documentation.

## v0.3.5 — 2026-09-10 — ajout : presets de connaissances + relecture mémoire par la conversation

### Ajouts (AIgg connaît déjà Python, sans invention)
- **Presets de connaissances** : module `src/presets.js` — `listPresets()`, `loadPreset()`,
  fiches par domaine dans `src/presets/*.json`, chargement idempotent (jamais de doublon),
  tracé `PRESET_LOADED`, source `PRESET`, confiance 0.85, validé.
- **Preset `python`** : 27 connaissances fondamentales (blocs, types, fonctions, classes,
  GIL, slicing, décorateurs, générateurs, dataclass, annotations…).
- **CLI `learn python`** : `AIgg.cmd learn python` charge le preset ; `learn` sans argument
  reste le mode guidé interactif.
- **Relecture mémoire par la conversation** : si la question du tuteur ressemble à une
  question mémorisée (≥ 0.6 de mots significatifs communs, ≥ 2 mots), AIgg répond depuis
  sa mémoire (`KNOWLEDGE_RECALL`) au lieu de dire « je ne sais pas ». Aucune invention :
  sinon, il avoue ignorer.
- **Sûreté** : le preset est un pur ajout de connaissances (jamais une capacité, jamais
  un outil, jamais une permission) ; les données restent dans `memory/knowledge/` (hors
  Git).

### Tests
- Suite complète : **167 PASS / 0 FAIL** (7 nouveaux autonettoyants : `presets_liste`,
  `presets_python_load`, `presets_python_domaine`, `presets_python_idempotent`,
  `presets_inconnu`, `presets_memoire`, `presets_journal`).

## v0.3.4 — 2026-09-10 — ajout : communication proactive (conversation persistée, questions ouvertes, WAITING réel)

### Ajouts (communication d'abord, proactivité honnête)
- **Conversation persistée** : module `src/conversation.js` — append/history/clear —
  historique `core/conversation.ndjson`, visible dans la console web et au rechargement.
- **Questions ouvertes au tuteur** : « je me demande si … » crée un besoin `QUESTION`,
  passe l'état à `WAITING`, le tuteur répond (console/web) → réponse mémorisée + besoin
  `FULFILLED` + état `AWAKE`.
- **Proactivité honnête** : au réveil, si des besoins QUESTION/CONFIRMATION sont en
  attente, AIgg adresse un `proactiveDigest` ; sinon silence (aucune illusion).
- **État WAITING réel** : déclenché par les besoins ouverts, transition vers `AWAKE`
  quand tous sont résolus ; `LEARNING` confirmé par le tuteur → `AWAKE`.
- **Console web** : fil de conversation reconstruit depuis le serveur (source de
  vérité), badge clignotant sur l'onglet Demandes, champ de réponse aux questions.
- **CLI** : `talk <texte>` (one-shot persisté), `messages [answer <id> <rép>]`
  (liste/répond), `wake` déclenche le digest.

### Tests
- Suite complète : **160 PASS / 0 FAIL** (18 nouveaux : `conversation_persiste`,
  `conversation_histoire`, `conversation_reponse_persistee`, `conversation_fichier`,
  `etat_waiting_question`, `question_need_creee`, `question_reponse`,
  `question_need_acheve`, `question_reponse_memorisee`, `etat_awake_apres_reponse`,
  `question_reponse_tracee`, `proactif_silence_sans_attente`, `proactif_digest_attente`,
  `proactif_digest_persiste`, `etat_learning_prop`, `etat_waiting_confirmation`,
  `apprentissage_valide_etat_awake`, `apprentissage_memorise`).

## v0.3.3 — 2026-09-07 — ajout : apparence avancée (états visuels + avatar vivant)

### Ajouts (apparence contrôlée, couleurs d'état)
- **États visuels complets** : 8 couleurs d'état (BORN/AWAKE/LEARNING/THINKING/WAITING/SLEEPING/PAUSED/STOPPED) dans `STATE_COLORS` (valeur par défaut), compatibilité ascendante assurée par `mergeSchema()`.
- **Avatar vivant** : variantes SVG par état (yeux ouverts/fermés/demi, bouche, anneau de couleur d'état) ; `data-state` sur la balise SVG pour vérification honnête.
- **CLI `appearance`** : `status|set|reset|suggest|apply|drop|avatar [état]` + aide française ; le tuteur peut modifier toutes les couleurs (COLORS + STATE_COLORS) directement depuis la CLI.
- **Console web enrichie** : badge coloré par état, sélecteurs d'état (8 couleurs) dans l'onglet Apparence, anneau avatar dynamique.
- **Routes serveur** : `POST /api/appearance/set`, `/api/appearance/reset` ; avatar régénéré après sleep/wake.
- **Chemin d'application** : les couleurs d'état passent en tant que custom properties `--ap-state-*` dans le CSS.

### Limites honnêtes (documentées)
- L'avatar reste un SVG statique (pas d'animation) — il reflète l'état au moment de la régénération.
- Le tuteur doit régénérer l'avatar manuellement (`AIgg.cmd appearance avatar`) si l'état a changé sans passer par sleep/wake.

### Tests
- Suite complète : **142 PASS / 0 FAIL** (8 nouveaux : `apparence_state_colors`, `apparence_state_color`, `apparence_merge_retrocompat`, `apparence_reset`, `apparence_reset_journalise`, `avatar_etats_variantes`, `avatar_data_state`, `avatar_anneau_couleur`).

## v0.3.2 — 2026-09-07 — ajout : connecteur Gmail (P2) à scopes minimaux

### Ajouts (premier connecteur Google, moindre privilège)
- **Outil `gmail`** (`tools/gmail/`) : moteur **100 % natif** de l'API Gmail
  v1 — `list` (métadonnées), `read`, `send` — `fetch` Node ≥ 18, aucune
  dépendance npm. Capabilité `COMMUNICATION` (partagée avec l'outil `email`).
- **Moindre privilège** : scope minimal `gmail.metadata` par défaut ; `read`
  corps complet exige `gmail.readonly`, `send` exige `gmail.send` — refus
  explicite sinon (jamais de dépassement silencieux).
- **Secrets dans le coffre** : `gmail.access_token` et `gmail.scopes`
  rangés dans le `vault` (AES-256-GCM, hors Git) ; mot de passe du coffre
  fourni à chaque commande, jamais stocké.
- **Envoi tracé** dans `outbox/` (SENT/FAILED, même dossier que l'outil
  `email`) ; chaque action passe par le Contrat Commun (permission + capacité).
- **CLI** : `AIgg.cmd gmail status|list|read|send` + aide française ;
  `gmail` restauré dans `DEFAULT_TOOLS_BLOCKED` (bloqué par défaut).
- `tools/gmail/config.json` (base d'API surchargable) ajouté au `.gitignore`.

### Limites honnêtes (documentées)
- Le moteur est **testé contre une API Gmail simulée locale** (aucun secret
  réel, aucun réseau externe) — comme l'outil `email` avec son serveur SMTP
  local. L'accès réel exige les identifiants OAuth2 du tuteur (projet Google
  Cloud : client + scopes) rangés dans le coffre.
- Les verbes OAuth (auth URL, redirect, refresh) ne sont pas encore un flux
  complet : le token renseigné par le tuteur est utilisé en Bearer direct.

### Tests
- Suite complète : **134 PASS / 0 FAIL** (`test_outil_gmail` + 
  `gmail_scope_minimal` ; couverture list/read/send via serveur local simulé,
  vérification du Bearer et du refus sans scope, coffre temporaire autonettoyé).

## v0.3.1 — 2026-09-07 — sécurité : coffre-fort local chiffré (vault)

### Ajouts (infrastructure de sécurité, local)
- **Coffre-fort `vault`** (`src/vault.js`) : stockage de secrets (mots de
  passe, tokens OAuth, identifiants de connecteurs) **chiffrés** — AES-256-GCM,
  clé dérivée par **scrypt** (module natif `crypto`, aucune dépendance npm),
  sel et IV aléatoires par coffre, tag d'authentification.
- **Mot de passe jamais stocké** : fourni à chaque commande via `--password=`
  ou la variable d'environnement `AIGG_VAULT_PASSWORD` ; aucun champ mot de
  passe dans `vault/vault.json`, dans Git, le journal, la mémoire ou les docs.
- **`vault/vault.json` hors Git** (`.gitignore` : `vault/`) — publié jamais,
  même chiffré (principe moindre privilège).
- **CLI** : `AIgg.cmd vault init|put|get|list|rm|wipe|status` + aide
  française ; journalisation des actions sans jamais révéler les valeurs.
- Fonctions : `init`, `put`, `get`, `list`, `remove`, `wipe`, `status`,
  `runTest()` — version fichier (testable) + version par défaut (`PATHS.vault`).
- **Test réel autonettoyant** : coffre de test dans `os.tmpdir()`,
  autonomie totale (init → put → get → mauvais mdp → list → rm → wipe),
  secret vérifié **jamais en clair** dans le fichier ; aucun résidu.

### Limites honnêtes (documentées)
- Aucune récupération possible si le mot de passe est perdu (par conception :
  aucun mot de passe enregistré nulle part).
- Pense-bête : pour connecteurs Google (P2/PHASE 4-5), ranger les
  identifiants OAuth dans le coffre avant toute utilisation.

### Tests
- Suite complète : **132 PASS / 0 FAIL** (9 vérifications VAULT ajoutées :
  `vault_test_autonettoyant`, init, put, get, mauvais mdp, clair jamais,
  list, rm, wipe).

## v0.3.0 — 2026-09-06 — communication externe : outil e-mail (PHASE 4, envoi SMTP)

### Ajouts (premier outil externe réel)
- **Outil `email`** (`tools/email/`) : envoi de messages via SMTP **100 %
  natif** (RFC 5321 : EHLO, MAIL FROM, RCPT TO, DATA, QUIT — module `net`,
  aucune dépendance npm). Capabilité `COMMUNICATION` acquise par
  `toolkit.install('email')`.
- **Traçabilité `outbox/`** (privé) : chaque envoi (réussi ou échoué) est
  journalisé en JSON avec ID, destination, sujet, serveur, erreur.
- **Test réel autonettoyant** : serveur SMTP local (TCP sur port éphémère) —
  un message part réellement et est vérifié à la réception ; aucun faux PASS.
- **CLI** : `AIgg.cmd email send|status|log` (libellés `--to --subject --body
  [--host --port --from --timeout_ms]`) + aide française complète.
- **API HTTP** : `/api/email/send` (POST), `/api/email/log` (GET), via le
  Contrat Commun (journalisation `TOOL_EMAIL_EXEC`).
- Bloqué par défaut (moindre privilège) : `email` ajouté à
  `DEFAULT_TOOLS_BLOCKED` ; `tools/email/config.json` exclu de Git.

### Limites honnêtes (documentées)
- Réception (IMAP), AUTH SMTP et STARTTLS **non implémentés** ; connecteurs
  Gmail / Drive / Docs / Sheets toujours prévus (PHASE 4-5), non faits.

### Tests
- Suite complète : **123 PASS / 0 FAIL** (test_outil_email ajouté, §9
  `outils_essentiels` étendu à `email`).

## v0.2.2 — 2026-09-06 — portabilité : installation sur un autre lecteur

### Corrections / améliorations
- **Tests portables** : §21 (docs-check) ne dépend plus du `README.md` racine
  du projet (inexistant dans une copie portable) — lecture conditionnelle via
  `fs.existsSync`. La suite passe désormais sur un incubateur installé sur un
  autre lecteur (ex. `G:\AIgg`, installé via `AIgg.cmd migrate`).
- Installation portable vérifiée de bout en bout : `migrate` → `status` →
  `docs-check` → suite complète **122 PASS / 0 FAIL** sur le lecteur cible.

## v0.2.1 — 2026-09-06 — finalisation N2 : import robuste + docs exactes

### Corrections / améliorations (facteur de robustesse)
- **Import CLI** : un BOM UTF-8 éventuel en tête du fichier `--file` est
  désormais ignoré (échec `JSON.parse` auparavant avec un fichier signé
  Windows/PowerShell) — `AIgg.js`.
- **Smoke de bout en bout** validé réellement : create → source → connaissance
  → search (filtres, accents, score+cause) → export → import → remove ; cause
  de classement `notes` ajoutée à `docs/LIBRARIES.md` (§18).

### Remarque
- Suite de tests : **122 PASS / 0 FAIL**.

## v0.2.0 — 2026-09-06 — recherche niveau 2 + sens réels + aide CLI + docs-check

### Ajouts / améliorations
- **Recherche bibliothèque niveau 2 (N2)** : `searchL2(query, options)` dans
  `src/library.js` — normalisation accents/casse/ponctuation, arrêts FR/EN/ES,
  racinisation, classement pondéré et expliqué (cause par champ), filtres
  bibliothèque/langue/type/statut/tags/provenance/limit, résultats multilingues.
- Import réel via CLI : `AIgg.cmd library import --file=… [--confirm]` (aperçu
  par défaut, remplacement d'une bibliothèque existante de même id).
- `addKnowledge` / `addSource` / `addDocument` enrichis (`ID` stable via `id`,
  `TITLE`, `TAGS`, `CONCEPTS`, `LANGUAGE`), export/import `aigg-library` v1
  acceptant les deux dialectes (`bundle` ou `name`+`metadata`).
- **P9 — sens réels de la machine** : sondes sans prérequis (Windows
  WINMM/WMI, Linux ALSA/V4L2), états DISPONIBLE/AUTORISE/ACTIF jamais
  inventés (sonde bloquée → `UNKNOWN`), cache 30 s, injectables pour les tests.
  Détection réelle Windows : MICROPHONE OUI, CAMERA NON, HAUT_PARLEURS OUI.
- **P10 — aide CLI `library` en français** : `AIgg.cmd library` sans argument
  affiche la documentation complète reflétant le code réel (recherche niveau 2,
  import, états, principes de sécurité).
- **P11 — `docs-check`** : `AIgg.cmd docs-check` (lecture seule) vérifie la
  cohérence version + compteurs de tests entre STATE / CHANGELOG / README et le
  code ; ne modifie rien ; sortie « AIgg DOCS CHECK ». Roadmap externe et wiki
  laissés en `MANUAL_CHECK`.
- Web (onglet Bibliothèques) : recherche niveau 2 avec sélecteurs Langue/Type
  et affichage du score + cause ; onglet Sens : raison affichée par capteur.
- Dépôt public : dossier privé `InformationsProjetAIgg/` retiré de GitHub
  (untrack + `.gitignore`), documents de conception échangés hors dépôt.

### Corrections
- `library.remove()` : le journal était recréé avant le déplacement vers
  `_trash` (coquille vide) → journalisation après `renameSync` ; 35 coquilles
  résiduelles purgées.

### Remarque
- Suite de tests : **122 PASS / 0 FAIL** (94 → 119 avec sens réels,
  recherche N2 et import ; → 122 avec la couverture `docs-check`).
- Finalisation N2 (import BOM + docs exactes) : reportée en **v0.2.1**.

## v0.1.3 — 2026-09-06 — carnet : entrées révocables, autonomie des tests

### Ajouts / améliorations
- `tools/notebook/notebook.js` : nouvelle interaction `notebook.remove(id)`
  (suppression d'une expérience, données locales uniquement).
- `runTest()` du carnet est désormais **autonettoyant** : il supprime
  l'expérience `test_outil_notebook` qu'il crée (l'outil ne laisse plus de
  trace après `AIgg.cmd test notebook`).
- Tests :: le test `NOTEBOOK RÉEL` supprime son entrée `test_suite` et vérifie
  la suppression (`expérience_supprimée`) → **94 PASS / 0 FAIL** (au lieu de
  93).
- CLI : `AIgg.cmd notebook-del <id>` (via contrat `notebook.remove`).
- API : `POST /api/notebook/remove` → `{ id }` (contrôlé par le contrat).
- Console web : bouton **supprimer** sur chaque ligne du carnet.

### Nettoyage
- Purge des données résiduelles de test laissées par les anciennes versions
  du carnet (`test_suite`, `test_outil_notebook`) — seule l'expérience
  légitime « Test du carnet de labo » subsiste.
- `.gitignore` : exclusion des messages du tuteur (`InformationsProjetAIgg/Message*.txt`).

## v0.1.2 — 2026-09-06 — correction naissance interactive

### Correction
- **Naissance interactive impossible depuis la release** : `AIgg.cmd` (sans
  identité) provoquait `PROBLÈME: process.stdin.close is not a function`
  (CAUSE/FIN). La collecte des réponses TTY fermait `process.stdin` d'une
  façon non portable (introuvable sur certains Node) → remplacée par la
  fermeture de l'interface `readline` (`rl.close()`), API stable partout.
  Vérifié : naissance de bout en bout dans un bac à sable (entrées canalisées),
  exit 0, état `AWAKE`, `status` correct ensuite.
- Suppression de la fonction auxiliaire devenue orpheline (`askInteractive`).

### Remarque
- La suite de tests reste à **93 PASS / 0 FAIL** (le parcours de naissance
  interactif n'est pas couvert par `tests/run-tests.js` : nécessite un TTY ;
  désormais vérifié par reproduction directe dans un bac à sable).

## v0.1.1 — 2026-09-05 — bibliothèques de spécialisation (cahier)

### Ajouts
- Moteur `src/library.js` : environnement d'apprentissage structuré, 100 %
  natif (JSON + fs), avec cycle de vie complet, sources, documents,
  connaissances (avec provenance), compétences, curriculum, exercices,
  contradictions, annotations, journal local, recherche niveau 1, import /
  export `aigg-library` v1.
- Distinctions absolues respectées : BIBLIOTHÈQUE ≠ MÉMOIRE ; SOURCE ≠
  DOCUMENT ≠ CONNAISSANCE ≠ COMPÉTENCE ; document/code jamais exécuté
  (`NEVER_EXECUTED`) ; compétence jamais `MASTERED` automatiquement (preuve du
  tuteur requise).
- Templates `templates/library.json`, `source.json`, `curriculum.json`,
  `competency.json`.
- Exemples publics de structure `libraries/examples/science/` et
  `libraries/examples/programming/` (aucun savoir pré-rempli).
- Privée par défaut : `libraries/*` (sauf `examples/`) et `libraries/_trash/`
  exclus du dépôt public (`.gitignore`).
- CLI `AIgg.cmd library …` (list, health, create, show, sources, knowledge,
  competencies, curriculum, notes, journal, search, export, source-add,
  knowledge-add, competence-add, competence-set, contradiction-add, note-add,
  archive, restore, remove, trash).
- API HTTP `/api/libraries*` (CRUD, sources, connaissances, compétences,
  exercices, documents, curriculum, contradictions, annotations, journal,
  recherche, export, import avec analyse/confirmation).
- Onglet web « Bibliothèques » dans la console du tuteur (liste, détail,
  création privée, recherche).
- Suite de tests : **93 PASS / 0 FAIL** (+ 25 vérifications TEST_LIBRARIES).

### Corrections
- `libRoot()` résolvait seulement `libraries/<id>` ; les bibliothèques
  imbriquées (exemples publics) étaient introuvables par `find()` → recherche
  récursive de l'id (hors `_trash`).
- `importActivate` posait l'id retourné par `create()` (suffixe anti-collision
  pris en compte) ; les champs d'import en casse haute étaient ignorés
  (connaissances/documents/exercices) → normalisation haut/bas.
- `/api/library?id=` imbriquait `meta.meta` → renvoie désormais
  `{ meta, sources }` directement utilisable.

### Sécurité
- Bibliothèques privées par défaut ; corbeille `_trash` exclue du dépôt.
- Documents importés et code jamais exécutés.

### Documentation
- `docs/LIBRARIES.md` (nouveau), `docs/STATE.md`, `docs/CHANGELOG.md`,
  `docs/DEVELOPMENT.md`, `docs/SECURITY.md`, `docs/ARCHITECTURE.md`,
  `docs/README.md`, `README.md` racine mis à jour.

## v0.1.0 — 2026-09-05 — socle N0 + corpus du Prompt Maître

### Ajouts
- Naissance : identité persistante (AIgg_ID UUID immuable), tuteur, acte de
  naissance, fuseau horaire, version, incubateur.
- Mémoire 4 familles (autobiographique, connaissances, relations, procédures) :
  mémoriser, rappeler, corriger, supprimer.
- Journal NDJSON (événements, pas de clé dupliquée).
- Sens réflexes avec 3 états (DISPONIBLE / AUTORISÉ / ACTIF).
- Capacités évolutives (acquises / non acquises) et permissions (moindre
  privilège, toutes bloquées par défaut).
- Veille / réveil / âge ; sauvegarde et restauration avec manifeste.
- Registre d'outils + Contrat Commun (IDENTIFIER → CAPACITÉ → PERMISSION →
  EXÉCUTER → JOURNALISER → RETOURNER) avec blocages honnêtes.
- Outils locaux : `web` (lecture HTTP + recherche DuckDuckGo sans clé),
  `notebook` (carnet de laboratoire), `avatar` (SVG déterministe, sans secret).
- Console web du tuteur : identité, état, capacités, sens, outils,
  permissions, mémoire, notebook, journal, sauvegardes.
- **8 états** (BORN, AWAKE, LEARNING, THINKING, WAITING, SLEEPING, PAUSED,
  STOPPED) avec transition sécurisée et journalisation.
- **Conversation** : moteur honnête (`src/talk.js`), onglet Conversation,
  cycle d'apprentissage « apprends que X → est-ce correct ? → oui/non »
  enregistré comme demande au tuteur.
- **Besoins / Demandes** : registre `core/needs.json`, onglet Demandes,
  bouton « Demander au tuteur » sur les outils bloqués.
- **Apparence** : `core/appearance.json`, flux PROPOSÉE → VALIDÉE → APPLIQUÉE
  → JOURNALISÉE, onglet Apparence, le HTML utilise des variables CSS pilotées
  (le HTML est le corps visible d'AIgg).
- **Migration** : `AIgg.cmd migrate <dest>` avec vérification de continuité
  AIgg_ID (copie portable, `backups/` exclu).
- Gestion d'erreurs CLI lisible : PROBLÈME / CAUSE / SOLUTION / ÉTAT.

### Corrections
- `state.wake()` ne renvoyait plus `age` après refonte des états (régression)
  → rétabli et testé.
- Sens `RÉSEAU` : détection réelle des interfaces réseau (au lieu d'un `true`
  approximatif).
- Apostrophe française dans une chaîne (`'Demande d'aide'`) → échappée.
- Erreur de démonstration : `AIgg.cmd tests` passe de 37 à 68 vérifications
  après ajout des tests COMMUNICATION / INTERFACE / BESOINS / APPARENCE /
  MIGRATION / RECHERCHE (avec statut BLOCKED honnête hors-ligne).

### Sécurité
- Aucun secret / mail réel dans le dépôt (vérifié) ; fichiers privés exclus
  (`AIgg/core/`, `memory/`, `journal/`, `inbox/`, `outbox/`, `backups/`,
  `notebook/`, `senses/`, `providers.json`, `avatar.svg`).
- Licence MIT ajoutée (racine + package.json : `"license": "MIT"`).

### Documentation
- `docs/AUDIT.md` (audit honnête de l'existant), `docs/STATE.md`,
  `docs/TOOLS.md`, `docs/CAPABILITIES.md`, `docs/SECURITY.md`,
  `docs/MIGRATION.md`, `docs/DEVELOPMENT.md`, `docs/CHANGELOG.md` (ce fichier) ;
  `ARCHITECTURE.md` et README mis à jour.

## v0.0.1 — 2026-09-05 — embryon (avant audit)
- Structure du socle, modules de base, tests 37 PASS. Historique remplacé
  par cet audit propre (aucune valeur perdue).
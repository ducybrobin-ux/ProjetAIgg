# AIgg — Journal de développement (CHANGELOG.md)

Format : `[version] date — type : description`. Types : ajout, correction,
amélioration, sécurité, documentation.

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
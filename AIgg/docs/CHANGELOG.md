# AIgg — Journal de développement (CHANGELOG.md)

Format : `[version] date — type : description`. Types : ajout, correction,
amélioration, sécurité, documentation.

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
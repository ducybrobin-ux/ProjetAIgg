# AIgg — Journal de développement (CHANGELOG.md)

Format : `[version] date — type : description`. Types : ajout, correction,
amélioration, sécurité, documentation.

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
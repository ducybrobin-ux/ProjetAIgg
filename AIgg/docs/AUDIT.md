# AIgg — Audit de l'existant (état réel avant corrections)

> Réalisé le 2026-09-05, après inspection intégrale de l'incubateur
> (voir `docs/STATE.md` pour les statuts IMPLEMENTED / PARTIAL / PLANNED / BLOCKED).

---

## 1. Ce qui existe

| Zone | Éléments |
|---|---|
| Code | `AIgg.js` (CLI), `src/` (14 modules), `tests/run-tests.js`, `package.json` |
| Outils | `tools/web` (lecture HTTP + recherche), `tools/notebook`, `tools/avatar` |
| Interface | `web/public/` (index.html, style.css, app.js), serveur API `src/server.js` |
| Données | `core/` (identity, birth_certificate, state, capabilities, permissions, tools), `memory/` (4 familles), `journal/events.ndjson`, `notebook/`, `backups/` |
| Lanceurs | `AIgg.cmd` (officiel), `AIgg.ps1` (facultatif, .ps1 bloqué par politique Restricted) |
| Docs | `docs/README.md`, `docs/ARCHITECTURE.md`, `README.md` racine |
| Versioning | Git initialisé à la racine, index prêt, aucun commit ; aucun dépôt distant |

## 2. Ce qui fonctionne (testé réellement)

- Naissance : `identity.js` → AIgg_ID (UUID), nom, tuteur, acte de naissance. Testé.
- Mémoire 4 familles : mémoriser, rappeler, corriger, supprimer. Testé.
- Journal NDJSON sans clé dupliquée. Testé.
- Capacités + permissions (tout bloqué par défaut, autorisation/révocation). Testé.
- Sens réflexes avec DISPONIBLE/AUTORISE/ACTIF. Testé.
- Veille/réveil + âge. Testé.
- Sauvegarde/restauration avec manifeste. Testé.
- Contrat Commun : blocages IDENTITY / CAPACITY / PERMISSION / EXECUTION. Testé.
- Registre d'outils : discover / propose / authorize / install / test / revoke. Testé.
- Outils réels : `web` (read local + recherche DDG), `notebook`, `avatar`. Testés.
- Suite de tests : 37 vérifications, 37 PASS (avant cette session).
- Interface web : données /api/state, fenêtres multi-onglets. Testées côté données.

## 3. Ce qui ne fonctionne pas / n'existe pas (réel)

- **États** : seuls `AWAKE` et `ASLEEP` existent ; les 8 états du Prompt Maître
  (BORN, LEARNING, THINKING, WAITING, PAUSED, STOPPED) sont absents.
- **Conversation** : aucune zone de conversation avec AIgg, aucun moteur de
  réponse (même minimal) dans `web/` ; l'interface n'a pas d'onglet conversation.
- **Besoins** : aucun registre `core/needs.json` ; pas d'espace « demander
  quelque chose au tuteur ».
- **Apparence** : le CSS est en dur dans `style.css` ; aucune notion de
  proposition/validation/application/journalisation, pas de `core/appearance.json`.
- **Migration** : aucune procédure ni commande ; pas de test de continuité AIgg_ID.
- **Gestion d'erreurs** : le CLI imprime `Erreur AIgg: <message>` ; le format
  PROBLÈME / CAUSE / SOLUTION / ÉTAT demandé n'existe pas.
- **Tests manquants** : TEST_COMMUNICATION, TEST_MIGRATION, TEST_INTERFACE,
  TEST_APPEARANCE.
- **Licence** : `package.json` → `"license": "UNLICENSED"`, pas de fichier LICENSE.

## 4. Ce qui est dangereux

- Aucun secret n'est dans le dépôt ; `identity.json` (email du tuteur) est bien
  exclu par les `.gitignore` (`AIgg/core/`, `AIgg/memory/`, etc.). Vérifié dans
  `git status`.
- `senses.js` déclare `RESEAU: DISPONIBLE` sans test réseau réel (test = `true`).
  Non dangereux mais trompeur → à corriger vers un test réel ou une mention honnête.
- `state.js` : aucun garde-fou contre les états invalides (on peut écrire n'importe
  quelle chaîne). À durcir avec la liste des états.
- `backup.js`/`migrate` : rien ne protège une restauration/migration sur un autre
  AIgg (pas de contrôle AIgg_ID). À documenter et vérifier lors de la migration.

## 5. Ce qui est inutile

- `AIgg.ps1` : inutilisable avec la politique d'exécution Restricted. Conservé
  comme aide-message (affiche la solution) — utile pédagogiquement, non exécuté.
- `src/config.js` `contractHeader()` : jamais appelé (le contrat est construit
  dans `contract.js`). À conserver comme référence ou supprimer — décision : le
  garder documenté comme aide, il est correct.

## 6. Ce qui peut être conservé

- Toute la structure `core/ memory/ senses/ tools/ journal/ backups/ web/ docs/`.
- Tous les modules `src/` (config, util, identity, memory, journal, capabilities,
  permissions, senses, backup, contract, toolkit, server, state).
- Les 3 outils locaux et leurs manifests.
- La console web multi-onglets (base pour ajouter conversation/demandes/apparence).
- La suite de tests existante.

## 7. Ce qui doit être remplacé / corrigé

- `src/state.js` : étendre aux 8 états avec transitions journalisées.
- `senses.js` : rendre le test réseau honnête (tentative réelle, échec silencieux
  admissible), et `AUTORISE/ACTIF` documentés.
- `AIgg.js` : format d'erreur PROBLÈME/CAUSE/SOLUTION/ÉTAT.
- `package.json` : licence MIT + scripts utiles (migrate, talk).

## 8. Ce qui manque

- `src/talk.js` (moteur de conversation honnête) + onglet Conversation.
- `src/needs.js` + `core/needs.json` + onglet Demandes.
- `src/appearance.js` + `core/appearance.json` + flux PROPOSÉ→VALIDÉ→APPLIQUÉ→JOURNALISÉ
  + onglet Apparence.
- `src/migrate.js` + commande `migrate` + TEST_MIGRATION.
- Tests COMMUNICATION, INTERFACE, APPARENCE, MIGRATION.
- Docs : STATE, TOOLS, CAPABILITIES, SECURITY, MIGRATION, DEVELOPMENT, CHANGELOG ;
  AUDIT (ce fichier).
- `LICENSE` MIT (racine) + `package.json` → `"license": "MIT"`.
- Démarrage : vérification d'environnement structurée (node présent, dossier
  attendu…) avec message PROBLÈME/CAUSE/SOLUTION/ÉTAT.

---

## Décision

Le socle N0 est **conservé intégralement** (rien à jeter). Corrections et
ajouts décrits ci-dessus, **après** cet audit, dans l'ordre : DOCUMENTER →
CORRIGER → TESTER → DOCUMENTER à nouveau → publier (licence MIT).
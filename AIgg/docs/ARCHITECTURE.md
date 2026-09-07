# AIgg — Architecture (état réel)

## Contrat commun

Chaque action passe par :
ID -> VERIFIER CAPACITE -> VERIFIER PERMISSION -> EXECUTER -> JOURNALISER -> RETOURNER -> MEMORISER.

| Champ | Source |
|---|---|
| AIgg_ID / AIgg_NAME | `core/identity.json` |
| TUTOR_ID / TUTOR_NAME | `core/identity.json` |
| CORE_VERSION, MEMORY_VERSION | `src/config.js` |
| TOOL_NAME / TOOL_VERSION | `manifest.json` de l'outil |
| PERMISSIONS | `core/permissions.json` |
| CAPABILITIES | `core/capabilities.json` |
| EVENT_ID, TIMESTAMP | générés à l'événement |
| SOURCE, CONFIDENCE | fournis par l'émetteur |

Résultats de blocage honnêtes : `CAPACITY`, `PERMISSION`, `EXECUTION`,
`IDENTITY`. Un outil non autorisé n'exécute jamais.

## Modules (src/)

| Module | Rôle |
|---|---|
| `config.js` | chemins, versions, contrat commun |
| `util.js` | UUID, horodatage, JSON atomique |
| `identity.js` | identité + acte de naissance |
| `state.js` | 8 états (BORN→STOPPED), transitions journalisées, âge |
| `memory.js` | 4 familles + répertoire, récupération, correction |
| `journal.js` | journal NDJSON (pas de clé dupliquée) |
| `capabilities.js` | organes acquis / rétractés |
| `permissions.js` | permissions par défaut bloquées, autorisation/révocation |
| `senses.js` | sens : DISPONIBLE/AUTORISE/ACTIF (détection réelle) |
| `needs.js` | registre de besoins « demander au tuteur » |
| `appearance.js` | apparence : PROPOSÉE→VALIDÉE→APPLIQUÉE→JOURNALISÉE |
| `talk.js` | conversation honnête + cycle d'apprentissage |
| `backup.js` | sauvegarde / restauration avec manifeste |
| `contract.js` | pipeline du Contrat Commun |
| `toolkit.js` | registre des outils, flux d'acquisition |
| `migrate.js` | copie portable avec continuité AIgg_ID |
| `library.js` | bibliothèques de spécialisation (voir `LIBRARIES.md`) |
| `vault.js` | coffre-fort local chiffré (AES-256-GCM, scrypt, zéro dépendance) |
| `server.js` | API HTTP + console web |

## États d'AIgg

`BORN → AWAKE ⇄ SLEEPING`, indicateurs `LEARNING / THINKING / WAITING`,
mise en pause `PAUSED`, arrêt `STOPPED`. Transitions validées contre une
liste fermée et journalisées (`STATE_CHANGE`), historique conservé dans
`core/state.json`.

## Conversation (moteur honnête)

`src/talk.js` : reconnaissance de formulations simples (identité, tuteur,
âge, capacités, veille), cycle « apprends que X → confirmation », sinon
réponse honnête « Je ne sais pas encore faire cela. » Aucune illusion de
raisonnement. Les confirmations en attente sont des **besoins** visibles par
le tuteur.

## Outils (tools/)

Chaque outil vit dans `tools/<nom>/` :
`manifest.json` (identité de l'outil) + `<nom>.js` (implémentation native).

| Outil | Capacité | Interactions | Indépendant |
|---|---|---|---|
| `web` | RECHERCHER | web.read, web.search | oui (fetch natif) |
| `notebook` | LABORATOIRE | notebook.add, list, get, result, remove | oui |
| `avatar` | REPRESENTATION | avatar.generate (SVG local) | oui |
| `email` | COMMUNICATION | email.send, email.log, email.status (SMTP natif) | oui (net natif) |

Flux d'acquisition :
BESOIN -> RECHERCHE -> PROPOSITION -> AUTORISATION -> TEST -> INSTALLATION
-> APPRENTISSAGE -> UTILISATION ; révocation = permission + capacité.

## Frontière de responsabilité

- Le **tuteur** contrôle les permissions (moindre privilège par défaut).
- Les **outils externes** (Gmail, Drive, IA externes…) sont facultatifs,
  révocables ; ils ne sont ni le cerveau ni l'identité.
- AIgg conserve la décision ; un outil ne décide pas du contenu.

## Bibliothèques de spécialisation

Sous `libraries/` : bibliothèques (privées par défaut, hors Git), corbeille
`_trash/` et exemples publics `examples/`. Chaque bibliothèque contient
`library.json`, `sources.json`, `curriculum.json`, `competencies.json`,
`knowledge/`, `documents/`, `exercises/`, `journal/`. Règles non négociables :
document/code jamais exécuté, compétence jamais `MASTERED` automatiquement,
provenance conservée pour chaque connaissance, contradictions signalées.
Détails : `LIBRARIES.md`, `templates/*.json`.

## Limites connues (honnêtes)

- Pas encore : Google, GitHub (code source seulement), caméra, micro,
  voix, hébergement, IA externe. Le socle vise le lot de la Partie XXIV de la
  recette + premiers outils locaux et le web en lecture/recherche ; l'envoi
  e-mail (SMTP) est fait depuis v0.3.0, la réception (IMAP) reste à faire.
- `web.search` nécessite un fournisseur dans `tools/web/providers.json`
  (généralement DuckDuckGo sans clé) ; les clés éventuelles ne vont jamais
  dans Git.
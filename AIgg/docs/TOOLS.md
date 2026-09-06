# AIgg — Outils (TOOLS.md)

> Registre réel des outils présents dans `tools/`. Chaque outil = dossier avec
> `manifest.json` (identité de l'outil) + implémentation native JavaScript
> (aucune dépendance obligatoire). La source de vérité des **statuts en temps
> réel** est `core/tools.json` (privé, exclu du dépôt public).

## Flux d'acquisition (Contrat Commun des outils)

1. BESOIN → 2. RECHERCHE → 3. PROPOSITION → 4. AUTORISATION (tuteur) →
5. INSTALLATION → 6. TEST (réel) → 7. ACQUISITION de la capacité → 8. UTILISATION.

Révocation = révocation de permission + libération de la capacité.

## Tableau des outils

| Outil | Capacité fournie | Actions | Besoin couvert | Indépendant | Révocable | Test |
|---|---|---|---|---|---|---|
| `web` | RECHERCHER | `web.read` (fetch HTML), `web.search` (DuckDuckGo sans clé) | « J'ai besoin d'information » | oui (fetch natif) | oui | PASS (local + recherche réelle) |
| `notebook` | LABORATOIRE | `add`, `list`, `get`, `setResult`, `remove` | « J'ai besoin d'expérimenter » | oui | oui | PASS |
| `avatar` | REPRESENTATION | `generate` (SVG local déterministe) | « J'ai besoin d'une représentation » | oui | oui | PASS |

## Détails par outil

### web (`tools/web/`)
- Lecture : HTTP(S) uniquement, timeout 15 s, User-Agent AIgg, HTML nettoyé en
  texte (1200 premiers caractères). La réponse porte `confidence`, `fetched_at`
  et un avertissement « vérité non automatique ».
- Recherche : fournisseur par défaut DuckDuckGo (HTML, sans clé). Un éventuel
  `providers.json` permet d'ajouter d'autres fournisseurs ; **jamais de clé
  dans Git** (`AIgg/tools/*/providers.json` exclu).
- Test réel : lit une page servie par un serveur local (aucune dépendance
  réseau) ; la recherche réelle est testée séparément (TEST_RECHERCHE).

### notebook (`tools/notebook/`)
- Carnet de laboratoire : question, hypothèse, résultat, conclusion, statut.
- Test réel : crée une expérience, compte les fichiers, conclut.

### avatar (`tools/avatar/`)
- Génère `web/public/avatar.svg` de façon **déterministe** (pas d'aléa).
- L'avatar est une **apparence** (facultative), jamais un identifiant.
- Test réel : vérifie la génération et l'absence de secrets (AIgg_ID,
  e-mail tuteur) dans le SVG.

## Outils bloqués par défaut (liste de moindre privilège)

`powershell, git, github, web, gmail, google_drive, google_docs,
google_sheets, google_calendar, google_maps, gemini, notebook, camera,
microphone, voice_synthesis, voice_recognition, cloud_storage, social,
avatar, hosting` — tous `authorized: false` jusqu'à décision explicite du
tuteur (CLI `authorize` ou bouton web « Autoriser »).

## Demandes liées aux outils

Quand un outil est bloqué/non autorisé, le tuteur peut cliquer
« Demander au tuteur » dans la console : ceci crée un **besoin** dans
`core/needs.json` (visible dans l'onglet Demandes), puis AIgg reçoit la
décision. Un besoin n'est jamais une action automatique.
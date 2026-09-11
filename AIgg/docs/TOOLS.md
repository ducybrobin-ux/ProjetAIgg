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
| `email` | COMMUNICATION | `send` (SMTP natif), `log` (outbox), `status` | « J'ai besoin de communiquer à distance » | oui (net natif) | oui | PASS (serveur SMTP local réel) |
| `ia` | CONSULTATION | `status`, `ask`, `log` (IA externe « chat completions », multi-fournisseurs, tracé outbox/) | « J'ai besoin de consulter une IA externe » (outil, jamais le cerveau) | oui (fetch natif) | oui | PASS (endpoints simulés locaux) |

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

### email (`tools/email/`) — PHASE 4, communication externe
- Envoi de messages via **SMTP natif** (RFC 5321 : EHLO, MAIL FROM, RCPT TO,
  DATA, QUIT — module `net`, aucune dépendance npm).
- Configuration tutorielle dans `tools/email/config.json` (`host`, `port`,
  `from`, `timeout_ms`) : dossier **exclu de Git** (jamais de secret publié).
- Traçabilité : chaque envoi (réussi ou échoué) est journalisé dans
  `outbox/` (privé) — `email log` / `/api/email/log`.
- Test réel : serveur SMTP **local** sur port éphémère ; un message part
  réellement, le serveur vérifie destination/sujet/corps à la réception.
  Autonettoyant : restitue `outbox/` tel quel. Aucun faux PASS.
- Limites honnêtes : réception (IMAP), AUTH SMTP et STARTTLS **non
  implémentés** ; connecteurs Gmail/Drive prévus (PHASE 4-5), non faits.

### ia (`tools/ia/`) — v0.3.11, IA externe comme outil
- Consulte une IA externe compatible « chat completions » (ex. OpenAI) par
  **prompt explicite** (CLI `ia ask` ou API `/api/ia/ask`), 100 % natif
  (fetch), timeout 20 s, prompt max 4 000 car., réponse max 800 tokens.
- **Multi-fournisseurs** : `tools/ia/providers.json` (hors Git) ajoute des
  endpoints (`ia ask --provider=<nom>` ; clé propre `vault put
  ia.api_key.<provider>` ou clé commune `ia.api_key`). `ia status` liste les
  fournisseurs et leur couverture.
- **Jamais le cerveau** : la réponse est marquée `source: EXTERNAL_IA`, avec
  l'avertissement « à vérifier » ; elle n'est **jamais mémorisée
  automatiquement**. Capacité fournie : `CONSULTATION`.
- **Traçabilité** : chaque demande tracée dans `outbox/` (`ia log`, API
  `/api/ia/log`) — prompt, fournisseur, modèle, statut, réponse bornée, usage ;
  **jamais de clé ni de mot de passe**.
- **Moindre privilège** : outil bloqué par défaut (liste ci-dessous),
  autorisation `authorize ia` puis `install ia` exigées ; sans clé ou
  fournisseur inconnu → refus explicite, pas de réseau.
- Test réel : serveurs locaux simulant deux endpoints `/chat/completions`
  (multi-fournisseurs, Bearer vérifié, clé par fournisseur), refus
  inconnu/sans clé, trace outbox SENT sans clé, coffre + outbox temporaires
  autonettoyés.

## Outils bloqués par défaut (liste de moindre privilège)

`powershell, git, github, web, gmail, google_drive, google_docs,
google_sheets, google_calendar, google_maps, gemini, ia, notebook, camera,
microphone, voice_synthesis, voice_recognition, cloud_storage, social,
avatar, hosting, email` — tous `authorized: false` jusqu'à décision
explicite du tuteur (CLI `authorize` ou bouton web « Autoriser »).

## Demandes liées aux outils

Quand un outil est bloqué/non autorisé, le tuteur peut cliquer
« Demander au tuteur » dans la console : ceci crée un **besoin** dans
`core/needs.json` (visible dans l'onglet Demandes), puis AIgg reçoit la
décision. Un besoin n'est jamais une action automatique.
# ProjetAIgg

> Expérience : faire naître un petit être numérique volontairement limité à ses
> débuts, capable de grandir grâce à son environnement, ses expériences et la
> relation avec son tuteur.

AIgg n'est pas un chatbot de plus : c'est un **œuf numérique minimal**, indépendant
de toute IA externe obligatoire, qui acquiert progressivement des capacités et
des outils, sous le contrôle de son tuteur. Le premier AIgg expérimental s'appelle
**Bob007**, mais le logiciel sait créer d'autres AIgg avec d'autres noms et
d'autres tuteurs.

## Structure

| Dossier | Rôle |
|---|---|
| `AIgg/` | Corps logiciel de l'incubateur (code `src/`, outils `tools/`, interface `web/`, tests, docs) |
| `AIgg/docs/` | Documentation de l'état réel (audit, architecture, outils, sécurité, migration…) |

## Principes (extraits du Prompt Maître)

- **Capacité ≠ Outil ≠ Agent ≠ Service ≠ Identité.** Une IA externe n'est
  qu'un outil éventuel, jamais le cerveau d'AIgg.
- **Moindre privilège** : rien n'est publié, supprimé, migré ou envoyé sans
  autorisation ; les données privées (`core/`, `memory/`, `journal/`,
  `backups/`…) sont exclues de ce dépôt.
- **Le HTML est le corps visible d'AIgg** : son apparence se construit avec le
  tuteur (proposition → validation → application → journalisation).
- **Honnêteté** : une fonction n'est déclarée terminée que si testée
  réellement (PASS / FAIL / BLOCKED / NOT_TESTED).
- Cycle de travail : inspecter → auditer → documenter → tester → réparer →
  simplifier → construire → retester → documenter.

## Fonctionnalités réelles (état actuel, en bref)

- Naissance interactive (nom, tuteur, acte de naissance), identité persistante.
- Mémoire 4 familles, journal NDJSON, 8 états, sens (DISPONIBLE/AUTORISE/ACTIF).
- Capacités évolutives, permissions (tout bloqué par défaut).
- Registre d'outils + Contrat Commun (identité → capacité → permission → exécution → journal).
- Outils : `web` (lecture HTTP + recherche DuckDuckGo sans clé), `notebook`,
  `avatar` (SVG déterministe), `email` (envoi SMTP natif, PHASE 4),
  `gmail` (connecteur Gmail à scopes minimaux) + coffre local `vault`
  (secrets chiffrés AES-256-GCM, hors Git).
- **Conversation** honnête avec cycle d'apprentissage « apprends que X ».
- **Demandes** : AIgg peut demander de l'aide au tuteur.
- **Apparence** contrôlée et journalisée.
- **Migration** portable avec continuité strict de l'AIgg_ID.
- **Bibliothèques de spécialisation** : apprentissage structuré appartenant au
  tuteur (sources, documents jamais exécutés, connaissances avec provenance,
  compétences jamais MASTERED automatiquement, contradictions, recherche,
  export/import) — privées par défaut.
- Console tuteur web (http://127.0.0.1:8070/) + 134 auto-diagnostics.

## Démarrage rapide

Prérequis : Node.js ≥ 18 (pas de dépendance npm).

```powershell
cd AIgg
.\AIgg.cmd birth        # naissance : nom, tuteur → acte de naissance
.\AIgg.cmd server       # console du tuteur → http://127.0.0.1:8070/
.\AIgg.cmd tests        # auto-diagnostics (198 vérifications réelles)
```

Premiers outils :

```powershell
.\AIgg.cmd discover
.\AIgg.cmd propose web
.\AIgg.cmd authorize web
.\AIgg.cmd install web
.\AIgg.cmd web-read https://example.com/
```

Migration sur autre support :

```powershell
.\AIgg.cmd migrate G:\AIgg\Bob007
```

## Vie privée

Les données d'identité, de mémoire, le journal, le carnet, les besoins et les
sauvegardes sont **exclus de ce dépôt** (voir `AIgg/.gitignore`). Ce dépôt
contient uniquement code et documentation publique. Les documents de conception
(recette de naissance, écosystème, Prompt Maître) sont **privés**, échangés
hors dépôt. Aucun secret ne doit y
figurer (test automatisé inclus).

## Contenu de la release v0.1.0

- Socle N0 : identité, mémoire (4 familles), journal, sens, capacités,
  permissions, 8 états, veille/réveil, âge, sauvegarde/restauration.
- Contrat Commun + registre d'outils (web / notebook / avatar).
- Conversation, besoins/demandes, apparence contrôlée, migration portable.
- Console du tuteur web + suite d'auto-diagnostics (68 PASS).
- Documentation pour les futurs agents (`docs/`).

## Contenu de la release v0.2.0

- **Recherche bibliothèque niveau 2** : multilingue FR/EN/ES, normalisation des
  accents, classement pondéré et expliqué (cause par champ), filtres
  (bibliothèque / langue / type / statut / tags / provenance / limite).
- **Import réel via CLI** : `AIgg.cmd library import --file=… [--confirm]`
  (aperçu par défaut), identifiants stables préservés.
- **Sens réels de la machine** : sondes natives (Windows WINMM/WMI, Linux
  ALSA/V4L2) — jamais d'état inventé (sonde bloquée → `UNKNOWN`).
- **Aide CLI `library` en français** reflétant le code réel.
- **`AIgg.cmd docs-check`** : audit lecture seule de la cohérence
  docs ↔ code (versions, compteurs de tests).
- Suite de tests : **122 PASS / 0 FAIL**.

## Contenu de la release v0.3.0

- **Communication externe (PHASE 4)** : outil `email` — envoi SMTP **100 %
  natif** (RFC 5321), capabilité `COMMUNICATION`, traçabilité `outbox/`
  (privé), CLI `AIgg.cmd email send|status|log`, API `/api/email/send`,
  test réel via serveur SMTP local (message vérifié à la réception).
- Bloqué par défaut (moindre privilège) ; secrets/config hors Git.
- Limites honnêtes : réception IMAP, AUTH et STARTTLS non faits.
- Suite de tests : **123 PASS / 0 FAIL**.

## Contenu de la release v0.3.11

- **EXTAI, suite** : l'outil `ia` gagne **multi-fournisseurs** et
  **traçabilité outbox/**.
  - **Multi-fournisseurs** : registre `tools/ia/providers.json` (hors Git) pour
    ajouter des endpoints « chat completions » (openai par défaut, ollama
    local, openrouter, mistral…) ; `ia ask --provider=<nom>` ; `ia status`
    liste fournisseurs, modèles et couverture des clés. Clé par fournisseur
    (`vault put ia.api_key.<provider>`) ou clé commune `ia.api_key`.
  - **Traçabilité** : chaque demande tracée dans `outbox/` (ID, date,
    fournisseur, modèle, prompt, statut, réponse bornée, usage) — jamais de
    clé ; CLI `ia log`, API `/api/ia/log`.
  - Toujours **jamais cerveau** : réponse `EXTERNAL_IA`, jamais mémorisée
    automatiquement ; fournisseur inconnu ou clé absente → refus explicite sans
    réseau.
- Suite de tests : **198 PASS / 0 FAIL**.

## Contenu de la release v0.3.10

- **L'IA externe comme OUTIL, jamais comme cerveau** : outil `ia` — connecteur
  vers une IA externe compatible « chat completions » (ex. OpenAI), répondant à
  la feuille de route « IA externe » (EXTAI). Capacité `CONSULTATION` ; réponse
  marquée `EXTERNAL_IA`, jamais mémorisée automatiquement, toujours « à
  vérifier ». **Bloqué par défaut** : `AIgg.cmd authorize ia` puis
  `AIgg.cmd install ia`.
- **CLI** : `AIgg.cmd ia status|ask --prompt="…" [--system=…] [--model=…]` ;
  routes web `/api/ia/status` et `/api/ia/ask`.
- **Secrets** : clé d'API dans le coffre local (`vault put ia.api_key`), base
  d'API dans `tools/ia/config.json` (hors Git) ; sans clé → refus explicite.
- Suite de tests : **195 PASS / 0 FAIL**.

## Contenu de la release v0.3.9

- **La géopolitique par les cartes** : preset `learn geo` — **27 faits
  vérifiés**, esprit « Le Dessous des Cartes » (ARTE) : plus grand pays
  (Russie), pays le plus peuplé (Inde), ONU et Conseil de sécurité (P5), UE
  (27 États), OTAN (32 membres), G20, canal de Suez, détroit de Malacca,
  capitales méconnues (Canberra, Brasília, Ottawa, Ankara, Berne, Moscou,
  Wellington), Everest, mer Morte, plus longue frontière (Canada–États-Unis),
  Brexit, Nigeria, Groenland, Route de la soie, menace océanique sur les petits
  États insulaires — faits objectifs, sans parti pris, hors sujet → UNKNOWN.
- **Cohabitation fine des presets** : « qui a peint la Joconde » reste art,
  « quelle est la capitale… » va vers géo ; relectures croisées testées.
- CLI : `AIgg.cmd learn geo` (idempotent).
- Suite de tests : **192 PASS / 0 FAIL**.

## Contenu de la release v0.3.8

- **La culture des arts** : preset `learn art` — **27 connaissances vérifiées**
  d'histoire de l'art européen, esprit ARTE : du gothique à l'art conceptuel
  (chapelle Sixtine, Cène, Caravage, Rembrandt, Velázquez, Manet, van Gogh,
  cubisme, surréalisme, abstrait, Bauhaus, ready-made de Duchamp, photographie,
  art nouveau) et où voir les œuvres (Louvre, Orsay, Prado, Offices,
  Rijksmuseum).
- **Relecture précise** : la mémoire distingue finement les questions proches
  (« qui a peint / où se trouve la Joconde ») — toujours sans invention.
- CLI : `AIgg.cmd learn art` (idempotent).
- Suite de tests : **186 PASS / 0 FAIL**.

## Contenu de la release v0.3.7

- **La culture du tuteur** : preset `learn culture` — **27 connaissances
  vérifiées** inspirées de la ligne éditoriale d'ARTE (la chaîne : création
  1991, Strasbourg, Karambolage, Le Dessous des Cartes, Tracks, 28 minutes ;
  l'Europe : Charlemagne, traité de l'Élysée, traité de Rome ; l'art : Joconde,
  impressionnisme, Nouvelle Vague, Cannes ; les idées : Descartes, Kant,
  Lumières ; les sciences : Einstein, Galilée, Copernic, Gutenberg).
- **Relecture enrichie** : mots-outils interrogatifs (`quel`, `quelle`,
  `combien`…) ajoutés — les questions « quel… ? » répondent plus justement
  depuis la mémoire, toujours sans invention.
- CLI : `AIgg.cmd learn culture` (idempotent).
- Suite de tests : **180 PASS / 0 FAIL**.

## Contenu de la release v0.3.6

- **Apprentissage continu** : module `src/review.js` — relecture de la mémoire
  au réveil (CLI `wake` / `/api/wake`), révision des acquis (`review
  [propose|apply] [--days=N] [--plan]` → marques `LAST_REVIEW`/`REVISION_COUNT`,
  éventuelle demande `PLANIFICATION` au tuteur), et boucle journal→mémoire
  (`review --replay`, aussi automatique au réveil) : reconstitution en mémoire
  des acquisitions validées absentes, **idempotente et respectueuse des
  suppressions explicites** (`MEMORY_DELETE`).
- **Sûreté** : jamais d'invention — seules données réelles (mémoire, journal) ;
  capacités, outils et permissions intouchés.
- CLI : `AIgg.cmd review` (sec), `review apply`, `review --replay`.
- Suite de tests : **174 PASS / 0 FAIL**.

## Contenu de la release v0.3.5

- **AIgg connaît déjà Python** : preset de connaissances `learn python` —
  **27 connaissances fondamentales** (blocs, types, fonctions, classes, GIL,
  slicing, décorateurs, générateurs, dataclass, annotations…).
- **Presets réutilisables** : `src/presets.js` + fiches par domaine dans
  `src/presets/*.json` ; chargement idempotent (jamais de doublon), tracé
  `PRESET_LOADED`, source `PRESET`, confiance 0.85.
- **Relecture mémoire par la conversation** : quand le tuteur pose une question
  qui ressemble à une connaissance mémorisée, AIgg répond depuis sa mémoire
  (`KNOWLEDGE_RECALL`) — sans invention : sinon il avoue ignorer.
- CLI : `AIgg.cmd learn python` (ou `learn` sans argument = mode guidé).
- Suite de tests : **167 PASS / 0 FAIL**.

## Contenu de la release v0.3.4

- **Communication proactive (P1-COM)** : conversation **persistée**
  (`core/conversation.ndjson`), rechargée à chaque visite.
- **Questions ouvertes au tuteur** : « je me demande si X » crée un besoin
  `QUESTION` et passe l'état à `WAITING` ; le tuteur répond (console ou web)
  → réponse mémorisée + besoin `FULFILLED` + retour `AWAKE`.
- **Proactivité honnête** : au réveil, AIgg n'adresse un message QUE si des
  besoins sont réellement en attente ; sinon silence (aucune illusion).
- **État WAITING réel** : déclenché par les besoins ouverts, `LEARNING`
  confirmé → `AWAKE` ; badges + champ de réponse dans l'onglet Demandes.
- CLI : `talk <texte>`, `messages [answer <id> <rép>]`, `wake` → digest.
- Suite de tests : **160 PASS / 0 FAIL**.

## Contenu de la release v0.3.3

- **Apparence avancée (APP)** : **états visuels complets** — 8 couleurs
  d'état (`STATE_COLORS`) contrôlées par le tuteur, compatibilité avec les
  fichiers v1 (`mergeSchema`).
- **Avatar vivant** : variantes SVG par état (yeux, bouche, anneau de couleur
  d'état, `data-state`) — l'avatar reflète l'état d'AIgg.
- **CLI `appearance`** : `status|set|reset|suggest|apply|drop|avatar [état]`
  + aide française ; console web enrichie (badge coloré, sélecteurs d'état).
- Chemin d'application `--ap-state-*` ; routes serveur `/api/appearance/set`
  et `/api/appearance/reset` ; avatar régénéré après sleep/wake.
- Suite de tests : **142 PASS / 0 FAIL**.

## Contenu de la release v0.3.2

- **Connecteur Gmail (P2)** : outil `gmail` — moteur **100 % natif** de
  l'API Gmail v1 (`list` / `read` / `send`), **scope minimal
  `gmail.metadata`** (moindre privilège), refus explicite sans scope.
- **Secrets dans le coffre** : `gmail.access_token` et `gmail.scopes` dans
  le `vault` (jamais dans Git) ; envoi tracé dans `outbox/` ; bloqué par
  défaut.
- CLI `AIgg.cmd gmail status|list|read|send` ; test réel via serveur local
  simulé de l'API (aucun secret réel).
- Limite honnête : OAuth2 réel en attente des identifiants du tuteur.
- Suite de tests : **134 PASS / 0 FAIL**.

## Contenu de la release v0.3.1

- **Coffre-fort local chiffré (`vault`)** : secrets (mots de passe, tokens
  OAuth, identifiants de connecteurs) protégés en **AES-256-GCM + scrypt**
  (natif, aucun secret dans Git), `vault/` hors dépôt, mot de passe jamais
  stocké ; CLI `AIgg.cmd vault init|put|get|list|rm|wipe|status`.
- Suite de tests : **132 PASS / 0 FAIL**.

## Contenu de la release v0.2.2

- **Installation portable** : AIgg installé sur un autre lecteur via
  `AIgg.cmd migrate` (continuité d'identité préservée) — suite complète
  **122 PASS / 0 FAIL** validée sur le lecteur cible.
- **Tests portables** : §21 ne dépend plus du `README.md` racine du projet
  (inexistant dans une copie portable) — lecture conditionnelle.
- Suite de tests : **122 PASS / 0 FAIL**.

## Contenu de la release v0.2.1

- **Import CLI robuste** : un BOM UTF-8 en tête de fichier `--file` est
  ignoré (signature Windows/PowerShell) ; smoke de bout en bout validé
  (create → search → export → import → remove).
- Dossier privé tuteur `InformationsProjetAIgg/` retiré du dépôt public.
- Suite de tests : **122 PASS / 0 FAIL**.

## Contenu de la release v0.1.1

- **Bibliothèques de spécialisation** (`src/library.js`) : environnement
  d'apprentissage structuré, privé par défaut, appartenant au tuteur —
  sources, documents (jamais exécutés), connaissances (avec provenance),
  compétences (jamais `MASTERED` automatiquement), curriculum, exercices,
  contradictions, annotations, journal local, recherche niveau 1, export /
  import `aigg-library` v1.
- CLI `AIgg.cmd library …` + onglet web « Bibliothèques » + API `/api/libraries*`.
- Suite de tests : **93 PASS / 0 FAIL**.

## Licence

MIT — voir `LICENSE`.
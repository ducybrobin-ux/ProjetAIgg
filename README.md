# ProjetAIgg

> ExpÃ©rience : faire naÃ®tre un petit Ãªtre numÃ©rique volontairement limitÃ© Ã  ses
> dÃ©buts, capable de grandir grÃ¢ce Ã  son environnement, ses expÃ©riences et la
> relation avec son tuteur.

AIgg n'est pas un chatbot de plus : c'est un **Å“uf numÃ©rique minimal**, indÃ©pendant
de toute IA externe obligatoire, qui acquiert progressivement des capacitÃ©s et
des outils, sous le contrÃ´le de son tuteur. Le premier AIgg expÃ©rimental s'appelle
**Bob007**, mais le logiciel sait crÃ©er d'autres AIgg avec d'autres noms et
d'autres tuteurs.

## Structure

| Dossier | RÃ´le |
|---|---|
| `AIgg/` | Corps logiciel de l'incubateur (code `src/`, outils `tools/`, interface `web/`, tests, docs) |
| `AIgg/docs/` | Documentation de l'Ã©tat rÃ©el (audit, architecture, outils, sÃ©curitÃ©, migrationâ€¦) |

## Principes (extraits du Prompt MaÃ®tre)

- **CapacitÃ© â‰  Outil â‰  Agent â‰  Service â‰  IdentitÃ©.** Une IA externe n'est
  qu'un outil Ã©ventuel, jamais le cerveau d'AIgg.
- **Moindre privilÃ¨ge** : rien n'est publiÃ©, supprimÃ©, migrÃ© ou envoyÃ© sans
  autorisation ; les donnÃ©es privÃ©es (`core/`, `memory/`, `journal/`,
  `backups/`â€¦) sont exclues de ce dÃ©pÃ´t.
- **Le HTML est le corps visible d'AIgg** : son apparence se construit avec le
  tuteur (proposition â†’ validation â†’ application â†’ journalisation).
- **HonnÃªtetÃ©** : une fonction n'est dÃ©clarÃ©e terminÃ©e que si testÃ©e
  rÃ©ellement (PASS / FAIL / BLOCKED / NOT_TESTED).
- Cycle de travail : inspecter â†’ auditer â†’ documenter â†’ tester â†’ rÃ©parer â†’
  simplifier â†’ construire â†’ retester â†’ documenter.

## FonctionnalitÃ©s rÃ©elles (Ã©tat actuel, en bref)

- Naissance interactive (nom, tuteur, acte de naissance), identitÃ© persistante.
- MÃ©moire 4 familles, journal NDJSON, 8 Ã©tats, sens (DISPONIBLE/AUTORISE/ACTIF).
- CapacitÃ©s Ã©volutives, permissions (tout bloquÃ© par dÃ©faut).
- Registre d'outils + Contrat Commun (identitÃ© â†’ capacitÃ© â†’ permission â†’ exÃ©cution â†’ journal).
- Outils : `web` (lecture HTTP + recherche DuckDuckGo sans clÃ©), `notebook`,
  `avatar` (SVG dÃ©terministe), `email` (envoi SMTP natif, PHASE 4),
  `gmail` (connecteur Gmail Ã  scopes minimaux) + coffre local `vault`
  (secrets chiffrÃ©s AES-256-GCM, hors Git).
- **Conversation** honnÃªte avec cycle d'apprentissage Â« apprends que X Â».
- **Demandes** : AIgg peut demander de l'aide au tuteur.
- **Apparence** contrÃ´lÃ©e et journalisÃ©e.
- **Migration** portable avec continuitÃ© strict de l'AIgg_ID.
- **BibliothÃ¨ques de spÃ©cialisation** : apprentissage structurÃ© appartenant au
  tuteur (sources, documents jamais exÃ©cutÃ©s, connaissances avec provenance,
  compÃ©tences jamais MASTERED automatiquement, contradictions, recherche,
  export/import) â€” privÃ©es par dÃ©faut.
- Console tuteur web (http://127.0.0.1:8070/) + 289 auto-diagnostics.

## DÃ©marrage rapide

PrÃ©requis : Node.js â‰¥ 18 (pas de dÃ©pendance npm).

```powershell
cd AIgg
.\AIgg.cmd birth        # naissance : nom, tuteur â†’ acte de naissance
.\AIgg.cmd server       # console du tuteur â†’ http://127.0.0.1:8070/
.\AIgg.cmd tests        # auto-diagnostics (289 vÃ©rifications rÃ©elles)
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

## Vie privÃ©e

Les donnÃ©es d'identitÃ©, de mÃ©moire, le journal, le carnet, les besoins et les
sauvegardes sont **exclus de ce dÃ©pÃ´t** (voir `AIgg/.gitignore`). Ce dÃ©pÃ´t
contient uniquement code et documentation publique. Les documents de conception
(recette de naissance, Ã©cosystÃ¨me, Prompt MaÃ®tre) sont **privÃ©s**, Ã©changÃ©s
hors dÃ©pÃ´t. Aucun secret ne doit y
figurer (test automatisÃ© inclus).

## Contenu de la release v0.5.0

- **Cognition â€” orchestration cognitive (socle)** : la fin du Â« je ne sais pas Â» sec â€”
  AIgg passe par un cycle **rÃ©el** `rappel mÃ©moire â†’ recherche bibliothÃ¨que â†’
  diagnostic du manque â†’ plan + outils candidats` et annonce un **Ã©tat cognitif
  honnÃªte** (`JE_SAIS`, `J_AI_TROUVE`, `JE_PEUX_CHERCHER`,
  `JE_N_AI_PAS_OUTIL_PERMISSION`, `J_AI_BESOIN_DE_PRECISION`â€¦). Rappel mÃ©moire
  **jamais inventÃ©** ; consultation des bibliothÃ¨ques (L2) avec provenance ;
  **capacitÃ© â‰  permission** (outils candidats vÃ©rifiÃ©s installÃ©+autorisÃ©, **aucun
  outil exÃ©cutÃ©** en socle) ; apprentissage ouvert â†’ **besoin `QUESTION`** au tuteur,
  rÃ©ponse mÃ©morisÃ©e et besoin clÃ´turÃ©.
- **Conversation enrichie** : Â« Je ne sais pas encore rÃ©pondre Ã  cela (â€¦) â€” Ã‰tat
  cognitif : â€¦ Â» ; `/api/talk` expose le rÃ©sultat cognitif ; CLI
  `AIgg.cmd cognition "question"`.
- La recherche OUTIL rÃ©elle (Web multi-sources, IA externe comme outil) arrive en
  **v0.5.1**.
- Suite de tests : **290 PASS / 0 FAIL**.

## Contenu de la release v0.1.0

- Socle N0 : identitÃ©, mÃ©moire (4 familles), journal, sens, capacitÃ©s,
  permissions, 8 Ã©tats, veille/rÃ©veil, Ã¢ge, sauvegarde/restauration.
- Contrat Commun + registre d'outils (web / notebook / avatar).
- Conversation, besoins/demandes, apparence contrÃ´lÃ©e, migration portable.
- Console du tuteur web + suite d'auto-diagnostics (68 PASS).
- Documentation pour les futurs agents (`docs/`).

## Contenu de la release v0.2.0

- **Recherche bibliothÃ¨que niveau 2** : multilingue FR/EN/ES, normalisation des
  accents, classement pondÃ©rÃ© et expliquÃ© (cause par champ), filtres
  (bibliothÃ¨que / langue / type / statut / tags / provenance / limite).
- **Import rÃ©el via CLI** : `AIgg.cmd library import --file=â€¦ [--confirm]`
  (aperÃ§u par dÃ©faut), identifiants stables prÃ©servÃ©s.
- **Sens rÃ©els de la machine** : sondes natives (Windows WINMM/WMI, Linux
  ALSA/V4L2) â€” jamais d'Ã©tat inventÃ© (sonde bloquÃ©e â†’ `UNKNOWN`).
- **Aide CLI `library` en franÃ§ais** reflÃ©tant le code rÃ©el.
- **`AIgg.cmd docs-check`** : audit lecture seule de la cohÃ©rence
  docs â†” code (versions, compteurs de tests).
- Suite de tests : **122 PASS / 0 FAIL**.

## Contenu de la release v0.3.0

- **Communication externe (PHASE 4)** : outil `email` â€” envoi SMTP **100 %
  natif** (RFC 5321), capabilitÃ© `COMMUNICATION`, traÃ§abilitÃ© `outbox/`
  (privÃ©), CLI `AIgg.cmd email send|status|log`, API `/api/email/send`,
  test rÃ©el via serveur SMTP local (message vÃ©rifiÃ© Ã  la rÃ©ception).
- BloquÃ© par dÃ©faut (moindre privilÃ¨ge) ; secrets/config hors Git.
- Limites honnÃªtes : rÃ©ception IMAP, AUTH et STARTTLS non faits.
- Suite de tests : **123 PASS / 0 FAIL**.

## Contenu de la release v0.3.13

- **Les Habitations** : le quota allouÃ© par le tuteur nomme l'habitation d'AIgg,
  du plus simple au plus fourni (Graine 100 Mo, Berceau 1 Go, Studio 2 Go,
  Appartement 5 Go, Maison 10 Go, Atelier 20 Go, Laboratoire 50 Go,
  Centre 100 Go, Ã‰cosystÃ¨me 250 Go et plus). Chaque niveau porte son plan
  d'Ã©quipement **prÃ©vu** (jamais annoncÃ© comme acquis). Plus d'espace
  â‰  plus intelligent. Conversation Â« oÃ¹ habites-tu ? Â» â†’ `LEVEL` ; CLI
  `AIgg.cmd berceau level`.
- **La SantÃ© du systÃ¨me** (Â§18 du plan) : vue consolidÃ©e rÃ©ellement mesurÃ©e â€”
  Ã©tat, niveau, espace (total/utilisÃ©/libre), bibliothÃ¨ques, outils
  (prÃ©sents/installÃ©s/autorisations/tests en Ã©chec), compÃ©tences
  (capacitÃ©s + bibliothÃ¨que : acquises/en cours/bloquÃ©es), permissions actives,
  sens, tÃ¢ches (notebook, besoins, questions), erreurs rÃ©centes du journal,
  sauvegardes. CLI `AIgg.cmd health`, API `/api/health`, onglet web Â« SantÃ© Â».
- Suite de tests : **220 PASS / 0 FAIL** (v0.3.14 : les seuils sont **prÃ©dictifs,
  jamais une obligation** â€” AIgg ne dÃ©mÃ©nage pas tout seul, continue d'acquÃ©rir
  badges/compÃ©tences/outils tant qu'il a de la place ; seul l'Ã©troitesse
  â‰¥ 85 % dÃ©clenche `AGRANDIR` ; test `habitation_predictif_non_obligatoire`).

## Contenu de la release v0.3.12

- **Le Berceau** : AIgg prend conscience de sa propre taille et de l'espace
  disque.
  - **Se connaÃ®tre** : mesure rÃ©elle de son poids (`src/berceau.js`) â€” ses
    donnÃ©es et son code, hors `backups/` (archives de protection) â€” et sonde
    rÃ©elle de l'espace libre (`fs.statfs`, natif ; sinon Â« inconnu Â», jamais
    inventÃ©).
  - **Quota allouÃ© par le tuteur** : 1 Go par dÃ©faut (`core/berceau.json`,
    privÃ©). S'il devient Ã  l'Ã©troit (â‰¥ 85 % du quota, ou disque trop plein),
    AIgg **demande de l'aide** par un besoin `AGRANDIR` unique : Â« Je suis Ã 
    l'Ã©troitâ€¦ peux-tu agrandir mon berceau ou me migrer ? Â», rappelÃ© au rÃ©veil.
    **Jamais d'action automatique** â€” le tuteur dÃ©cide :
    `AIgg.cmd berceau set 2G` ou `AIgg.cmd migrate <dest>`.
  - **Conversation + console** : Â« quelle est ta taille ? Â» â†’ rÃ©ponse rÃ©elle
    (`TAILLE`) ; onglet Demandes + CLI `AIgg.cmd berceau [set|check]` ; API
    `/api/berceau`.
- Suite de tests : **207 PASS / 0 FAIL**.

## Contenu de la release v0.3.11

- **EXTAI, suite** : l'outil `ia` gagne **multi-fournisseurs** et
  **traÃ§abilitÃ© outbox/**.
  - **Multi-fournisseurs** : registre `tools/ia/providers.json` (hors Git) pour
    ajouter des endpoints Â« chat completions Â» (openai par dÃ©faut, ollama
    local, openrouter, mistralâ€¦) ; `ia ask --provider=<nom>` ; `ia status`
    liste fournisseurs, modÃ¨les et couverture des clÃ©s. ClÃ© par fournisseur
    (`vault put ia.api_key.<provider>`) ou clÃ© commune `ia.api_key`.
  - **TraÃ§abilitÃ©** : chaque demande tracÃ©e dans `outbox/` (ID, date,
    fournisseur, modÃ¨le, prompt, statut, rÃ©ponse bornÃ©e, usage) â€” jamais de
    clÃ© ; CLI `ia log`, API `/api/ia/log`.
  - Toujours **jamais cerveau** : rÃ©ponse `EXTERNAL_IA`, jamais mÃ©morisÃ©e
    automatiquement ; fournisseur inconnu ou clÃ© absente â†’ refus explicite sans
    rÃ©seau.
- Suite de tests : **198 PASS / 0 FAIL**.

## Contenu de la release v0.3.10

- **L'IA externe comme OUTIL, jamais comme cerveau** : outil `ia` â€” connecteur
  vers une IA externe compatible Â« chat completions Â» (ex. OpenAI), rÃ©pondant Ã 
  la feuille de route Â« IA externe Â» (EXTAI). CapacitÃ© `CONSULTATION` ; rÃ©ponse
  marquÃ©e `EXTERNAL_IA`, jamais mÃ©morisÃ©e automatiquement, toujours Â« Ã 
  vÃ©rifier Â». **BloquÃ© par dÃ©faut** : `AIgg.cmd authorize ia` puis
  `AIgg.cmd install ia`.
- **CLI** : `AIgg.cmd ia status|ask --prompt="â€¦" [--system=â€¦] [--model=â€¦]` ;
  routes web `/api/ia/status` et `/api/ia/ask`.
- **Secrets** : clÃ© d'API dans le coffre local (`vault put ia.api_key`), base
  d'API dans `tools/ia/config.json` (hors Git) ; sans clÃ© â†’ refus explicite.
- Suite de tests : **195 PASS / 0 FAIL**.

## Contenu de la release v0.3.9

- **La gÃ©opolitique par les cartes** : preset `learn geo` â€” **27 faits
  vÃ©rifiÃ©s**, esprit Â« Le Dessous des Cartes Â» (ARTE) : plus grand pays
  (Russie), pays le plus peuplÃ© (Inde), ONU et Conseil de sÃ©curitÃ© (P5), UE
  (27 Ã‰tats), OTAN (32 membres), G20, canal de Suez, dÃ©troit de Malacca,
  capitales mÃ©connues (Canberra, BrasÃ­lia, Ottawa, Ankara, Berne, Moscou,
  Wellington), Everest, mer Morte, plus longue frontiÃ¨re (Canadaâ€“Ã‰tats-Unis),
  Brexit, Nigeria, Groenland, Route de la soie, menace ocÃ©anique sur les petits
  Ã‰tats insulaires â€” faits objectifs, sans parti pris, hors sujet â†’ UNKNOWN.
- **Cohabitation fine des presets** : Â« qui a peint la Joconde Â» reste art,
  Â« quelle est la capitaleâ€¦ Â» va vers gÃ©o ; relectures croisÃ©es testÃ©es.
- CLI : `AIgg.cmd learn geo` (idempotent).
- Suite de tests : **192 PASS / 0 FAIL**.

## Contenu de la release v0.3.8

- **La culture des arts** : preset `learn art` â€” **27 connaissances vÃ©rifiÃ©es**
  d'histoire de l'art europÃ©en, esprit ARTE : du gothique Ã  l'art conceptuel
  (chapelle Sixtine, CÃ¨ne, Caravage, Rembrandt, VelÃ¡zquez, Manet, van Gogh,
  cubisme, surrÃ©alisme, abstrait, Bauhaus, ready-made de Duchamp, photographie,
  art nouveau) et oÃ¹ voir les Å“uvres (Louvre, Orsay, Prado, Offices,
  Rijksmuseum).
- **Relecture prÃ©cise** : la mÃ©moire distingue finement les questions proches
  (Â« qui a peint / oÃ¹ se trouve la Joconde Â») â€” toujours sans invention.
- CLI : `AIgg.cmd learn art` (idempotent).
- Suite de tests : **186 PASS / 0 FAIL**.

## Contenu de la release v0.3.7

- **La culture du tuteur** : preset `learn culture` â€” **27 connaissances
  vÃ©rifiÃ©es** inspirÃ©es de la ligne Ã©ditoriale d'ARTE (la chaÃ®ne : crÃ©ation
  1991, Strasbourg, Karambolage, Le Dessous des Cartes, Tracks, 28 minutes ;
  l'Europe : Charlemagne, traitÃ© de l'Ã‰lysÃ©e, traitÃ© de Rome ; l'art : Joconde,
  impressionnisme, Nouvelle Vague, Cannes ; les idÃ©es : Descartes, Kant,
  LumiÃ¨res ; les sciences : Einstein, GalilÃ©e, Copernic, Gutenberg).
- **Relecture enrichie** : mots-outils interrogatifs (`quel`, `quelle`,
  `combien`â€¦) ajoutÃ©s â€” les questions Â« quelâ€¦ ? Â» rÃ©pondent plus justement
  depuis la mÃ©moire, toujours sans invention.
- CLI : `AIgg.cmd learn culture` (idempotent).
- Suite de tests : **180 PASS / 0 FAIL**.

## Contenu de la release v0.3.6

- **Apprentissage continu** : module `src/review.js` â€” relecture de la mÃ©moire
  au rÃ©veil (CLI `wake` / `/api/wake`), rÃ©vision des acquis (`review
  [propose|apply] [--days=N] [--plan]` â†’ marques `LAST_REVIEW`/`REVISION_COUNT`,
  Ã©ventuelle demande `PLANIFICATION` au tuteur), et boucle journalâ†’mÃ©moire
  (`review --replay`, aussi automatique au rÃ©veil) : reconstitution en mÃ©moire
  des acquisitions validÃ©es absentes, **idempotente et respectueuse des
  suppressions explicites** (`MEMORY_DELETE`).
- **SÃ»retÃ©** : jamais d'invention â€” seules donnÃ©es rÃ©elles (mÃ©moire, journal) ;
  capacitÃ©s, outils et permissions intouchÃ©s.
- CLI : `AIgg.cmd review` (sec), `review apply`, `review --replay`.
- Suite de tests : **174 PASS / 0 FAIL**.

## Contenu de la release v0.3.5

- **AIgg connaÃ®t dÃ©jÃ  Python** : preset de connaissances `learn python` â€”
  **27 connaissances fondamentales** (blocs, types, fonctions, classes, GIL,
  slicing, dÃ©corateurs, gÃ©nÃ©rateurs, dataclass, annotationsâ€¦).
- **Presets rÃ©utilisables** : `src/presets.js` + fiches par domaine dans
  `src/presets/*.json` ; chargement idempotent (jamais de doublon), tracÃ©
  `PRESET_LOADED`, source `PRESET`, confiance 0.85.
- **Relecture mÃ©moire par la conversation** : quand le tuteur pose une question
  qui ressemble Ã  une connaissance mÃ©morisÃ©e, AIgg rÃ©pond depuis sa mÃ©moire
  (`KNOWLEDGE_RECALL`) â€” sans invention : sinon il avoue ignorer.
- CLI : `AIgg.cmd learn python` (ou `learn` sans argument = mode guidÃ©).
- Suite de tests : **167 PASS / 0 FAIL**.

## Contenu de la release v0.3.4

- **Communication proactive (P1-COM)** : conversation **persistÃ©e**
  (`core/conversation.ndjson`), rechargÃ©e Ã  chaque visite.
- **Questions ouvertes au tuteur** : Â« je me demande si X Â» crÃ©e un besoin
  `QUESTION` et passe l'Ã©tat Ã  `WAITING` ; le tuteur rÃ©pond (console ou web)
  â†’ rÃ©ponse mÃ©morisÃ©e + besoin `FULFILLED` + retour `AWAKE`.
- **ProactivitÃ© honnÃªte** : au rÃ©veil, AIgg n'adresse un message QUE si des
  besoins sont rÃ©ellement en attente ; sinon silence (aucune illusion).
- **Ã‰tat WAITING rÃ©el** : dÃ©clenchÃ© par les besoins ouverts, `LEARNING`
  confirmÃ© â†’ `AWAKE` ; badges + champ de rÃ©ponse dans l'onglet Demandes.
- CLI : `talk <texte>`, `messages [answer <id> <rÃ©p>]`, `wake` â†’ digest.
- Suite de tests : **160 PASS / 0 FAIL**.

## Contenu de la release v0.3.3

- **Apparence avancÃ©e (APP)** : **Ã©tats visuels complets** â€” 8 couleurs
  d'Ã©tat (`STATE_COLORS`) contrÃ´lÃ©es par le tuteur, compatibilitÃ© avec les
  fichiers v1 (`mergeSchema`).
- **Avatar vivant** : variantes SVG par Ã©tat (yeux, bouche, anneau de couleur
  d'Ã©tat, `data-state`) â€” l'avatar reflÃ¨te l'Ã©tat d'AIgg.
- **CLI `appearance`** : `status|set|reset|suggest|apply|drop|avatar [Ã©tat]`
  + aide franÃ§aise ; console web enrichie (badge colorÃ©, sÃ©lecteurs d'Ã©tat).
- Chemin d'application `--ap-state-*` ; routes serveur `/api/appearance/set`
  et `/api/appearance/reset` ; avatar rÃ©gÃ©nÃ©rÃ© aprÃ¨s sleep/wake.
- Suite de tests : **142 PASS / 0 FAIL**.

## Contenu de la release v0.3.2

- **Connecteur Gmail (P2)** : outil `gmail` â€” moteur **100 % natif** de
  l'API Gmail v1 (`list` / `read` / `send`), **scope minimal
  `gmail.metadata`** (moindre privilÃ¨ge), refus explicite sans scope.
- **Secrets dans le coffre** : `gmail.access_token` et `gmail.scopes` dans
  le `vault` (jamais dans Git) ; envoi tracÃ© dans `outbox/` ; bloquÃ© par
  dÃ©faut.
- CLI `AIgg.cmd gmail status|list|read|send` ; test rÃ©el via serveur local
  simulÃ© de l'API (aucun secret rÃ©el).
- Limite honnÃªte : OAuth2 rÃ©el en attente des identifiants du tuteur.
- Suite de tests : **134 PASS / 0 FAIL**.

## Contenu de la release v0.3.1

- **Coffre-fort local chiffrÃ© (`vault`)** : secrets (mots de passe, tokens
  OAuth, identifiants de connecteurs) protÃ©gÃ©s en **AES-256-GCM + scrypt**
  (natif, aucun secret dans Git), `vault/` hors dÃ©pÃ´t, mot de passe jamais
  stockÃ© ; CLI `AIgg.cmd vault init|put|get|list|rm|wipe|status`.
- Suite de tests : **132 PASS / 0 FAIL**.

## Contenu de la release v0.2.2

- **Installation portable** : AIgg installÃ© sur un autre lecteur via
  `AIgg.cmd migrate` (continuitÃ© d'identitÃ© prÃ©servÃ©e) â€” suite complÃ¨te
  **122 PASS / 0 FAIL** validÃ©e sur le lecteur cible.
- **Tests portables** : Â§21 ne dÃ©pend plus du `README.md` racine du projet
  (inexistant dans une copie portable) â€” lecture conditionnelle.
- Suite de tests : **122 PASS / 0 FAIL**.

## Contenu de la release v0.2.1

- **Import CLI robuste** : un BOM UTF-8 en tÃªte de fichier `--file` est
  ignorÃ© (signature Windows/PowerShell) ; smoke de bout en bout validÃ©
  (create â†’ search â†’ export â†’ import â†’ remove).
- Dossier privÃ© tuteur `InformationsProjetAIgg/` retirÃ© du dÃ©pÃ´t public.
- Suite de tests : **122 PASS / 0 FAIL**.

## Contenu de la release v0.1.1

- **BibliothÃ¨ques de spÃ©cialisation** (`src/library.js`) : environnement
  d'apprentissage structurÃ©, privÃ© par dÃ©faut, appartenant au tuteur â€”
  sources, documents (jamais exÃ©cutÃ©s), connaissances (avec provenance),
  compÃ©tences (jamais `MASTERED` automatiquement), curriculum, exercices,
  contradictions, annotations, journal local, recherche niveau 1, export /
  import `aigg-library` v1.
- CLI `AIgg.cmd library â€¦` + onglet web Â« BibliothÃ¨ques Â» + API `/api/libraries*`.
- Suite de tests : **93 PASS / 0 FAIL**.

## Licence

MIT â€” voir `LICENSE`.
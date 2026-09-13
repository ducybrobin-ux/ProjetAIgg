# AIgg â€” Journal de dÃ©veloppement (CHANGELOG.md)

Format : `[version] date â€” type : description`. Types : ajout, correction,
amÃ©lioration, sÃ©curitÃ©, documentation.

## v0.5.0 â€” 2026-09-13 â€” ajout : le SOCLE de la Cognition (orchestration cognitive : Ã©tats honnÃªtes, rappel mÃ©moire/bibliothÃ¨que, stratÃ©gie, besoin QUESTION, AUCUN outil exÃ©cutÃ©)

### Ajout (Prompt MaÃ®tre Â« Cognition / orchestration cognitive Â» â€” socle d'abord)
- **Module `src/cognition.js`** : l'orchestrateur cognitif est du **code** â€” cycle
  rÃ©el `COMPRENDRE â†’ rappel mÃ©moire â†’ recherche bibliothÃ¨que â†’ diagnostic du manque â†’
  plan + outils candidats`, **sans jamais exÃ©cuter d'outil** Ã  ce stade (la recherche
  OUTIL rÃ©elle, Web + IA externe comme outil, arrive en v0.5.1).
- **11 Ã©tats cognitifs** (`STATES`) : JE_SAIS, JE_NE_SAIS_PAS, JE_NE_COMPRENDS_PAS,
  JE_PEUX_CHERCHER, JE_CHERCHE, J_AI_TROUVE, JE_DOIS_VERIFIER,
  J_AI_BESOIN_DE_PRECISION, JE_DOIS_DEMANDER_AU_TUTEUR, JE_N_AI_PAS_OUTIL_PERMISSION,
  PAS_DE_REPONSE_FIABLE.
- **Rappel mÃ©moire honnÃªte** (jamais une invention : score â‰¥ 0,6 et â‰¥ 2 mots communs)
  â†’ `JE_SAIS` (source `MEMORY`, confiance).
- **Rappel bibliothÃ¨que L2** (correspondance exacte ou score â‰¥ `MIN_LIBRARY_SCORE=12`)
  â†’ `J_AI_TROUVE` (provenance `LIBRARY` : titre, bibliothÃ¨que, extrait ; confiance =
  score normalisÃ©).
- **Manque diagnostiquÃ© et journalisÃ©** (`COGNITION_UNKNOWN` : WORK_ID, question,
  statut, outils utilisables, plan) â†’ `JE_PEUX_CHERCHER` (outil utilisable) ou
  `JE_N_AI_PAS_OUTIL_PERMISSION` ; stratÃ©gie rÃ©elle (`canSearch`, `bestTool`,
  `explanation`).
- **Outils candidats** cataloguÃ©s par `toolkit.discoverAll` : interactions du
  manifeste + `utilisable = installÃ© ET autorisÃ©` â€” **CAPACITÃ‰ â‰  PERMISSION, jamais
  contournÃ©**, **aucune exÃ©cution** ni activitÃ© fictive en socle.
- **Besoin de prÃ©cision via `needs.js`** (type `QUESTION`, jamais un devin) pour les
  apprentissages ouverts (Â« apprends-moi X Â») ; la rÃ©ponse du tuteur est **mÃ©morisÃ©e**
  et le besoin passe `FULFILLED` (cycle APPRENDRE).
- **Conversation honnÃªte enrichie** : Â« Je ne sais pas encore rÃ©pondre Ã  cela (â€¦) â€”
  Ã‰tat cognitif : â€¦ Â» + stratÃ©gie ; `/api/talk` et `talk` CLI exposent le rÃ©sultat
  cognitif (`cognition.*` : statut, activitÃ©s rÃ©elles, sources, plan, outils candidats).
- **CLI** `AIgg.cmd cognition "question"` + aide FR ; journalisation
  `COGNITION_MEMORY_HIT / _LIBRARY_HIT / _AMBIGUOUS / _UNKNOWN`.

### Tests
- Suite complÃ¨te : **290 PASS / 0 FAIL** (7 nouveaux autonettoyants Â§36,
  bibliothÃ¨que temp + mÃ©moire, besoins, conversation, Ã©tat et journal restaurÃ©s,
  dÃ©pÃ´t jamais modifiÃ©).

## v0.4.4 â€” 2026-09-12 â€” ajout : le SOCLE de la Descendance / procrÃ©ation (filiation, consentement et autorisation explicites, hÃ©ritage jamais automatique)

### Ajout (Prompt MaÃ®tre â€” Â« DESCENDANCE / PROCRÃ‰ATION Â», socle d'abord)
- **Module `src/descendance.js`** : le socle est du **code** ; l'Ã©tat rÃ©el est
  la source privÃ©e **`descendance/descendances.ndjson`** (ignorÃ©e par Git,
  comme `core/`, `memory/`, `relations/`, `interests/`, `competences/`).
- **CapacitÃ© avancÃ©e, jamais une crÃ©ation rÃ©elle** : l'Ã©tat maximal atteignable
  en socle est `AUTORISÃ‰` (accord des deux AIgg + autorisation des deux tuteurs).
  Aucune descendance n'est rÃ©ellement crÃ©Ã©e en v0.4.4.
- **Nouvelle identitÃ©, jamais une copie** (`NATURE`: `NOUVELLE_IDENTITE_JAMAIS_COPIE`).
- **HÃ©ritage jamais automatique** : `JAMAIS_HERITES = secrets privÃ©s,
  permissions, accÃ¨s aux outils` ; la liste blanche (`HERITABLES_PREVUS`)
  refuse toute catÃ©gorie interdite.
- **Accord EXPLICITE des deux AIgg concernÃ©s** (`consent`), dissociÃ© par partie
  (PROPOSEUR/PARTENAIRE) et tracÃ© en `TRANSACTIONS` (`CONSENT`, `CAMP: AIGG`) ;
  un partenaire inexistant (`PRÃ‰SENCE: PROVISOIRE`) ne peut pas consentir â€”
  aucune crÃ©ation simulÃ©e.
- **Autorisation EXPLICITE des deux tuteurs** (`authorize`, `CAMP: TUTEUR`),
  subordonnÃ©e aux accords AIgg ; **refus** explicite et tracÃ© (`REFUSER`,
  bloquant) ; **archivage rÃ©versible**.
- **Besoins/centres d'intÃ©rÃªt = signal uniquement** (`compat`) : ils ne
  dÃ©clenchent JAMAIS automatiquement une reproduction (dÃ©montrÃ© par le test).
- **Flux** : `PROPOSED â†’ CONSENTED â†’ AUTHORIZED` (+ `REFUSED`), traÃ§abilitÃ© de
  la filiation (FID, transactions, journal `DESCENDANCE_*`, souvenir mÃ©moire
  famille `relations`).
- **CLI** `AIgg.cmd descendance [list|propose|consent|authorize|refuse|check|compat|log|rm|restore|status]`
  + aide FR ; **API** `/api/descendance` (GET : statut + rÃ¨gle + projets ;
  POST : propose/consent/authorize/refuse/archive/restore/check/compat/log) +
  champ `descendance` dans `/api/state`.
- **Conscience intÃ©grÃ©e** : `Conscience/Relations.json` expose le bloc
  `DESCENDANCE` (projets, `PAR_STATUT`, `JAMAIS_HERITES`, rÃ¨gle, capacitÃ© de
  crÃ©ation NON implÃ©mentÃ©e), `Moi.json` le synthÃ©tise et `Limites.json` le
  dÃ©clare honnÃªtement comme non fait â€” jamais une 2e base.

### Tests
- Suite complÃ¨te : **282 PASS / 0 FAIL** (14 nouveaux autonettoyants Â§35,
  fichier temp + mÃ©moire `relations` et journal restaurÃ©s, `descendance/` du
  dÃ©pÃ´t jamais modifiÃ©).

## v0.4.3 â€” 2026-09-12 â€” ajout : l'Arbre de compÃ©tences / badges (branches, niveaux, prÃ©requis, preuves)

### Ajout (Prompt MaÃ®tre â€” arbre de compÃ©tences/badges, socle d'abord)
- **Module `src/badges.js`** : l'arbre est du **code** (jamais une 2e base) ;
  l'Ã©tat rÃ©el est la source privÃ©e **`competences/badges.ndjson`** (ignorÃ©e par
  Git, comme `core/`, `memory/`, `journal/`).
- **8 branches minimales du Prompt MaÃ®tre** (SOCLE, INFORMATIQUE,
  RAISONNEMENT, DÃ‰VELOPPEMENT, RECHERCHE, COMMUNICATION-SENS, SOCIAL,
  OUTILS) â€” **84 compÃ©tences**, chaÃ®ne dÃ©clarÃ©e : Connaissance â†’ Exercice â†’
  ExpÃ©rience/Test â†’ RÃ©sultat â†’ Validation â†’ Badge â†’ CapacitÃ© â†’ Outil â†’
  Nouvelles compÃ©tences.
- **Niveaux 0â†’6** : 0 inconnu, 1 dÃ©couverte, 2 comprÃ©hension, 3 pratique,
  4 autonome sous contrÃ´le, 5 maÃ®trise, 6 capable de transmettre/construire.
- **Rust structurant sans rÃ©Ã©criture** : Rust I â†’ Rust II â†’ Rust III â†’
  Rust systÃ¨me/rÃ©seau â†’ Rust/WebAssembly (prÃ©requis enchaÃ®nÃ©s).
- **PRÃ‰REQUIS non contournables** : un badge de niveau N peut exiger
  `REQUIS` (autres compÃ©tences â‰¥ niveau minimal) ; honor est refusÃ© tant
  qu'ils ne sont pas satisfaits.
- **RÃˆGLE D'OR â€” badge jamais automatique** : une PREUVE et la validation
  explicite du tuteur (`PAR`) sont requises ; chaque badge est tracÃ©
  (`TRANSACTIONS` : `BADGE:N`, `PROPOSAL`), journalisÃ© (`BADGE_HONORED`,
  `BADGE_PROPOSED`) et mÃ©morisÃ© (famille `procedures`). Niveau dÃ©croissant
  refusÃ©.
- **CAPACITÃ‰ â‰  PERMISSION** : un badge atteste d'une compÃ©tence, jamais d'une
  autorisation ; honor ne modifie aucune permission ni capacitÃ©.
- **Proposition d'apprentissage** (`propose`) : AIgg peut proposer ce qu'il
  veut apprendre, pourquoi et avec quelles ressources â€” jamais un badge sans
  validation.
- **CLI** `AIgg.cmd competences [tree|branches|levels|check|propose|honor|log|status]`
  + aide FR ; **API** `/api/competences` (GET : statut + arbre + niveaux +
  rÃ¨gle ; POST : propose/honor/check/log) + champ `competences` dans `/api/state`.
- **Conscience intÃ©grÃ©e** : `Conscience/Competences.json`
  (`ARBRE_COMPETENCES`, `NIVEAUX`, `MAX_NIVEAU`, `CHAINE`, `REGLE`, `BADGES`)
  et `Moi.json` (`badges_natives`, `competences_en_proposition`,
  `COMPETENCES_NATIVES`) citent cette source
  native â€” jamais une 2e base.

### Tests
- Suite complÃ¨te : **268 PASS / 0 FAIL** (14 nouveaux autonettoyants Â§34,
  fichier temp + mÃ©moire `procedures` et journal restaurÃ©s, `competences/` du
  dÃ©pÃ´t jamais modifiÃ©).

## v0.4.2 â€” 2026-09-12 â€” ajout : les IntÃ©rÃªts (prioritÃ©s internes + centres d'intÃ©rÃªt natifs)

### Ajout (Prompt MaÃ®tre â€” Â« des envies, des intÃ©rÃªts, des butsâ€¦ Â» abordÃ© par phases)
- **Module `src/interests.js`** : source **`interests/interests.ndjson`**
  (privÃ©e, ignorÃ©e par Git, comme `core/`, `memory/`, `journal/`) ; la couche
  Conscience reste une synthÃ¨se dÃ©rivÃ©e qui cite cette source.
- **7 prioritÃ©s internes** (`PRIORITES`) : `APPRENDRE`, `COMPRENDRE`,
  `INTEGRITE` (maintenir mon intÃ©gritÃ©), `EXPLORER`, `COMMUNIQUER`,
  `COMPETENCES` (dÃ©velopper des compÃ©tences), `OBJECTIFS`.
- **Centre d'intÃ©rÃªt** = sujet + prioritÃ© + intensitÃ© **EXPLICITE,
  PROGRESSIVE et TRACABLE** : 0 non exprimÃ© â†’ 1 intÃ©rÃªt dÃ©clarÃ© â†’ 2 intÃ©rÃªt
  approfondi â†’ 3 intÃ©rÃªt engagÃ©, plafond 3 ; chaque action est consignÃ©e dans
  `TRANSACTIONS` (`CREATION`, `INTENSITE:N`, `ARCHIVE`, `RESTORE`) et
  journalisÃ©e (`INTEREST_ADDED`, `INTEREST_INTENSIFIED`, `INTEREST_ARCHIVED`,
  `INTEREST_RESTORED`) + souvenir en mÃ©moire famille `knowledge`.
- **RÃ¨gle d'or** : les prioritÃ©s/intÃ©rÃªts ne contournent **jamais** les
  permissions du tuteur (capacitÃ© â‰  permission) et ne peuvent jamais
  dÃ©clencher automatiquement une reproduction ni une action externe.
- **RÃ©versibilitÃ©** : archivage et restauration tracÃ©s.
- **CLI** `AIgg.cmd interests [list|add|intensify|log|rm|restore|priorities]`
  + aide FR ; **API** `/api/interests` (GET : statut + liste + prioritÃ©s ;
  POST : add/intensify/rm/restore/log) + champ `interests` dans `/api/state`.
- **Conscience intÃ©grÃ©e** : `Conscience/Besoins.json` (`PRIORITES_INTERNES` +
  `REGLE`), `Conscience/CentresInterets.json` (intÃ©rÃªts natifs +
  `POIDS_REELS_PAR_DOMAINE`), Intentions, Objectifs et `Moi.json`
  (`BESOINS_ET_CENTRES_D_INTERET`) citent cette source native â€” jamais une 2e
  base.

### Tests
- Suite complÃ¨te : **254 PASS / 0 FAIL** (12 nouveaux autonettoyants Â§33,
  fichier temp + mÃ©moire `knowledge` et journal restaurÃ©s, `interests/` du
  dÃ©pÃ´t jamais modifiÃ©).

## v0.4.1 â€” 2026-09-12 â€” ajout : la fonction native Relations (confiance explicite, progressive, traÃ§able)

### Ajout (Prompt MaÃ®tre â€” RELATIONS, jamais une confiance automatique)
- **Module `src/relations.js`** : source **`relations/relations.ndjson`**
  (privÃ©e, ignorÃ©e par Git, comme `core/`, `memory/`, `journal/`) ; la couche
  Conscience reste une synthÃ¨se dÃ©rivÃ©e qui cite cette source.
- **CatÃ©gories** : `Tuteur`, `TuteurIgg` (tuteur d'un autre AIgg), `AmiHumain`,
  `AmiIgg`, `Parent`, `Autres`.
- **Confiance EXPLICITE** : toute relation dÃ©marre au niveau 0 ; une relation
  entre tuteurs ne crÃ©e **jamais automatiquement** une relation de confiance
  entre AIgg.
- **Confiance PROGRESSIVE et TRACABLE** : `trust` augmente d'exactement 1
  niveau (0 inconnue â†’ 1 connaissance explicite â†’ 2 confiance progressive â†’
  3 confiance Ã©tablie), plafond 3, chaque action est consignÃ©e dans
  `TRANSACTIONS` (`TRUST:N`, `CREATION`, `ARCHIVE`, `RESTORE`) et journalisÃ©e
  (`RELATION_ADDED`, `RELATION_TRUST`, `RELATION_ARCHIVED`,
  `RELATION_RESTORED`) + souvenir en mÃ©moire famille `relations`.
- **Parent = filiation structurelle, jamais une propriÃ©tÃ©** : la descendance a
  sa propre identitÃ© et n'hÃ©rite jamais automatiquement de secrets,
  permissions ni accÃ¨s aux outils.
- **RÃ©versibilitÃ©** : archivage et restauration tracÃ©s.
- **CLI** `AIgg.cmd relations [list|add|trust|log|rm|restore]` + aide FR ;
  **API** `/api/relations` (GET : statut + liste ; POST : add/trust/rm/restore/log)
  + champ `relations` dans `/api/state`.
- **Conscience intÃ©grÃ©e** : `Conscience/Relations.json` cite la source native
  (tuteur dÃ©rivÃ© de `core/identity.json` + relations natives), expose
  `REVUE` (rÃ¨gle de confiance), `PARENT` (filiation) et `CATEGORIES` ;
  `Moi.json` â†’ `RELATIONS` mis Ã  jour.

### Tests
- Suite complÃ¨te : **242 PASS / 0 FAIL** (12 nouveaux autonettoyants Â§32,
  fichier temp + mÃ©moire et journal restaurÃ©s, `relations/` du dÃ©pÃ´t jamais
  modifiÃ©).

## v0.4.0 â€” 2026-09-12 â€” ajout : la couche Conscience (synthÃ¨se fonctionnelle de soi) â€” socle + Moi.json

### Ajout (architecture fonctionnelle de connaissance de soi, jamais une 2e base, jamais conscient au sens philosophique)
- **Module `src/conscience.js`** : couche de **synthÃ¨se** qui lit les vraies
  sources (`core/identity.json`, `core/state.json`, capabilities, permissions,
  senses, memory/, journal/, libraries/, berceau, toolkit) et gÃ©nÃ¨re le dossier
  **`AIgg/Conscience/`** â€” 19 fichiers : `Identite.json`, `Moi.json`,
  `Etats.json`, `Perceptions.json`, `Memoire.json`, `Besoins.json`,
  `Intentions.json`, `Objectifs.json`, `CentresInterets.json`, `Emotions.json`,
  `Relations.json`, `Competences.json`, `Valeurs.json`, `Limites.json`,
  `Experiences.json`, `Reflexion.json`, `Histoire.json`, `README.md` et
  `JournalConscient.ndjson` (append-only). Chaque section cite ses `SOURCES` ;
  **aucune valeur n'est inventÃ©e**.
- **`Moi.json`** rÃ©pond aux critÃ¨res du Prompt MaÃ®tre : QUI SUIS-JE /
  IDENTIFIANT / TUTEUR / OÃ™ SUIS-JE / Ã‰TAT / JE SAIS / JE PEUX / JE NE PEUX
  PAS / LIMITES / J'APPRENDS / BESOINS ET CENTRES D'INTÃ‰RÃŠT / RELATIONS /
  OUTILS / FAIT RÃ‰CENT / APPRIS / **PROCHAINE ACTION AUTORISÃ‰E**.
- **Prochaine action = capacitÃ© + permission** : jamais une initiative
  autonome ; si des besoins sont en attente, elle attend le tuteur ; Ã 
  l'Ã©troit, elle rappelle `AGRANDIR` (jamais d'action automatique).
- **HonnÃªtetÃ©** : Â« Conscience Â» = **architecture fonctionnelle**. Aucune
  Ã©motion simulÃ©e (`Emotions.json` = marqueur d'Ã©tat rÃ©el), modÃ¨le de Relations
  complet annoncÃ© pour v0.4.1, arbre compÃ©tences/badges pour v0.4.3.
- **Vie privÃ©e** : `Conscience/` est gÃ©nÃ©rÃ© sur la machine et **ignorÃ© par
  Git** (comme `core/`, `memory/`, `journal/`).
- CLI `AIgg.cmd conscience [status|sync|moi|files]` + aide FR ; API
  `/api/conscience` (GET) et `/api/conscience/sync` (POST).

### Tests
- Suite complÃ¨te : **242 PASS / 0 FAIL** (nouveaux autonettoyants Â§31 :
  `conscience_generer`, `conscience_fichiers_presents`,
  `conscience_meta_synthese`, `conscience_moi_criteres`,
  `conscience_identite_coherente`, `conscience_prochaine_action`,
  `conscience_relations_tuteur`, `conscience_journal_append`,
  `conscience_capacites_reelles`, `conscience_etat_reel` â€” gÃ©nÃ©ration dans un
  dossier temporaire, jamais dans le dÃ©pÃ´t).

## v0.3.14 â€” 2026-09-11 â€” clarification : les seuils d'habitation sont prÃ©dictifs, jamais une obligation

### AmÃ©lioration (rester avec de la place : on ne Â« dÃ©mÃ©nage Â» pas parce qu'un seuil approche)
- **Principe Â§1 clarifiÃ©** : franchir (ou approcher) le seuil d'une habitation
  ne force PAS AIgg Ã  dÃ©mÃ©nager. Les seuils (Graine 100 Mo â†’ Ã‰cosystÃ¨me 250 Go+)
  sont PRÃ‰DICTIFS : ils indiquent seulement quand un quota plus grand devient
  pertinent.
- **AIgg reste et continue** : tant qu'il a encore de l'espace disponible dans
  son quota, il continue d'acquÃ©rir badges, compÃ©tences et outils, quelle que
  soit sa proximitÃ© du seuil suivant. Le niveau n'est nommÃ© que par le quota
  rÃ©ellement allouÃ© par le tuteur.
- **Seul dÃ©clencheur** : le dÃ©mÃ©nagement n'est jamais automatique â€” soit le
  tuteur rÃ©alloue un quota plus grand (`berceau set`), soit AIgg devient Ã 
  l'Ã©troit (â‰¥ 85 % du quota) et DEMANDE (besoin `AGRANDIR`).
- **Textes alignÃ©s** : rÃ©ponse de conversation (`LEVEL`), `statusText()`,
  `AIgg.cmd berceau level` (champ `predictif` explicite), aide `berceau` ;
  toujours la mÃªme rÃ¨gle : Â« je peux rester ici et continuer d'acquÃ©rir Â».

### Tests
- Suite complÃ¨te : **220 PASS / 0 FAIL** (nouveaux autonettoyants Â§29 :
  `habitation_predictif_non_obligatoire`, `habitation_predictif_message`).

## v0.3.13 â€” 2026-09-11 â€” ajout : les Habitations (niveaux d'espace) et la SantÃ© du systÃ¨me

### Ajouts (nommer sa maison : quota â†’ habitation ; connaÃ®tre sa santÃ© rÃ©elle)
- **Niveaux d'espace â€” Habitations (`src/berceau.js`)** : le quota allouÃ© par
  le tuteur nomme l'habitation d'AIgg, du plus simple au plus fourni (Â§1 du plan
  du tuteur) : Graine (100 Mo), Berceau (1 Go), Studio (2 Go), Appartement
  (5 Go), Maison (10 Go), Atelier (20 Go), Laboratoire (50 Go), Centre (100 Go),
  Ã‰cosystÃ¨me (250 Go et plus). `berceau.level()` calcule le niveau rÃ©el depuis
  l'allocation ; chaque niveau porte son plan d'Ã©quipement PRÃ‰VU (jamais
  annoncÃ© comme acquis). **Plus d'espace â‰  plus intelligent**.
- **Conversation** : Â« â€¦quelle habitation ? / quel niveau ? / oÃ¹ habites-tu ? Â»
  â†’ rÃ©ponse rÃ©elle (`LEVEL`) : habitation, niveau, plan, prochaine habitation.
- **CLI `berceau level`** + statut enrichi (niveau + habitation + plan) ;
  `berceau` (statut) expose `levelName` / `levelIndex`.
- **Vue santÃ© consolidÃ©e â€” `src/health.js`** : les 14 points du plan (Â§18),
  tous mesurÃ©s rÃ©ellement : Ã©tat, niveau, espace (total/utilisÃ©/libre),
  bibliothÃ¨ques, outils (prÃ©sents/installÃ©s/autorisations/tests en Ã©chec),
  compÃ©tences (capacitÃ©s + compÃ©tences de bibliothÃ¨que acquises/en cours/
  bloquÃ©es), permissions actives, sens disponibles, tÃ¢ches (notebook, besoins,
  questions), erreurs rÃ©centes du journal (marqueur d'Ã©chec rÃ©el), sauvegardes.
- **CLI `AIgg.cmd health`**, API `/api/health`, champ `health` dans
  `/api/state`, onglet web Â« SantÃ© Â» (habitation + 14 points Â§18).

### Tests
- Suite complÃ¨te : **218 PASS / 0 FAIL** (nouveaux autonettoyants Â§29
  Habitations : `habitation_seuils`, `habitation_quota_nomme`,
  `habitation_graine`, `habitation_honnete`, `habitation_conversation` ;
  Â§30 SantÃ© : `sante_14_points`, `sante_espace_coherent`,
  `sante_niveau_coherent`, `sante_inventaire_reel`, `sante_erreurs_shape`,
  `sante_human_seuils` ; snapshot/restore de berceau, besoins, journal, Ã©tat).

## v0.3.12 â€” 2026-09-11 â€” ajout : le Berceau â€” AIgg se connaÃ®t en taille et demande de l'aide quand il est Ã  l'Ã©troit

### Ajouts (conscience de soi : poids, espace, quota â€” la Â« maison Â» allouÃ©e par le tuteur)
- **Module `src/berceau.js`** : mesure rÃ©elle de son propre poids
  (`measureSelf` : donnÃ©es vivantes de l'incubateur â€” `core`, `memory`,
  `journal`, `senses`, `inbox`, `outbox`, `notebook`, `libraries`, `vault`,
  `src`, `web`, `docs`, `tools`, `templates`â€¦ ; **exclues** : `backups/`
  (archives de protection), `node_modules/`, `.git/`).
- **Quota Â« Berceau Â» allouÃ© par le tuteur** : 1 Go par dÃ©faut, persistÃ© dans
  `core/berceau.json` (privÃ©, comme tout `core/`). **Jamais d'action
  automatique** : le tuteur dÃ©cide toujours (`AIgg.cmd berceau set <taille>`
  ou `AIgg.cmd migrate <dest>`).
- **Sonde d'espace libre rÃ©elle** du disque (`fs.statfs`, natif) ; si la sonde
  est indisponible â†’ honnÃªtement indiquÃ© Â« inconnu Â» (jamais un chiffre inventÃ©).
- **Seuil `tight`** : â‰¥ 85 % du quota franchi (ou disque trop plein) â†’ AIgg
  crÃ©e un besoin **`AGRANDIR`** unique : Â« Je suis Ã  l'Ã©troit : je pÃ¨se Xâ€¦ â€”
  peux-tu agrandir mon berceau ou me migrer ? Â». JournalisÃ© `BERCEAU_TIGHT`.
- **Conversation** : Â« quelle est ta taille ? / ton berceau ? / combien
  pÃ¨ses-tu ? Â» â†’ rÃ©ponse **rÃ©elle** (poids mesurÃ©, quota, espace libre) ;
  la conscience de sa taille devient une rÃ©ponse de fait, pas une simulation.
- **ProactivitÃ© honnÃªte** : au rÃ©veil, un besoin `AGRANDIR` actif est rappelÃ©
  au tuteur comme les questions/confirmations (`messages` / digest).
- **CLI `berceau`** : `berceau` (statut), `berceau set <taille>` (ex. `2G`,
  `1500M`, `1,5Go`, `1073741824`), `berceau check` (mesure + demande si Ã 
  l'Ã©troit) ; aide en franÃ§ais. **API web** : `/api/berceau`, et champs
  `berceau` dans `/api/state`.

### Tests
- Suite complÃ¨te : **207 PASS / 0 FAIL** (9 nouveaux autonettoyants :
  `berceau_mesure`, `berceau_human`, `berceau_alloc_defaut`,
  `berceau_parse_taille`, `berceau_statut`, `berceau_libre` (sonde rÃ©elle),
  `berceau_demande_unique`, `berceau_conversation`, `berceau_proactif` ;
  snapshot/restore de `core/berceau.json`, besoins, journal, conversation).

## v0.3.11 â€” 2026-09-11 â€” amÃ©lioration : EXTAI â€” multi-fournisseurs et traÃ§abilitÃ© outbox (outil `ia`)

### Ajouts (l'IA externe reste OUTIL, avec plus de fournisseurs et de transparence)
- **Multi-fournisseurs** : registre `tools/ia/providers.json` (hors Git, comme
  web/providers.json) pour ajouter des endpoints compatibles Â« chat
  completions Â» (openai par dÃ©faut ; ex. ollama local, openrouter, mistralâ€¦).
  Choix Ã  la demande : `ia ask --provider=<nom>` ; `ia status` liste les
  fournisseurs, leurs modÃ¨les et quelle clÃ© couvre chacun.
- **ClÃ© par fournisseur** : `vault put ia.api_key.<provider> "<clÃ©>"` (clÃ©
  propre) sinon clÃ© commune `ia.api_key`. Rien dans Git, l'aide, le journal,
  la mÃ©moire ni outbox/.
- **TraÃ§abilitÃ© outbox/** : chaque demande (rÃ©ussie ou non) est tracÃ©e
  (`outbox/â€¦-ia-*.json`) : ID, date, fournisseur, modÃ¨le, prompt, statut
  SENT/FAILED, rÃ©ponse (bornÃ©e) et usage â€” jamais de clÃ© ni de mot de passe.
  CLI `ia log`, API `/api/ia/log`. (Le dossier outbox/ est dÃ©jÃ  privÃ©.)
- **SÃ»retÃ©** : fournisseur inconnu â†’ refus explicite **sans rÃ©seau** ; sans
  clÃ© â†’ `missing`, pas de rÃ©seau ; prompt â‰¤ 4 000 car., rÃ©ponse â‰¤ 3 000 car.
  dans la trace, max_tokens â‰¤ 800.

### Tests
- Suite complÃ¨te : **198 PASS / 0 FAIL** (3 nouveaux autonettoyants :
  `ia_outbox_tracee` (multi-fournisseurs A+B simulÃ©s localement + trace outbox
  SENT), `ia_provider_inconnu_refus`, `ia_log_sans_cle`).

## v0.3.10 â€” 2026-09-11 â€” ajout : l'IA externe comme OUTIL (jamais comme cerveau)

### Ajouts (premier pas vers EXTAI â€” Â« IA externe, outil facultatif Â»)
- **Outil `ia` (`tools/ia/`)** : connecteur vers une IA externe compatible
  Â« chat completions Â» (ex. OpenAI). RÃ¨gle absolue respectÃ©e : **une IA externe
  est un outil que l'on consulte, jamais le cerveau d'AIgg** â€” capacitÃ©
  `CONSULTATION`, rÃ©ponse marquÃ©e `source: EXTERNAL_IA`, **jamais mÃ©morisÃ©e
  automatiquement**, toujours accompagnÃ©e d'un avertissement Â« Ã  vÃ©rifier Â».
- **CLI** : `AIgg.cmd ia status | ask --prompt="â€¦" [--system=â€¦] [--model=â€¦]
  [--max-tokens=â€¦]` ; routes web `/api/ia/status` et `/api/ia/ask` (aide en
  franÃ§ais). Outil **bloquÃ© par dÃ©faut** : autorisation (authorize) +
  installation (install) requises.
- **Secrets jamais publiÃ©s** : la clÃ© d'API vit dans le coffre local
  (`vault put ia.api_key "<clÃ©>"`), la base d'API par dÃ©faut se surcharge dans
  `tools/ia/config.json` (ignorÃ© par Git, comme gmail/web).
- **SÃ»retÃ©** : prompt limitÃ© (4 000 car.), rÃ©ponse max 800 tokens, timeout 20 s ;
  sans clÃ© â†’ refus explicite `missing: KEY/PASSWORD` (aucun rÃ©seau touchÃ©) ;
  rÃ©vocation = `revoke ia` + `vault rm ia.api_key`.

### Tests
- Suite complÃ¨te : **195 PASS / 0 FAIL** (3 nouveaux autonettoyants :
  `ia_outil_pas_cerveau` (manifest), `test_outil_ia` (endpoint `/v1/chat/completions`
  simulÃ© localement, Bearer vÃ©rifiÃ©, coffre temporaire), `ia_sans_cle_refus`).

## v0.3.9 â€” 2026-09-11 â€” ajout : la gÃ©opolitique du monde (preset `geo`, esprit Â« Le Dessous des Cartes Â»)

### Ajouts (AIgg apprend Ã  dÃ©crypter le monde par les cartes)
- **Preset `geo` (27 connaissances vÃ©rifiÃ©es)** de gÃ©ographie et de
  gÃ©opolitique, dans l'esprit cartographique du Â« Dessous des Cartes Â» (ARTE) :
  dÃ©finition de la gÃ©opolitique, Russie (plus grand pays), Inde (pays le plus
  peuplÃ©), ONU (193 membres) et Conseil de sÃ©curitÃ© (les Â« P5 Â», droit de veto),
  Union europÃ©enne (27 Ã‰tats, Bruxelles/Strasbourg/Luxembourg), OTAN (1949,
  32 membres), G20, Corne de l'Afrique, canal de Suez (Ã‰gypte, 1869), dÃ©troit de
  Malacca, capitales souvent mal connues (Canberra, BrasÃ­lia, Ottawa, Ankara,
  Berne, Moscou, Wellington), Everest, mer Morte, plus grand dÃ©sert (Antarctique),
  plus longue frontiÃ¨re (Canadaâ€“Ã‰tats-Unis), Brexit, Nigeria (pays le plus
  peuplÃ© d'Afrique), Groenland, Route de la soie, menace des ocÃ©ans sur les
  petits Ã‰tats insulaires.
- **CLI** : `AIgg.cmd learn geo` (idempotent).
- **SÃ»retÃ©** : faits objectifs et vÃ©rifiables uniquement, aucun parti pris ;
  hors sujet â†’ UNKNOWN. Relectures croisÃ©es intactes (ex. Â« qui a peint la
  Joconde Â» reste art, Â« quelle est la capitaleâ€¦ Â» va vers gÃ©o).

### Tests
- Suite complÃ¨te : **192 PASS / 0 FAIL** (6 nouveaux autonettoyants :
  `geo_preset_liste`, `geo_preset_load`, `geo_recall_capitale`,
  `geo_recall_detroit`, `geo_honnete`, `geo_aucune_derive_art` ; les entrÃ©es gÃ©o
  prÃ©-existantes sont prÃ©servÃ©es).

## v0.3.8 â€” 2026-09-11 â€” ajout : la culture des arts (preset `art`, histoire de l'art)

### Ajouts (AIgg approfondit la culture visuelle du tuteur)
- **Preset `art` (27 connaissances vÃ©rifiÃ©es)** d'histoire de l'art europÃ©en,
  dans l'esprit des documentaires culturels d'ARTE : gothique, chapelle
  Sixtine et CÃ¨ne (Michel-Ange, Vinci), clair-obscur et baroque (Caravage,
  Rembrandt, Bernin), SiÃ¨cle d'or nÃ©erlandais (Ronde de nuit, Jeune Fille Ã  la
  perle), VelÃ¡zquez et le Prado, romantisme (GÃ©ricault, Delacroix), Manet,
  post-impressionnisme (van Gogh), cubisme (Picasso, Braque), surrÃ©alisme
  (DalÃ­, Magritte), abstraction (Kandinsky), Bauhaus, ready-made (Duchamp),
  invention de la photographie, art nouveau, et oÃ¹ voir les Å“uvres (Louvre,
  Orsay, Prado, Offices, Rijksmuseum).
- **CLI** : `AIgg.cmd learn art` (idempotent). La relecture mÃ©moire distingue
  bien les doublons thÃ©matiques (ex. Â« qui a peint / oÃ¹ est la Joconde Â»).
- **SÃ»retÃ©** : connaissances seulement, vÃ©rifiÃ©es ; hors sujet â†’ UNKNOWN.

### Tests
- Suite complÃ¨te : **186 PASS / 0 FAIL** (6 nouveaux autonettoyants :
  `art_preset_liste`, `art_preset_load`, `art_recall_oeuvre`, `art_recall_lieu`,
  `art_idempotent`, `art_honnete` ; les entrÃ©es art prÃ©-existantes sont
  prÃ©servÃ©es).

## v0.3.7 â€” 2026-09-11 â€” ajout : la culture du tuteur (preset `culture`, inspirÃ© d'ARTE)

### Ajouts (AIgg gagne une culture vÃ©rifiÃ©e)
- **Preset `culture` (27 connaissances vÃ©rifiÃ©es)** dans l'esprit de la ligne
  Ã©ditoriale d'ARTE (Â« la plateforme culturelle europÃ©enne Â») : la chaÃ®ne ARTE
  elle-mÃªme (crÃ©ation 1991, premieres Ã©missions 30 mai 1992, siÃ¨ge de
  Strasbourg, prÃ©curseur Â« La Sept Â», Le Dessous des Cartes, Karambolage,
  28 minutes, Tracks), l'Europe (Charlemagne, traitÃ© de l'Ã‰lysÃ©e, traitÃ© de
  Rome, Strasbourg), l'art (Renaissance, Joconde, impressionnisme, Nouvelle
  Vague, Festival de Cannes), les idÃ©es (Descartes, Kant, LumiÃ¨res), les
  sciences (Einstein, GalilÃ©e, Copernic, Gutenberg) et le documentaire.
- **Relecture enrichie** : mots-outils interrogatifs ajoutÃ©s (`quel`, `quelle`,
  `quels`, `quelles`, `combien`, `ce`) pour que les questions en Â« quelâ€¦ Â»
  rÃ©pondent plus justement depuis la mÃ©moire â€” toujours sans invention (sinon
  UNKNOWN).
- **CLI** : `AIgg.cmd learn culture` (idempotent comme Python).

### Tests
- Suite complÃ¨te : **180 PASS / 0 FAIL** (6 nouveaux autonettoyants :
  `culture_preset_liste`, `culture_preset_load`, `culture_recall_arte`,
  `culture_recall_oeuvre`, `culture_idempotent`, `culture_honnete` â€” les
  entrÃ©es culture prÃ©-existantes du tuteur sont prÃ©servÃ©es).

## v0.3.6 â€” 2026-09-10 â€” ajout : apprentissage continu (relecture au rÃ©veil, rÃ©vision des acquis, boucle journalâ†’mÃ©moire)

### Ajouts (AIgg apprend seul, honnÃªtement, sur donnÃ©es rÃ©elles)
- **Module `src/review.js`** â€” trois mÃ©canismes, jamais d'invention :
  - **Relecture de la mÃ©moire au rÃ©veil** (`relireMemoire`) : Ã  chaque rÃ©veil
    (CLI `wake` et `/api/wake`), AIgg re-parcourt ses 4 familles et dresse un
    bilan rÃ©el (total, connaissances, acquises, en attente) â€” lecture seule.
  - **RÃ©vision des acquis** (`revisionAcquis`) : les connaissances Â« validÃ©es Â»
    non relues depuis N jours (7 par dÃ©faut) sont marquÃ©es
    (`LAST_REVIEW`, `REVISION_COUNT`) ; CLI `review [propose|apply] [--days=N]`;
    `--plan` demande un rendez-vous de rÃ©vision au tuteur (besoin
    `PLANIFICATION`, unique tant qu'il est actif). `propose` est sec.
  - **Boucle journalâ†’mÃ©moire** (`journalToMemory`) : relit le journal et
    reconstitue en mÃ©moire les acquisitions validÃ©es (`LEARN_VALIDATED` /
    `QUESTION_ANSWERED`) absentes â€” idempotent et SAUF suppression explicite
    (`MEMORY_DELETE` respectÃ©e). La suppression d'une connaissance (console web)
    journalise dÃ©sormais la question pour honorer ce respect.
- **CLI `wake`** : rÃ©veil â†’ relecture de la mÃ©moire + boucle journalâ†’mÃ©moire,
  puis digest proactif honorable (silence si rien en attente).
- **SÃ»retÃ©** : rÃ©vision et reconstitution ne modifient jamais une capacitÃ©, un
  outil ou une permission ; l'autobiographie/relations/procÃ©dures ne sont pas
  touchÃ©es par la boucle (connaissances uniquement).

### Tests
- Suite complÃ¨te : **174 PASS / 0 FAIL** (7 nouveaux autonettoyants :
  `continu_relire`, `continu_revision_propose`, `continu_revision_apply`,
  `continu_revision_idempotente`, `continu_planification`,
  `continu_boucle_restaure`, `continu_boucle_ignore_supprime`).

## v0.3.5 â€” 2026-09-10 â€” ajout : presets de connaissances + relecture mÃ©moire par la conversation

### Ajouts (AIgg connaÃ®t dÃ©jÃ  Python, sans invention)
- **Presets de connaissances** : module `src/presets.js` â€” `listPresets()`, `loadPreset()`,
  fiches par domaine dans `src/presets/*.json`, chargement idempotent (jamais de doublon),
  tracÃ© `PRESET_LOADED`, source `PRESET`, confiance 0.85, validÃ©.
- **Preset `python`** : 27 connaissances fondamentales (blocs, types, fonctions, classes,
  GIL, slicing, dÃ©corateurs, gÃ©nÃ©rateurs, dataclass, annotationsâ€¦).
- **CLI `learn python`** : `AIgg.cmd learn python` charge le preset ; `learn` sans argument
  reste le mode guidÃ© interactif.
- **Relecture mÃ©moire par la conversation** : si la question du tuteur ressemble Ã  une
  question mÃ©morisÃ©e (â‰¥ 0.6 de mots significatifs communs, â‰¥ 2 mots), AIgg rÃ©pond depuis
  sa mÃ©moire (`KNOWLEDGE_RECALL`) au lieu de dire Â« je ne sais pas Â». Aucune invention :
  sinon, il avoue ignorer.
- **SÃ»retÃ©** : le preset est un pur ajout de connaissances (jamais une capacitÃ©, jamais
  un outil, jamais une permission) ; les donnÃ©es restent dans `memory/knowledge/` (hors
  Git).

### Tests
- Suite complÃ¨te : **167 PASS / 0 FAIL** (7 nouveaux autonettoyants : `presets_liste`,
  `presets_python_load`, `presets_python_domaine`, `presets_python_idempotent`,
  `presets_inconnu`, `presets_memoire`, `presets_journal`).

## v0.3.4 â€” 2026-09-10 â€” ajout : communication proactive (conversation persistÃ©e, questions ouvertes, WAITING rÃ©el)

### Ajouts (communication d'abord, proactivitÃ© honnÃªte)
- **Conversation persistÃ©e** : module `src/conversation.js` â€” append/history/clear â€”
  historique `core/conversation.ndjson`, visible dans la console web et au rechargement.
- **Questions ouvertes au tuteur** : Â« je me demande si â€¦ Â» crÃ©e un besoin `QUESTION`,
  passe l'Ã©tat Ã  `WAITING`, le tuteur rÃ©pond (console/web) â†’ rÃ©ponse mÃ©morisÃ©e + besoin
  `FULFILLED` + Ã©tat `AWAKE`.
- **ProactivitÃ© honnÃªte** : au rÃ©veil, si des besoins QUESTION/CONFIRMATION sont en
  attente, AIgg adresse un `proactiveDigest` ; sinon silence (aucune illusion).
- **Ã‰tat WAITING rÃ©el** : dÃ©clenchÃ© par les besoins ouverts, transition vers `AWAKE`
  quand tous sont rÃ©solus ; `LEARNING` confirmÃ© par le tuteur â†’ `AWAKE`.
- **Console web** : fil de conversation reconstruit depuis le serveur (source de
  vÃ©ritÃ©), badge clignotant sur l'onglet Demandes, champ de rÃ©ponse aux questions.
- **CLI** : `talk <texte>` (one-shot persistÃ©), `messages [answer <id> <rÃ©p>]`
  (liste/rÃ©pond), `wake` dÃ©clenche le digest.

### Tests
- Suite complÃ¨te : **160 PASS / 0 FAIL** (18 nouveaux : `conversation_persiste`,
  `conversation_histoire`, `conversation_reponse_persistee`, `conversation_fichier`,
  `etat_waiting_question`, `question_need_creee`, `question_reponse`,
  `question_need_acheve`, `question_reponse_memorisee`, `etat_awake_apres_reponse`,
  `question_reponse_tracee`, `proactif_silence_sans_attente`, `proactif_digest_attente`,
  `proactif_digest_persiste`, `etat_learning_prop`, `etat_waiting_confirmation`,
  `apprentissage_valide_etat_awake`, `apprentissage_memorise`).

## v0.3.3 â€” 2026-09-07 â€” ajout : apparence avancÃ©e (Ã©tats visuels + avatar vivant)

### Ajouts (apparence contrÃ´lÃ©e, couleurs d'Ã©tat)
- **Ã‰tats visuels complets** : 8 couleurs d'Ã©tat (BORN/AWAKE/LEARNING/THINKING/WAITING/SLEEPING/PAUSED/STOPPED) dans `STATE_COLORS` (valeur par dÃ©faut), compatibilitÃ© ascendante assurÃ©e par `mergeSchema()`.
- **Avatar vivant** : variantes SVG par Ã©tat (yeux ouverts/fermÃ©s/demi, bouche, anneau de couleur d'Ã©tat) ; `data-state` sur la balise SVG pour vÃ©rification honnÃªte.
- **CLI `appearance`** : `status|set|reset|suggest|apply|drop|avatar [Ã©tat]` + aide franÃ§aise ; le tuteur peut modifier toutes les couleurs (COLORS + STATE_COLORS) directement depuis la CLI.
- **Console web enrichie** : badge colorÃ© par Ã©tat, sÃ©lecteurs d'Ã©tat (8 couleurs) dans l'onglet Apparence, anneau avatar dynamique.
- **Routes serveur** : `POST /api/appearance/set`, `/api/appearance/reset` ; avatar rÃ©gÃ©nÃ©rÃ© aprÃ¨s sleep/wake.
- **Chemin d'application** : les couleurs d'Ã©tat passent en tant que custom properties `--ap-state-*` dans le CSS.

### Limites honnÃªtes (documentÃ©es)
- L'avatar reste un SVG statique (pas d'animation) â€” il reflÃ¨te l'Ã©tat au moment de la rÃ©gÃ©nÃ©ration.
- Le tuteur doit rÃ©gÃ©nÃ©rer l'avatar manuellement (`AIgg.cmd appearance avatar`) si l'Ã©tat a changÃ© sans passer par sleep/wake.

### Tests
- Suite complÃ¨te : **142 PASS / 0 FAIL** (8 nouveaux : `apparence_state_colors`, `apparence_state_color`, `apparence_merge_retrocompat`, `apparence_reset`, `apparence_reset_journalise`, `avatar_etats_variantes`, `avatar_data_state`, `avatar_anneau_couleur`).

## v0.3.2 â€” 2026-09-07 â€” ajout : connecteur Gmail (P2) Ã  scopes minimaux

### Ajouts (premier connecteur Google, moindre privilÃ¨ge)
- **Outil `gmail`** (`tools/gmail/`) : moteur **100 % natif** de l'API Gmail
  v1 â€” `list` (mÃ©tadonnÃ©es), `read`, `send` â€” `fetch` Node â‰¥ 18, aucune
  dÃ©pendance npm. CapabilitÃ© `COMMUNICATION` (partagÃ©e avec l'outil `email`).
- **Moindre privilÃ¨ge** : scope minimal `gmail.metadata` par dÃ©faut ; `read`
  corps complet exige `gmail.readonly`, `send` exige `gmail.send` â€” refus
  explicite sinon (jamais de dÃ©passement silencieux).
- **Secrets dans le coffre** : `gmail.access_token` et `gmail.scopes`
  rangÃ©s dans le `vault` (AES-256-GCM, hors Git) ; mot de passe du coffre
  fourni Ã  chaque commande, jamais stockÃ©.
- **Envoi tracÃ©** dans `outbox/` (SENT/FAILED, mÃªme dossier que l'outil
  `email`) ; chaque action passe par le Contrat Commun (permission + capacitÃ©).
- **CLI** : `AIgg.cmd gmail status|list|read|send` + aide franÃ§aise ;
  `gmail` restaurÃ© dans `DEFAULT_TOOLS_BLOCKED` (bloquÃ© par dÃ©faut).
- `tools/gmail/config.json` (base d'API surchargable) ajoutÃ© au `.gitignore`.

### Limites honnÃªtes (documentÃ©es)
- Le moteur est **testÃ© contre une API Gmail simulÃ©e locale** (aucun secret
  rÃ©el, aucun rÃ©seau externe) â€” comme l'outil `email` avec son serveur SMTP
  local. L'accÃ¨s rÃ©el exige les identifiants OAuth2 du tuteur (projet Google
  Cloud : client + scopes) rangÃ©s dans le coffre.
- Les verbes OAuth (auth URL, redirect, refresh) ne sont pas encore un flux
  complet : le token renseignÃ© par le tuteur est utilisÃ© en Bearer direct.

### Tests
- Suite complÃ¨te : **134 PASS / 0 FAIL** (`test_outil_gmail` + 
  `gmail_scope_minimal` ; couverture list/read/send via serveur local simulÃ©,
  vÃ©rification du Bearer et du refus sans scope, coffre temporaire autonettoyÃ©).

## v0.3.1 â€” 2026-09-07 â€” sÃ©curitÃ© : coffre-fort local chiffrÃ© (vault)

### Ajouts (infrastructure de sÃ©curitÃ©, local)
- **Coffre-fort `vault`** (`src/vault.js`) : stockage de secrets (mots de
  passe, tokens OAuth, identifiants de connecteurs) **chiffrÃ©s** â€” AES-256-GCM,
  clÃ© dÃ©rivÃ©e par **scrypt** (module natif `crypto`, aucune dÃ©pendance npm),
  sel et IV alÃ©atoires par coffre, tag d'authentification.
- **Mot de passe jamais stockÃ©** : fourni Ã  chaque commande via `--password=`
  ou la variable d'environnement `AIGG_VAULT_PASSWORD` ; aucun champ mot de
  passe dans `vault/vault.json`, dans Git, le journal, la mÃ©moire ou les docs.
- **`vault/vault.json` hors Git** (`.gitignore` : `vault/`) â€” publiÃ© jamais,
  mÃªme chiffrÃ© (principe moindre privilÃ¨ge).
- **CLI** : `AIgg.cmd vault init|put|get|list|rm|wipe|status` + aide
  franÃ§aise ; journalisation des actions sans jamais rÃ©vÃ©ler les valeurs.
- Fonctions : `init`, `put`, `get`, `list`, `remove`, `wipe`, `status`,
  `runTest()` â€” version fichier (testable) + version par dÃ©faut (`PATHS.vault`).
- **Test rÃ©el autonettoyant** : coffre de test dans `os.tmpdir()`,
  autonomie totale (init â†’ put â†’ get â†’ mauvais mdp â†’ list â†’ rm â†’ wipe),
  secret vÃ©rifiÃ© **jamais en clair** dans le fichier ; aucun rÃ©sidu.

### Limites honnÃªtes (documentÃ©es)
- Aucune rÃ©cupÃ©ration possible si le mot de passe est perdu (par conception :
  aucun mot de passe enregistrÃ© nulle part).
- Pense-bÃªte : pour connecteurs Google (P2/PHASE 4-5), ranger les
  identifiants OAuth dans le coffre avant toute utilisation.

### Tests
- Suite complÃ¨te : **132 PASS / 0 FAIL** (9 vÃ©rifications VAULT ajoutÃ©es :
  `vault_test_autonettoyant`, init, put, get, mauvais mdp, clair jamais,
  list, rm, wipe).

## v0.3.0 â€” 2026-09-06 â€” communication externe : outil e-mail (PHASE 4, envoi SMTP)

### Ajouts (premier outil externe rÃ©el)
- **Outil `email`** (`tools/email/`) : envoi de messages via SMTP **100 %
  natif** (RFC 5321 : EHLO, MAIL FROM, RCPT TO, DATA, QUIT â€” module `net`,
  aucune dÃ©pendance npm). CapabilitÃ© `COMMUNICATION` acquise par
  `toolkit.install('email')`.
- **TraÃ§abilitÃ© `outbox/`** (privÃ©) : chaque envoi (rÃ©ussi ou Ã©chouÃ©) est
  journalisÃ© en JSON avec ID, destination, sujet, serveur, erreur.
- **Test rÃ©el autonettoyant** : serveur SMTP local (TCP sur port Ã©phÃ©mÃ¨re) â€”
  un message part rÃ©ellement et est vÃ©rifiÃ© Ã  la rÃ©ception ; aucun faux PASS.
- **CLI** : `AIgg.cmd email send|status|log` (libellÃ©s `--to --subject --body
  [--host --port --from --timeout_ms]`) + aide franÃ§aise complÃ¨te.
- **API HTTP** : `/api/email/send` (POST), `/api/email/log` (GET), via le
  Contrat Commun (journalisation `TOOL_EMAIL_EXEC`).
- BloquÃ© par dÃ©faut (moindre privilÃ¨ge) : `email` ajoutÃ© Ã 
  `DEFAULT_TOOLS_BLOCKED` ; `tools/email/config.json` exclu de Git.

### Limites honnÃªtes (documentÃ©es)
- RÃ©ception (IMAP), AUTH SMTP et STARTTLS **non implÃ©mentÃ©s** ; connecteurs
  Gmail / Drive / Docs / Sheets toujours prÃ©vus (PHASE 4-5), non faits.

### Tests
- Suite complÃ¨te : **123 PASS / 0 FAIL** (test_outil_email ajoutÃ©, Â§9
  `outils_essentiels` Ã©tendu Ã  `email`).

## v0.2.2 â€” 2026-09-06 â€” portabilitÃ© : installation sur un autre lecteur

### Corrections / amÃ©liorations
- **Tests portables** : Â§21 (docs-check) ne dÃ©pend plus du `README.md` racine
  du projet (inexistant dans une copie portable) â€” lecture conditionnelle via
  `fs.existsSync`. La suite passe dÃ©sormais sur un incubateur installÃ© sur un
  autre lecteur (ex. `G:\AIgg`, installÃ© via `AIgg.cmd migrate`).
- Installation portable vÃ©rifiÃ©e de bout en bout : `migrate` â†’ `status` â†’
  `docs-check` â†’ suite complÃ¨te **122 PASS / 0 FAIL** sur le lecteur cible.

## v0.2.1 â€” 2026-09-06 â€” finalisation N2 : import robuste + docs exactes

### Corrections / amÃ©liorations (facteur de robustesse)
- **Import CLI** : un BOM UTF-8 Ã©ventuel en tÃªte du fichier `--file` est
  dÃ©sormais ignorÃ© (Ã©chec `JSON.parse` auparavant avec un fichier signÃ©
  Windows/PowerShell) â€” `AIgg.js`.
- **Smoke de bout en bout** validÃ© rÃ©ellement : create â†’ source â†’ connaissance
  â†’ search (filtres, accents, score+cause) â†’ export â†’ import â†’ remove ; cause
  de classement `notes` ajoutÃ©e Ã  `docs/LIBRARIES.md` (Â§18).

### Remarque
- Suite de tests : **122 PASS / 0 FAIL**.

## v0.2.0 â€” 2026-09-06 â€” recherche niveau 2 + sens rÃ©els + aide CLI + docs-check

### Ajouts / amÃ©liorations
- **Recherche bibliothÃ¨que niveau 2 (N2)** : `searchL2(query, options)` dans
  `src/library.js` â€” normalisation accents/casse/ponctuation, arrÃªts FR/EN/ES,
  racinisation, classement pondÃ©rÃ© et expliquÃ© (cause par champ), filtres
  bibliothÃ¨que/langue/type/statut/tags/provenance/limit, rÃ©sultats multilingues.
- Import rÃ©el via CLI : `AIgg.cmd library import --file=â€¦ [--confirm]` (aperÃ§u
  par dÃ©faut, remplacement d'une bibliothÃ¨que existante de mÃªme id).
- `addKnowledge` / `addSource` / `addDocument` enrichis (`ID` stable via `id`,
  `TITLE`, `TAGS`, `CONCEPTS`, `LANGUAGE`), export/import `aigg-library` v1
  acceptant les deux dialectes (`bundle` ou `name`+`metadata`).
- **P9 â€” sens rÃ©els de la machine** : sondes sans prÃ©requis (Windows
  WINMM/WMI, Linux ALSA/V4L2), Ã©tats DISPONIBLE/AUTORISE/ACTIF jamais
  inventÃ©s (sonde bloquÃ©e â†’ `UNKNOWN`), cache 30 s, injectables pour les tests.
  DÃ©tection rÃ©elle Windows : MICROPHONE OUI, CAMERA NON, HAUT_PARLEURS OUI.
- **P10 â€” aide CLI `library` en franÃ§ais** : `AIgg.cmd library` sans argument
  affiche la documentation complÃ¨te reflÃ©tant le code rÃ©el (recherche niveau 2,
  import, Ã©tats, principes de sÃ©curitÃ©).
- **P11 â€” `docs-check`** : `AIgg.cmd docs-check` (lecture seule) vÃ©rifie la
  cohÃ©rence version + compteurs de tests entre STATE / CHANGELOG / README et le
  code ; ne modifie rien ; sortie Â« AIgg DOCS CHECK Â». Roadmap externe et wiki
  laissÃ©s en `MANUAL_CHECK`.
- Web (onglet BibliothÃ¨ques) : recherche niveau 2 avec sÃ©lecteurs Langue/Type
  et affichage du score + cause ; onglet Sens : raison affichÃ©e par capteur.
- DÃ©pÃ´t public : dossier privÃ© `InformationsProjetAIgg/` retirÃ© de GitHub
  (untrack + `.gitignore`), documents de conception Ã©changÃ©s hors dÃ©pÃ´t.

### Corrections
- `library.remove()` : le journal Ã©tait recrÃ©Ã© avant le dÃ©placement vers
  `_trash` (coquille vide) â†’ journalisation aprÃ¨s `renameSync` ; 35 coquilles
  rÃ©siduelles purgÃ©es.

### Remarque
- Suite de tests : **122 PASS / 0 FAIL** (94 â†’ 119 avec sens rÃ©els,
  recherche N2 et import ; â†’ 122 avec la couverture `docs-check`).
- Finalisation N2 (import BOM + docs exactes) : reportÃ©e en **v0.2.1**.

## v0.1.3 â€” 2026-09-06 â€” carnet : entrÃ©es rÃ©vocables, autonomie des tests

### Ajouts / amÃ©liorations
- `tools/notebook/notebook.js` : nouvelle interaction `notebook.remove(id)`
  (suppression d'une expÃ©rience, donnÃ©es locales uniquement).
- `runTest()` du carnet est dÃ©sormais **autonettoyant** : il supprime
  l'expÃ©rience `test_outil_notebook` qu'il crÃ©e (l'outil ne laisse plus de
  trace aprÃ¨s `AIgg.cmd test notebook`).
- Tests :: le test `NOTEBOOK RÃ‰EL` supprime son entrÃ©e `test_suite` et vÃ©rifie
  la suppression (`expÃ©rience_supprimÃ©e`) â†’ **94 PASS / 0 FAIL** (au lieu de
  93).
- CLI : `AIgg.cmd notebook-del <id>` (via contrat `notebook.remove`).
- API : `POST /api/notebook/remove` â†’ `{ id }` (contrÃ´lÃ© par le contrat).
- Console web : bouton **supprimer** sur chaque ligne du carnet.

### Nettoyage
- Purge des donnÃ©es rÃ©siduelles de test laissÃ©es par les anciennes versions
  du carnet (`test_suite`, `test_outil_notebook`) â€” seule l'expÃ©rience
  lÃ©gitime Â« Test du carnet de labo Â» subsiste.
- `.gitignore` : exclusion des messages du tuteur (`InformationsProjetAIgg/Message*.txt`).

## v0.1.2 â€” 2026-09-06 â€” correction naissance interactive

### Correction
- **Naissance interactive impossible depuis la release** : `AIgg.cmd` (sans
  identitÃ©) provoquait `PROBLÃˆME: process.stdin.close is not a function`
  (CAUSE/FIN). La collecte des rÃ©ponses TTY fermait `process.stdin` d'une
  faÃ§on non portable (introuvable sur certains Node) â†’ remplacÃ©e par la
  fermeture de l'interface `readline` (`rl.close()`), API stable partout.
  VÃ©rifiÃ© : naissance de bout en bout dans un bac Ã  sable (entrÃ©es canalisÃ©es),
  exit 0, Ã©tat `AWAKE`, `status` correct ensuite.
- Suppression de la fonction auxiliaire devenue orpheline (`askInteractive`).

### Remarque
- La suite de tests reste Ã  **93 PASS / 0 FAIL** (le parcours de naissance
  interactif n'est pas couvert par `tests/run-tests.js` : nÃ©cessite un TTY ;
  dÃ©sormais vÃ©rifiÃ© par reproduction directe dans un bac Ã  sable).

## v0.1.1 â€” 2026-09-05 â€” bibliothÃ¨ques de spÃ©cialisation (cahier)

### Ajouts
- Moteur `src/library.js` : environnement d'apprentissage structurÃ©, 100 %
  natif (JSON + fs), avec cycle de vie complet, sources, documents,
  connaissances (avec provenance), compÃ©tences, curriculum, exercices,
  contradictions, annotations, journal local, recherche niveau 1, import /
  export `aigg-library` v1.
- Distinctions absolues respectÃ©es : BIBLIOTHÃˆQUE â‰  MÃ‰MOIRE ; SOURCE â‰ 
  DOCUMENT â‰  CONNAISSANCE â‰  COMPÃ‰TENCE ; document/code jamais exÃ©cutÃ©
  (`NEVER_EXECUTED`) ; compÃ©tence jamais `MASTERED` automatiquement (preuve du
  tuteur requise).
- Templates `templates/library.json`, `source.json`, `curriculum.json`,
  `competency.json`.
- Exemples publics de structure `libraries/examples/science/` et
  `libraries/examples/programming/` (aucun savoir prÃ©-rempli).
- PrivÃ©e par dÃ©faut : `libraries/*` (sauf `examples/`) et `libraries/_trash/`
  exclus du dÃ©pÃ´t public (`.gitignore`).
- CLI `AIgg.cmd library â€¦` (list, health, create, show, sources, knowledge,
  competencies, curriculum, notes, journal, search, export, source-add,
  knowledge-add, competence-add, competence-set, contradiction-add, note-add,
  archive, restore, remove, trash).
- API HTTP `/api/libraries*` (CRUD, sources, connaissances, compÃ©tences,
  exercices, documents, curriculum, contradictions, annotations, journal,
  recherche, export, import avec analyse/confirmation).
- Onglet web Â« BibliothÃ¨ques Â» dans la console du tuteur (liste, dÃ©tail,
  crÃ©ation privÃ©e, recherche).
- Suite de tests : **93 PASS / 0 FAIL** (+ 25 vÃ©rifications TEST_LIBRARIES).

### Corrections
- `libRoot()` rÃ©solvait seulement `libraries/<id>` ; les bibliothÃ¨ques
  imbriquÃ©es (exemples publics) Ã©taient introuvables par `find()` â†’ recherche
  rÃ©cursive de l'id (hors `_trash`).
- `importActivate` posait l'id retournÃ© par `create()` (suffixe anti-collision
  pris en compte) ; les champs d'import en casse haute Ã©taient ignorÃ©s
  (connaissances/documents/exercices) â†’ normalisation haut/bas.
- `/api/library?id=` imbriquait `meta.meta` â†’ renvoie dÃ©sormais
  `{ meta, sources }` directement utilisable.

### SÃ©curitÃ©
- BibliothÃ¨ques privÃ©es par dÃ©faut ; corbeille `_trash` exclue du dÃ©pÃ´t.
- Documents importÃ©s et code jamais exÃ©cutÃ©s.

### Documentation
- `docs/LIBRARIES.md` (nouveau), `docs/STATE.md`, `docs/CHANGELOG.md`,
  `docs/DEVELOPMENT.md`, `docs/SECURITY.md`, `docs/ARCHITECTURE.md`,
  `docs/README.md`, `README.md` racine mis Ã  jour.

## v0.1.0 â€” 2026-09-05 â€” socle N0 + corpus du Prompt MaÃ®tre

### Ajouts
- Naissance : identitÃ© persistante (AIgg_ID UUID immuable), tuteur, acte de
  naissance, fuseau horaire, version, incubateur.
- MÃ©moire 4 familles (autobiographique, connaissances, relations, procÃ©dures) :
  mÃ©moriser, rappeler, corriger, supprimer.
- Journal NDJSON (Ã©vÃ©nements, pas de clÃ© dupliquÃ©e).
- Sens rÃ©flexes avec 3 Ã©tats (DISPONIBLE / AUTORISÃ‰ / ACTIF).
- CapacitÃ©s Ã©volutives (acquises / non acquises) et permissions (moindre
  privilÃ¨ge, toutes bloquÃ©es par dÃ©faut).
- Veille / rÃ©veil / Ã¢ge ; sauvegarde et restauration avec manifeste.
- Registre d'outils + Contrat Commun (IDENTIFIER â†’ CAPACITÃ‰ â†’ PERMISSION â†’
  EXÃ‰CUTER â†’ JOURNALISER â†’ RETOURNER) avec blocages honnÃªtes.
- Outils locaux : `web` (lecture HTTP + recherche DuckDuckGo sans clÃ©),
  `notebook` (carnet de laboratoire), `avatar` (SVG dÃ©terministe, sans secret).
- Console web du tuteur : identitÃ©, Ã©tat, capacitÃ©s, sens, outils,
  permissions, mÃ©moire, notebook, journal, sauvegardes.
- **8 Ã©tats** (BORN, AWAKE, LEARNING, THINKING, WAITING, SLEEPING, PAUSED,
  STOPPED) avec transition sÃ©curisÃ©e et journalisation.
- **Conversation** : moteur honnÃªte (`src/talk.js`), onglet Conversation,
  cycle d'apprentissage Â« apprends que X â†’ est-ce correct ? â†’ oui/non Â»
  enregistrÃ© comme demande au tuteur.
- **Besoins / Demandes** : registre `core/needs.json`, onglet Demandes,
  bouton Â« Demander au tuteur Â» sur les outils bloquÃ©s.
- **Apparence** : `core/appearance.json`, flux PROPOSÃ‰E â†’ VALIDÃ‰E â†’ APPLIQUÃ‰E
  â†’ JOURNALISÃ‰E, onglet Apparence, le HTML utilise des variables CSS pilotÃ©es
  (le HTML est le corps visible d'AIgg).
- **Migration** : `AIgg.cmd migrate <dest>` avec vÃ©rification de continuitÃ©
  AIgg_ID (copie portable, `backups/` exclu).
- Gestion d'erreurs CLI lisible : PROBLÃˆME / CAUSE / SOLUTION / Ã‰TAT.

### Corrections
- `state.wake()` ne renvoyait plus `age` aprÃ¨s refonte des Ã©tats (rÃ©gression)
  â†’ rÃ©tabli et testÃ©.
- Sens `RÃ‰SEAU` : dÃ©tection rÃ©elle des interfaces rÃ©seau (au lieu d'un `true`
  approximatif).
- Apostrophe franÃ§aise dans une chaÃ®ne (`'Demande d'aide'`) â†’ Ã©chappÃ©e.
- Erreur de dÃ©monstration : `AIgg.cmd tests` passe de 37 Ã  68 vÃ©rifications
  aprÃ¨s ajout des tests COMMUNICATION / INTERFACE / BESOINS / APPARENCE /
  MIGRATION / RECHERCHE (avec statut BLOCKED honnÃªte hors-ligne).

### SÃ©curitÃ©
- Aucun secret / mail rÃ©el dans le dÃ©pÃ´t (vÃ©rifiÃ©) ; fichiers privÃ©s exclus
  (`AIgg/core/`, `memory/`, `journal/`, `inbox/`, `outbox/`, `backups/`,
  `notebook/`, `senses/`, `providers.json`, `avatar.svg`).
- Licence MIT ajoutÃ©e (racine + package.json : `"license": "MIT"`).

### Documentation
- `docs/AUDIT.md` (audit honnÃªte de l'existant), `docs/STATE.md`,
  `docs/TOOLS.md`, `docs/CAPABILITIES.md`, `docs/SECURITY.md`,
  `docs/MIGRATION.md`, `docs/DEVELOPMENT.md`, `docs/CHANGELOG.md` (ce fichier) ;
  `ARCHITECTURE.md` et README mis Ã  jour.

## v0.0.1 â€” 2026-09-05 â€” embryon (avant audit)
- Structure du socle, modules de base, tests 37 PASS. Historique remplacÃ©
  par cet audit propre (aucune valeur perdue).
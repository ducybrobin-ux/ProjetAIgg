# AIgg â€” Ã‰tat du projet (STATE.md)

> Document de **rÃ©alitÃ© actuelle**, mis Ã  jour Ã  chaque Ã©change de travail.
> Statuts : `IMPLEMENTED` (testÃ©) / `PARTIAL` (partiel) / `PLANNED` (prÃ©vu non
> fait) / `BLOCKED` (bloquÃ©). Une fonction n'est jamais dÃ©clarÃ©e terminÃ©e sans
> test rÃ©el (PASS).

DerniÃ¨re mise Ã  jour : 2026-09-13 Â· CORE_VERSION 0.5.0 Â· Suite de tests : 290 PASS / 0 FAIL.

## Socle N0 â€” grande suite (testÃ© rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| Naissance (nom, tuteur, acte) | IMPLEMENTED | TEST_NAISSANCE / TEST_IDENTITE |
| IdentitÃ© persistante (AIgg_ID immuable) | IMPLEMENTED | TEST_IDENTITE |
| Tuteur (crÃ©ation, permissions, sauvegarde) | IMPLEMENTED | TEST_TUTEUR, CLI + web |
| MÃ©moire 4 familles + correction | IMPLEMENTED | TEST_MEMOIRE |
| Journal NDJSON (sans clÃ© dupliquÃ©e) | IMPLEMENTED | TEST_JOURNAL |
| CapacitÃ©s (acquis / non acquis) | IMPLEMENTED | TEST_IDENTITE + registres |
| Permissions (moindre privilÃ¨ge, tout bloquÃ©) | IMPLEMENTED | TEST_PERMISSIONS |
| Sens (DISPONIBLE/AUTORISE/ACTIF) â€” dÃ©tection rÃ©elle | IMPLEMENTED | TEST_SENS |
| Veille / rÃ©veil / Ã¢ge | IMPLEMENTED | TEST_IDENTITE + CLI |
| 8 Ã©tats (BORNâ†’STOPPED), transition sÃ©curisÃ©e | IMPLEMENTED | TEST_IDENTITE (etats_8) |
| Sauvegarde / restauration (manifeste) | IMPLEMENTED | TEST_SAUVEGARDE / TEST_RESTAURATION |
| Interface web (console tuteur) | IMPLEMENTED | TEST_INTERFACE + smoke HTTP |
| Registre d'outils + Contrat Commun | IMPLEMENTED | TEST_PERMISSIONS, TEST_CONTRAT |
| Outils web / notebook / avatar | IMPLEMENTED | TEST_OUTILS / TEST_RECHERCHE |

## Corpus du Prompt MaÃ®tre â€” 2e descente (testÃ© rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| Conversation (zone + moteur honnÃªte) | IMPLEMENTED | TEST_COMMUNICATION + smoke `/api/talk` |
| Cycle d'apprentissage Â« apprends que X â†’ confirmation Â» | IMPLEMENTED | TEST_COMMUNICATION |
| Registre de besoins Â« demander au tuteur Â» | IMPLEMENTED | TEST_BESOINS + smoke `/api/needs` |
| Apparence contrÃ´lÃ©e (proposerâ†’validerâ†’appliquerâ†’journaliser) | IMPLEMENTED | TEST_APPARENCE + smoke |
| Le HTML = corps visible (variables CSS pilotÃ©es) | IMPLEMENTED | smoke (style.css / --ap-*) |
| Migration / copie portable (continuitÃ© AIgg_ID) | IMPLEMENTED | TEST_MIGRATION |
| Gestion d'erreurs PROBLÃˆME/CAUSE/SOLUTION/Ã‰TAT | IMPLEMENTED | CLI `AIgg.js` (web-read, migrate, catch) |
| Tests du corpus (13 tests nommÃ©s) | IMPLEMENTED | tests/run-tests.js, 122 vÃ©rifications |
| Licence MIT | IMPLEMENTED | LICENSE (racine) + package.json |

## Apparence avancÃ©e (v0.3.3 â€” chantier APP, testÃ© rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| Ã‰tats visuels complets : `STATE_COLORS` (8 Ã©tats) | IMPLEMENTED | `apparence_state_colors` |
| Couleur d'Ã©tat rÃ©solue (`stateColor`, fallback) | IMPLEMENTED | `apparence_state_color` |
| SchÃ©ma rÃ©tro-compatible (`mergeSchema` complÃ¨te les fichiers v1) | IMPLEMENTED | `apparence_merge_retrocompat` |
| Reset de l'apparence (journalisÃ© `APPEARANCE_RESET`) | IMPLEMENTED | `apparence_reset`, `apparence_reset_journalise` |
| Avatar vivant : variantes par Ã©tat (yeux/bouche/anneau couleur) | IMPLEMENTED | `avatar_etats_variantes`, `avatar_data_state`, `avatar_anneau_couleur` |
| CLI `appearance` (status/set/reset/suggest/apply/drop/avatar) | IMPLEMENTED | `AIgg.cmd appearance` (testÃ©) |
| Badge colorÃ© par Ã©tat + sÃ©lecteurs d'Ã©tat dans la console web | IMPLEMENTED | web/public (app.js, index.html, style.css) |
| Avatar rÃ©gÃ©nÃ©rÃ© aprÃ¨s sleep/wake (web) | IMPLEMENTED | src/server.js (/api/sleep, /api/wake) |

## BibliothÃ¨ques de spÃ©cialisation â€” cahier appliquÃ© (testÃ© rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| Moteur `src/library.js` (100 % natif) | IMPLEMENTED | TEST_LIBRARIES |
| Cycle de vie create / list / update / remove (â†’ `_trash`) | IMPLEMENTED | TEST_LIBRARIES + CLI + API |
| Source â‰  Document â‰  Connaissance â‰  CompÃ©tence | IMPLEMENTED | TEST_LIBRARIES (provenance, NEVER_EXECUTED) |
| Document / code jamais exÃ©cutÃ© | IMPLEMENTED | TEST_LIBRARIES (`document_jamais_execute`) |
| CompÃ©tence jamais `MASTERED` automatiquement | IMPLEMENTED | TEST_LIBRARIES (`competence_jamais_mastered_auto`) |
| Contradictions signalÃ©es (OPEN â†’ RESOLVED) | IMPLEMENTED | TEST_LIBRARIES |
| Annotations du tuteur | IMPLEMENTED | TEST_LIBRARIES |
| Journal local par bibliothÃ¨que | IMPLEMENTED | TEST_LIBRARIES |
| Recherche niveaux 1 et 2 (multilingue FR/EN/ES, normalisation, classement expliquÃ©) | IMPLEMENTED | TEST_LIBRARIES (recherche_n2_*) |
| Export / import `aigg-library` v1 (analyse pour confirmer) | IMPLEMENTED | TEST_LIBRARIES |
| Import via CLI (`import --file=â€¦ [--confirm]`) | IMPLEMENTED | CLI testÃ© (aperÃ§u par dÃ©faut) |
| PrivÃ©e par dÃ©faut (hors dÃ©pÃ´t public) | IMPLEMENTED | `.gitignore` (libraries/* sauf examples/) |
| Exemples publics sans savoir inventÃ© | IMPLEMENTED | TEST_LIBRARIES (`exemples_sans_savoir_invente`) |
| API HTTP `/api/libraries*` + onglet web Â« BibliothÃ¨ques Â» | IMPLEMENTED | smoke HTTP rÃ©el (create/source/knowledge/search/export/delete) |
| CLI `AIgg.cmd library â€¦` + aide franÃ§aise | IMPLEMENTED | testÃ© rÃ©ellement (health/list/search/create/remove/import) |

## Petits travaux P9-P11 (pack du tuteur â€” testÃ© rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| P9 â€” Sondes sens rÃ©elles (Windows WINMM/WMI, Linux ALSA/V4L2) | IMPLEMENTED | TEST_SENS (sens_sonde_winmm_honnete, sens_bloque_unknown) |
| P10 â€” Aide CLI `library` en franÃ§ais reflÃ©tant le code rÃ©el | IMPLEMENTED | `AIgg.cmd library`, LIBRARIES.md, STATE/CHANGELOG |
| P11 â€” `docs-check` : audit docs/versions/compteurs, lecture seule | IMPLEMENTED | TEST_DOCS_CHECK (docs_check_ok, docs_check_detecte_divergence) |

## Communication externe e-mail â€” PHASE 4 (testÃ© rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| Outil `email` (manifeste + moteur) | IMPLEMENTED | `tools/email/` (manifest.json + email.js) |
| Envoi SMTP natif â€” RFC 5321 (EHLO/MAIL/RCPT/DATA/QUIT) | IMPLEMENTED | TEST_OUTIL_EMAIL (serveur SMTP local rÃ©el, message vÃ©rifiÃ© Ã  la rÃ©ception) |
| CapabilitÃ© `COMMUNICATION` (acquise par `install email`) | IMPLEMENTED | `toolkits` â€” capabilities.json |
| TraÃ§abilitÃ© `outbox/` (SENT/FAILED, private) | IMPLEMENTED | `email log` / `/api/email/log` |
| CLI `email send|status|log` + aide FR | IMPLEMENTED | `AIgg.cmd email` (testÃ©) |
| API `/api/email/send` (Contrat Commun) | IMPLEMENTED | serveur (route, smoke HTTP) |
| BloquÃ© par dÃ©faut + config.json hors Git | IMPLEMENTED | permissions.js (DEFAULT_TOOLS_BLOCKED), .gitignore |
| RÃ©ception IMAP, AUTH SMTP, STARTTLS | PLANNED | documentÃ© Â« non fait Â» (honnÃªtetÃ©) |

## Berceau â€” conscience de la taille et de l'espace (v0.3.12, testÃ© rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/berceau.js` : mesure rÃ©elle de soi (`measureSelf`, mondes exclus : `backups/`, `node_modules/`, `.git/`) | IMPLEMENTED | `berceau_mesure` |
| Quota allouÃ© par le tuteur, 1 Go par dÃ©faut (`core/berceau.json`, privÃ©) | IMPLEMENTED | `berceau_alloc_defaut` |
| Espace libre rÃ©el du disque (`fs.statfs`, sonde native) | IMPLEMENTED | `berceau_libre` (PASS rÃ©el) / `BLOCKED` si sonde indisponible |
| Statut `tight` (seuil 85 % du quota, ou disque trop plein) | IMPLEMENTED | `berceau_statut`, `berceau_demande_unique` |
| Demande honnÃªte : besoin `AGRANDIR` unique Â« je suis Ã  l'Ã©troit â€¦ agrandis ou migre Â» | IMPLEMENTED | `berceau_demande_unique` (crÃ©Ã© 1 seule fois) |
| Jamais d'action automatique : le tuteur agit (set / migrate) | IMPLEMENTED | conception + migration copie `core/berceau.json` |
| Conversation : Â« quelle est ta taille ? / ton berceau ? Â» â†’ `TAILLE` rÃ©el | IMPLEMENTED | `berceau_conversation` |
| ProactivitÃ© au rÃ©veil : besoin `AGRANDIR` rappelÃ© (comme QUESTION/CONFIRMATION) | IMPLEMENTED | `berceau_proactif` |
| CLI `berceau [set <taille> | check]` + aide FR, API `/api/berceau` | IMPLEMENTED | `AIgg.cmd berceau` (testÃ©) |

## Habitations et SantÃ© du systÃ¨me (v0.3.13, testÃ© rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| Niveaux d'espace (`berceau.level()` depuis le quota rÃ©el, Â§1 du plan tuteur) : Graine 100 Mo â†’ Berceau 1 Go â†’ Studio 2 Go â†’ Appartement 5 Go â†’ Maison 10 Go â†’ Atelier 20 Go â†’ Laboratoire 50 Go â†’ Centre 100 Go â†’ Ã‰cosystÃ¨me 250 Go+ | IMPLEMENTED | `habitation_seuils` |
| Le quota rÃ©ellement allouÃ© nomme l'habitation (jamais inventÃ©e) | IMPLEMENTED | `habitation_quota_nomme`, `habitation_graine` |
| HonnÃªtetÃ© : Ã©quipement listÃ© = PRIÃˆRE (plan), plus d'espace â‰  plus intelligent | IMPLEMENTED | `habitation_honnete` |
| Conversation Â« quelle habitation / quel niveau / oÃ¹ habites-tu Â» â†’ `LEVEL` rÃ©el | IMPLEMENTED | `habitation_conversation` |
| **Les seuils d'habitation sont PRÃ‰DICTIFS, jamais une obligation : AIgg reste et continue d'acquÃ©rir badges/compÃ©tences/outils tant qu'il a de la place â€” seul l'Ã©troitesse (â‰¥ 85 %) dÃ©clenche la demande `AGRANDIR`** | IMPLEMENTED | `habitation_predictif_non_obligatoire`, `habitation_predictif_message` |
| CLI `berceau level` + statut enrichi (`levelName`, `levelIndex`) + aide FR | IMPLEMENTED | `AIgg.cmd berceau level` (testÃ©) |
| Vue santÃ© consolidÃ©e `src/health.js` : les 14 points du plan (Â§18), tous mesurÃ©s rÃ©ellement | IMPLEMENTED | `sante_14_points`, `sante_inventaire_reel`, `sante_erreurs_shape` |
| Espace rÃ©el : total/utilisÃ©/libre cohÃ©rents avec le berceau | IMPLEMENTED | `sante_espace_coherent` |
| Inventaire rÃ©el : bibliothÃ¨ques et outils comptÃ©s depuis le disque, jamais fantÃ´mes | IMPLEMENTED | `sante_inventaire_reel` |
| CompÃ©tences : capacitÃ©s (core) + compÃ©tences de bibliothÃ¨que (acquises/en cours/bloquÃ©es) | IMPLEMENTED | `sante_human_seuils` |
| CLI `AIgg.cmd health`, API `/api/health`, champ `health` dans `/api/state`, onglet web Â« SantÃ© Â» | IMPLEMENTED | `AIgg.cmd health` (testÃ©) + smoke web |

## Relations â€” fonction native (v0.4.1, testÃ©e rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/relations.js` : source `relations/relations.ndjson` (NDJSON privÃ©, ignorÃ© par Git) | IMPLEMENTED | `relations_source_ndjson` |
| CatÃ©gories du Prompt MaÃ®tre : Tuteur, TuteurIgg, AmiHumain, AmiIgg, Parent, Autres | IMPLEMENTED | `relations_categories` |
| Confiance **explicite** : toute relation dÃ©marre Ã  0 (jamais implicite) | IMPLEMENTED | `relations_add_confiance_zero` |
| RÃ¨gle centrale : une relation entre tuteurs ne crÃ©e **jamais automatiquement** une confiance entre AIgg | IMPLEMENTED | `relations_tuteur_entier_aucune_confiance` |
| Confiance **progressive** (0â†’3) et **traÃ§able** (`TRANSACTIONS`, `TRUST:N`) | IMPLEMENTED | `relations_trust_progressif_trace` |
| Plafond de confiance (jamais au-delÃ  de 3) | IMPLEMENTED | `relations_trust_plafond` |
| Parent = filiation structurelle (jamais propriÃ©tÃ© ; identitÃ© sÃ©parÃ©e, aucun hÃ©ritage de secrets) | IMPLEMENTED | `relations_parent_filiation` |
| Trace consultable (`relations log <ID>`) | IMPLEMENTED | `relations_log_transactions` |
| Archivage **rÃ©versible** et tracÃ© (ARCHIVE/RESTORE) | IMPLEMENTED | `relations_archive_restaure` |
| CatÃ©gorie inconnue refusÃ©e (aucune invention) | IMPLEMENTED | `relations_categorie_invalide_refus` |
| SynthÃ¨se Conscience : `Conscience/Relations.json` cite la source native + tuteur ; `Moi.json` RELATIONS mis Ã  jour | IMPLEMENTED | `relations_conscience_integree` + CLI testÃ© |
| Tests autonettoyants (fichier temp, mÃ©moire et journal restaurÃ©s, dÃ©pÃ´t jamais modifiÃ©) | IMPLEMENTED | `relations_aucune_pollution_depot` |
| CLI `AIgg.cmd relations [list|add|trust|log|rm|restore]` + aide FR ; API `/api/relations` (GET/POST) | IMPLEMENTED | CLI testÃ© + smoke |

## IntÃ©rÃªts â€” prioritÃ©s internes + centres d'intÃ©rÃªt natifs (v0.4.2, testÃ©e rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/interests.js` : source `interests/interests.ndjson` (NDJSON privÃ©, ignorÃ© par Git) | IMPLEMENTED | `interests_source_ndjson` |
| 7 prioritÃ©s internes (`PRIORITES`) : APPRENDRE, COMPRENDRE, INTEGRITE, EXPLORER, COMMUNIQUER, COMPETENCES, OBJECTIFS (CODE/LABEL/NOTE) | IMPLEMENTED | `interests_priorites` |
| PrioritÃ© inconnue refusÃ©e (aucune invention) | IMPLEMENTED | `interests_priorite_inconnue_refus` |
| IntensitÃ© **explicite, progressive, traÃ§able** (0 non exprimÃ© â†’ 1 dÃ©clarÃ© â†’ 2 approfondi â†’ 3 engagÃ©) | IMPLEMENTED | `interests_intensite_progressive_trace` |
| Plafond d'intensitÃ© (jamais au-delÃ  de 3) | IMPLEMENTED | `interests_intensite_plafond` |
| RÃ¨gle d'or : jamais de contournement des permissions (capacitÃ© â‰  permission), aucune reproduction ni action externe automatique | IMPLEMENTED | `interests_jamais_contourne_permissions` |
| Transactions `CREATION`/`INTENSITE:N`/`ARCHIVE`/`RESTORE` + journal `INTEREST_*` + souvenir mÃ©moire famille `knowledge` | IMPLEMENTED | `interests_log_transactions`, `interests_journal_trace` |
| Archivage **rÃ©versible** et tracÃ© | IMPLEMENTED | `interests_archive_restaure` |
| SynthÃ¨se Conscience : `Conscience/Besoins.json` (`PRIORITES_INTERNES`), `CentresInterets.json`, Intentions, Objectifs, `Moi.json` citent la source native â€” jamais une 2e base | IMPLEMENTED | `interests_conscience_integree` |
| CLI `AIgg.cmd interests [list|add|intensify|log|rm|restore|priorities]` + aide FR ; API `/api/interests` (GET/POST) | IMPLEMENTED | CLI testÃ© + smoke |
| Tests autonettoyants (fichier temp, `knowledge` et journal restaurÃ©s, dÃ©pÃ´t jamais modifiÃ©) | IMPLEMENTED | `interests_aucune_pollution_depot` |

## CompÃ©tences / Badges â€” arbre natif (v0.4.3, testÃ©e rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/badges.js` : l'arbre est du **code** ; source d'Ã©tat `competences/badges.ndjson` (NDJSON privÃ©, ignorÃ© par Git) â€” jamais dupliquÃ© | IMPLEMENTED | `badges_source_ndjson` |
| 8 branches du Prompt MaÃ®tre (SOCLE, INFORMATIQUE, RAISONNEMENT, DÃ‰VELOPPEMENT, RECHERCHE, COMMUNICATION-SENS, SOCIAL, OUTILS) â€” 84 compÃ©tences | IMPLEMENTED | `badges_arbre_branches` |
| Niveaux 0â†’6 (inconnu â†’ transmettre/construire) + chaÃ®ne (Connaissance â†’ Exercice â†’ â€¦ â†’ Badge â†’ CapacitÃ© â†’ Outil â†’ Nouvelles compÃ©tences) | IMPLEMENTED | `badges_arbre_branches`, CLI `levels` |
| Rust structurant sans rÃ©Ã©criture : Rust I â†’ II â†’ III â†’ systÃ¨me/rÃ©seau â†’ WebAssembly (prÃ©requis) | IMPLEMENTED | `badges_rust_chain` |
| RÃ¨gle d'or : **jamais de badge automatique** â€” preuve + validation explicite du tuteur requises | IMPLEMENTED | `badges_honor_preuve_exigee` |
| Honor explicite et tracÃ© (`BADGE:N` + `TRANSACTIONS`, `BADGE_HONORED` journalisÃ©, souvenir mÃ©moire `procedures`) | IMPLEMENTED | `badges_honor_explicite_trace`, `badges_journal_trace` |
| CompÃ©tence non validÃ©e = niveau 0 INCONNU (aucun badge implicite) | IMPLEMENTED | `badges_aucun_honor_automatique` |
| **PrÃ©requis non contournables** (honor refusÃ© tant que `REQUIS` non satisfaits) | IMPLEMENTED | `badges_prerequis_refus` |
| Niveau dÃ©croissant refusÃ© (un badge ne se retire pas par surprise) | IMPLEMENTED | `badges_niveau_decroissant_refus` |
| Proposition d'apprentissage (`propose`) tracÃ©e, jamais un badge | IMPLEMENTED | `badges_propose_trace` |
| `check()` : PRÃŠT / OBSTACLES calculÃ©s depuis les prÃ©requis | IMPLEMENTED | `badges_check` |
| **CapacitÃ© â‰  permission** : honor ne modifie AUCUNE permission ni capacitÃ© | IMPLEMENTED | `badges_jamais_contourne_permissions` |
| SynthÃ¨se Conscience : `Conscience/Competences.json` (ARBRE_COMPETENCES, NIVEAUX, CHAINE, REGLE, BADGES) + `Moi.json` (`COMPETENCES_NATIVES`) citent la source native | IMPLEMENTED | `badges_conscience_integree` |
| CLI `AIgg.cmd competences [tree|branches|levels|check|propose|honor|log|status]` + aide FR ; API `/api/competences` (GET/POST) | IMPLEMENTED | CLI testÃ© + smoke |
| Tests autonettoyants (fichier temp, mÃ©moire `procedures` et journal restaurÃ©s, dÃ©pÃ´t jamais modifiÃ©) | IMPLEMENTED | `badges_aucune_pollution_depot` |

## Descendance / ProcrÃ©ation â€” socle (v0.4.4, testÃ©e rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/descendance.js` : le SOCLE du Prompt MaÃ®tre Â« DESCENDANCE / PROCRÃ‰ATION Â» est du **code** ; source d'Ã©tat `descendance/descendances.ndjson` (privÃ©e, ignorÃ©e par Git) â€” jamais dupliquÃ©e | IMPLEMENTED | `descend_source_ndjson` |
| **CapacitÃ© avancÃ©e** : le socle ne crÃ©e AUCUNE descendance â€” l'Ã©tat maximal atteignable est `AUTORISÃ‰` | IMPLEMENTED | `descend_aucune_creation_reelle` |
| Nouvelle identitÃ© exigÃ©e, **jamais une copie** | IMPLEMENTED | `descend_jamais_copie` |
| HÃ©ritage **jamais automatique** des secrets privÃ©s, permissions, accÃ¨s aux outils (`JAMAIS_HERITES`, liste blanche refusÃ©e) | IMPLEMENTED | `descend_heritage_jamais_permissions` |
| Accord EXPLICITE des **deux AIgg** (consent), dissociÃ© par partie et tracÃ© â€” un AIgg inexistant ne consent jamais (aucune crÃ©ation simulÃ©e) | IMPLEMENTED | `descend_accord_inexistant_refuse`, `descend_accord_explicite_trace` |
| Autorisation EXPLICITE des **deux tuteurs** (authorize), subordonnÃ©e aux accords AIgg | IMPLEMENTED | `descend_autorisation_tuteurs` |
| Besoins/centres d'intÃ©rÃªt = **signal uniquement** (`compat`), jamais un dÃ©clenchement de reproduction | IMPLEMENTED | `descend_jamais_declenche_interets` |
| Flux `PROPOSED â†’ CONSENTED â†’ AUTHORIZED`, refus tracÃ© (REFUSER) bloquant, archivage rÃ©versible | IMPLEMENTED | `descend_refus_trace`, `descend_archive_restore` |
| Journal (`DESCENDANCE_*`) + souvenir mÃ©moire famille `relations`, traÃ§abilitÃ© de la filiation | IMPLEMENTED | `descend_journal_trace` |
| SynthÃ¨se Conscience : `Relations.json` (bloc `DESCENDANCE`), `Moi.json`, `Limites.json` (crÃ©ation non implÃ©mentÃ©e, honnÃªtement signalÃ©e) | IMPLEMENTED | `descend_conscience_integree` |
| CLI `AIgg.cmd descendance [list|propose|consent|authorize|refuse|check|compat|log|rm|restore|status]` + aide FR ; API `/api/descendance` (GET/POST) | IMPLEMENTED | CLI testÃ© + smoke |
| Tests autonettoyants (fichier temp, mÃ©moire `relations` et journal restaurÃ©s, dÃ©pÃ´t jamais modifiÃ©) | IMPLEMENTED | `descend_aucune_pollution_depot` |

## Cognition â€” orchestration cognitive (SOCLE v0.5.0, testÃ©e rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/cognition.js` : l'orchestrateur cognitif du Prompt MaÃ®tre est du **code** â€” cycle rÃ©el : rappel mÃ©moire â†’ recherche bibliothÃ¨que â†’ diagnostic du manque â†’ plan + outils candidats (COMPRENDREâ†’â€¦â†’APPRENDRE), **sans jamais exÃ©cuter d'outil** | IMPLEMENTED | `cognit_*` (section 36) |
| **11 Ã©tats cognitifs** (`STATES`) : JE_SAIS, JE_NE_SAIS_PAS, JE_NE_COMPRENDS_PAS, JE_PEUX_CHERCHER, JE_CHERCHE, J_AI_TROUVE, JE_DOIS_VERIFIER, J_AI_BESOIN_DE_PRECISION, JE_DOIS_DEMANDER_AU_TUTEUR, JE_N_AI_PAS_OUTIL_PERMISSION, PAS_DE_REPONSE_FIABLE | IMPLEMENTED | `cognit_inconnu_strategie` |
| Rappel **mÃ©moire** honnÃªte (jamais une invention : score â‰¥ 0,6 et â‰¥ 2 mots communs) â†’ `JE_SAIS` + source `MEMORY` (confiance) | IMPLEMENTED | `cognit_memoire_je_sais` |
| Rappel **bibliothÃ¨que** L2 (correspondance exacte ou score â‰¥ `MIN_LIBRARY_SCORE=12`) â†’ `J_AI_TROUVE` + provenance `LIBRARY` (titre, bibliothÃ¨que, extrait) | IMPLEMENTED | `cognit_biblio_j_ai_trouve` |
| **Manque diagnostiquÃ©** et journalisÃ© (objet `missing`, `plan`) â†’ `JE_PEUX_CHERCHER` (outil utilisable) ou `JE_N_AI_PAS_OUTIL_PERMISSION` ; stratÃ©gie rÃ©elle (`canSearch`, `bestTool`, `explanation`) | IMPLEMENTED | `cognit_inconnu_strategie` |
| **Outils candidats** cataloguÃ©s via `toolkit.discoverAll` : interactions du manifeste + `utilisable = installÃ© ET autorisÃ©` â€” **CAPACITÃ‰ â‰  PERMISSION, jamais contournÃ©** | IMPLEMENTED | `cognit_aucun_outil_execute` |
| **AUCUNE exÃ©cution d'outil** en socle (plan prÃ©parÃ©) ; la recherche Web/IA externe rÃ©elle arrive en **v0.5.1** (perception outils) puis v0.5.2 (apprentissage & IA) | IMPLEMENTED | `cognit_aucun_outil_execute`, `cognit_activite_reelle` |
| ActivitÃ©s **rÃ©elles** uniquement (opÃ©rations effectivement rÃ©alisÃ©es) : `RAPPEL_MEMOIRE`, `RAPPEL_BIBLIOTHEQUE` | IMPLEMENTED | `cognit_activite_reelle` |
| Besoin de **prÃ©cision** via `needs.js` (type `QUESTION`, jamais un devin) pour les apprentissages ouverts (Â« apprends-moi X Â») | IMPLEMENTED | `cognit_tuteur_question` |
| RÃ©ponse du tuteur â†’ **mÃ©morisation** + besoin `FULFILLED` (cycle APPRENDRE) | IMPLEMENTED | `cognit_tuteur_reponse` |
| Journalisation lÃ©gÃ¨re `COGNITION_MEMORY_HIT` / `_LIBRARY_HIT` / `_AMBIGUOUS` / `_UNKNOWN` (WORK_ID, question, source, score, plan) | IMPLEMENTED | `cognit_journal_trace` |
| Conversation honnÃªte : Â« Je ne sais pas encore rÃ©pondre Ã  cela (â€¦) â€” Ã‰tat cognitif : â€¦ Â» + stratÃ©gie ; `/api/talk` et `talk` CLI exposent le rÃ©sultat cognitif (`cognition.*`) | IMPLEMENTED | `cognit_inconnu_strategie` + `conversation_honnete` |
| CLI `AIgg.cmd cognition "question"` + aide FR (Ã©tat, activitÃ©s rÃ©elles, sources, plan, outils candidats) | IMPLEMENTED | CLI testÃ© rÃ©ellement |
| Tests autonettoyants (bibliothÃ¨que temp, mÃ©moire, besoins, conversation, Ã©tat et journal restaurÃ©s, dÃ©pÃ´t jamais modifiÃ©) | IMPLEMENTED | `cognit_*` (Â§36) |

## Conscience â€” couche de synthÃ¨se fonctionnelle (v0.4.0, testÃ© rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/conscience.js` : couche de synthÃ¨se (JAMAIS 2e base â€” chaque section cite ses `SOURCES`) | IMPLEMENTED | `conscience_meta_synthese` |
| Dossier gÃ©nÃ©rÃ© `AIgg/Conscience/` (Identite, Moi, Etats, Perceptions, Memoire, Besoins, Intentions, Objectifs, CentresInterets, Emotions, Relations, Competences, Valeurs, Limites, Experiences, Reflexion, Histoire, README, JournalConscient.ndjson) | IMPLEMENTED | `conscience_fichiers_presents` |
| `Moi.json` : QUI SUIS-JE, IDENTIFIANT, TUTEUR, OÃ™, Ã‰TAT, JE SAIS, JE PEUX, JE NE PEUX PAS, LIMITES, J'APPRENDS, BESOINS/INTÃ‰RÃŠTS, RELATIONS, OUTILS, RÃ‰CENT, APPRIS, PROCHAINE ACTION AUTORISÃ‰E | IMPLEMENTED | `conscience_moi_criteres` |
| IdentitÃ© cohÃ©rente (jamais inventÃ©e) | IMPLEMENTED | `conscience_identite_coherente` |
| Prochaine action calculÃ©e = capacitÃ© + permission (jamais une initiative autonome) | IMPLEMENTED | `conscience_prochaine_action` |
| Relations : tuteur depuis `core/identity.json` ; modÃ¨le natif (v0.4.1) annoncÃ© honnÃªtement | IMPLEMENTED | `conscience_relations_tuteur` |
| `JournalConscient.ndjson` append-only, clÃ© unique | IMPLEMENTED | `conscience_journal_append` |
| CapabilitÃ©s listÃ©es = capabilities rÃ©elles ; Ã©tat rÃ©el | IMPLEMENTED | `conscience_capacites_reelles`, `conscience_etat_reel` |
| CLI `AIgg.cmd conscience [sync|moi|files]` + aide FR ; API `/api/conscience`, `/api/conscience/sync` | IMPLEMENTED | CLI testÃ© + smoke |
| Dossier `Conscience/` **privÃ©** (gÃ©nÃ©rÃ©, ignorÃ© par Git) | IMPLEMENTED | `.gitignore` (`Conscience/`) |

## Coffre-fort local (vault) â€” infrastructure sÃ©curitÃ© (testÃ© rÃ©ellement)

| Composant | Statut | Preuve |
|---|---|---|
| Chiffrement AES-256-GCM (clÃ© dÃ©rivÃ©e scrypt, sel/IV alÃ©atoires) | IMPLEMENTED | src/vault.js + TEST_VAULT |
| `vault/vault.json` **hors Git** (jamais publiÃ©, mÃªme chiffrÃ©) | IMPLEMENTED | `.gitignore` (`vault/`) |
| Init / put / get / list / rm / wipe / status | IMPLEMENTED | `AIgg.cmd vault` (CLI testÃ©e) |
| Mot de passe jamais stockÃ© (--password= ou env AIGG_VAULT_PASSWORD) | IMPLEMENTED | src/vault.js (aucun champ mdp) |
| Mauvais mot de passe refusÃ©, secret jamais en clair dans le fichier | IMPLEMENTED | vault_mauvais_mdp_bloque, vault_secret_jamais_clair |
| Coffre autonettoyant pour les tests (tmp, jamais dans Git) | IMPLEMENTED | vault_test_autonettoyant |
| RÃ©cupÃ©ration de mot de passe perdu | BLOCKED | illisible sans mot de passe â€” par conception (zÃ©ro rÃ©cupÃ©rateur) |

## Connecteur Gmail (P2) â€” testÃ© rÃ©ellement (API simulÃ©e locale, aucun secret rÃ©el)

| Composant | Statut | Preuve |
|---|---|---|
| Outil `gmail` (manifeste + moteur natif) | IMPLEMENTED | `tools/gmail/` (manifest.json + gmail.js) |
| API Gmail v1 â€” list (mÃ©tadonnÃ©es) / read / send, 100 % natif | IMPLEMENTED | TEST_OUTIL_GMAIL (serveur HTTP local simulant l'API, token Bearer vÃ©rifiÃ©) |
| Moindre privilÃ¨ge : scope minimal `gmail.metadata`, refus sans scope | IMPLEMENTED | gmail_scope_minimal â€” `gmail.list` exige le scope accordÃ© |
| Token + scopes dans le coffre local (vault), jamais dans Git | IMPLEMENTED | `vault` (clÃ©s `gmail.access_token`, `gmail.scopes`) â€” .gitignore `tools/gmail/config.json`, `vault/` |
| CLI `gmail status|list|read|send` + aide FR | IMPLEMENTED | `AIgg.cmd gmail` (testÃ© rÃ©ellement) |
| Envoi tracÃ© dans `outbox/` (SENT/FAILED) | IMPLEMENTED | gmail.js `logRecord` (mÃªme outbox que l'outil email) |
| BloquÃ© par dÃ©faut (permission + capabilitÃ©) | IMPLEMENTED | permissions.js (`gmail` dans DEFAULT_TOOLS_BLOCKED) + contrat |
| AccÃ¨s rÃ©el Ã  Gmail (OAuth2 Google) | PARTIAL | nÃ©cessite identifiants OAuth2 du tuteur rangÃ©s dans le coffre â€” moteur testÃ© contre API simulÃ©e locale |

## PARTIAL (existe, mais limitÃ© / Ã  renforcer)

| Composant | Ã‰tat rÃ©el |
|---|---|
| Communication e-mail | IMPLEMENTED (envoi SMTP natif, outil `email`) â€” rÃ©ception IMAP non faite |
| AccÃ¨s Gmail | PARTIAL â€” moteur de connecteur testÃ© (API simulÃ©e) ; OAuth2 rÃ©el en attente d'identifiants |
| Recherche Web multi-sources | PARTIAL â€” DuckDuckGo sans clÃ© implÃ©mentÃ© ; Gmail/Drive/Maps non |
| Web `web.search` | PARTIAL â€” nÃ©cessite rÃ©seau ; testÃ©e rÃ©ellement (3 rÃ©sultats) le 2026-09-05 |
| Synchronisation des demandes aprÃ¨s redÃ©marrage | IMPLEMENTED (core/needs.json) â€” fil conversation limitÃ© Ã  la session |

## PLANNED (prÃ©vu, non fait â€” on ne prÃ©tend pas le contraire)

- RÃ©ception e-mail (IMAP) : **non faite** (PHASE 4 en cours â€” l'envoi SMTP est fait).
- Connecteurs Google restants : Drive / Docs / Sheets (PHASE 4-5) â€” identifiants OAuth Ã  ranger dans le coffre-fort `vault`. Gmail : moteur fait, OAuth2 rÃ©el en attente.
- IA externe comme OUTIL (portÃ© par Connecteurs IA : outil, jamais le cerveau). L'orchestrateur cognitif peut la **prÃ©parer** (v0.5.0) puis l'**exÃ©cuter** en **v0.5.1** (perception outils : Web multi-sources lu et comparÃ©) â€” jamais une vÃ©ritÃ© automatique.
- Apprentissage bornÃ© de l'orchestrateur (v0.5.2 â€” apprentissage & IA : apprendre des Ã©checs et des succÃ¨s, jamais de badge ni de permission automatique).
- Voix (synthÃ¨se + reconnaissance), vision (camÃ©ra) : sens/outils futurs.
- HÃ©bergement Web et publication contrÃ´lÃ©e (PHASE 6-7).
- Acquisition autonome d'outils sous contrÃ´le du tuteur (PHASE 8).
- `MOURIR` (fin d'instance) : capacitÃ© prÃ©vue, non acquise (procÃ©dure explicite requise).

## BLOCKED (bloquÃ© â€” obstacle rÃ©el identifiÃ©)

| Ã‰lÃ©ment | Cause | Solution |
|---|---|---|
| ExÃ©cution de scripts `.ps1` sur cette machine | Politique d'exÃ©cution PowerShell `Restricted` | Utiliser `AIgg.cmd` (l'`AIgg.ps1` affiche ce message) |
| Recherche Web hors-ligne | Aucun rÃ©seau | Le test passe en `BLOCKED` (jamais `PASS` mensonger) |
| Publication GitHub | Commande utilisateur : d'abord intÃ©grer le Prompt MaÃ®tre | EffectuÃ© le 2026-09-05 (repo public + release v0.1.0) |

## DÃ©viations documentÃ©es par rapport Ã  l'arborescence cible (Â§27)

- `start/` â†’ remplacÃ© par `AIgg.cmd` / `AIgg.ps1` Ã  la racine de l'incubateur
  (dÃ©marrage Â« un clic Â», plus simple).
- `config/` â†’ les rÃ©glages privÃ©s (apparence, besoins) vivent dans `core/`
  (dÃ©jÃ  exclu du dÃ©pÃ´t public). Rien n'est perdu : mÃªmes donnÃ©es, autre dossier.
- `web/` â†’ les fichiers sont sous `web/public/` (index.html, style.css, app.js),
  Ã©quivalent direct de `web/` cible.

## PROCHAIN TRAVAIL (organisÃ© le 2026-09-06 â€” v0.2.0 : recherche N2 + P9/P10/P11)

PrioritÃ© d'ordre dÃ©croissant ; chaque item garde un critÃ¨re observable.

### MaÃ®trise de la pile web (tuteur)
- [ ] Consulter la console web http://127.0.0.1:8070/ : onglets Conversation,
      Demandes, Apparence, BibliothÃ¨ques (crÃ©er une bibliothÃ¨que privÃ©e, ajouter
      une source + connaissance + compÃ©tence, vÃ©rifier la recherche) â€” critÃ¨re :
      aucune erreur console, donnÃ©es visibles aprÃ¨s rechargement.
- [x] **DÃ©cision prise le 2026-09-06 (v0.3.0)** : prochaine fonctionnalitÃ© =
      **communication externe e-mail (PHASE 4)** â€” premier outil externe :
      `email` (envoi SMTP natif), `outbox/` pour la traÃ§abilitÃ©, test rÃ©el via
      serveur SMTP local. RÃ©ception (IMAP) et connecteurs Gmail/Drive = suite.

### AmÃ©liorations techniques courtes (liste d'attente)
- [x] `tools/notebook/notebook.js` : `runTest()` et le test `NOTEBOOK RÃ‰EL`
      crÃ©aient des entrÃ©es persistantes (`test_suite`, `test_outil_notebook`) â†’
      **rÃ©glÃ© en v0.1.3** : `runTest()` autonettoyant, test Â§12 supprime son
      entrÃ©e et vÃ©rifie `notebook.remove(id)`.
- [x] `tests/run-tests.js` (section 4 MÃ‰MOIRE) : l'entrÃ©e `{question:'test',
      answer:'ok'}` n'Ã©tait pas supprimÃ©e Ã  la fin â†’ **rÃ©glÃ©** (le test supprime
      dÃ©jÃ  son entrÃ©e ; 0 rÃ©sidu constatÃ© le 2026-09-06).
- [x] Observer si le mode `library` CLI a besoin d'une aide en franÃ§ais plus
      dÃ©taillÃ©e (`AIgg.cmd library` sans argument l'affiche dÃ©jÃ ).
      â†’ **fait en v0.2.0 (P10)** : aide franÃ§aise complÃ¨te, calquÃ©e sur le code rÃ©el.

### Ã‰volutions prÃ©vues par les cahiers (non commencÃ©es â€” ne pas prÃ©tendre le contraire)
- [x] Recherche bibliothÃ¨que **niveau 2** : import/export rÃ©el multi-fournisseur,
      calcul de similaritÃ©, multilingue (Â§18 et Â§24 du cahier bibliothÃ¨que).
      â†’ **fait en v0.2.0** : `searchL2` (normalisation, classement expliquÃ©,
      filtres, FR/EN/ES), import rÃ©el CLI `--file` ; relecture conjointe
      N2 + Ã©tat/documents selon Â« Documenter le rÃ©el Â» en cours de finalisation.
- [x] **Communication externe e-mail (PHASE 4)** â€” **fait en v0.3.0** :
      outil `email` (envoi SMTP natif, test rÃ©el local), `outbox/` privÃ©,
      CLI + API + capabilitÃ© COMMUNICATION. RÃ©ception IMAP et connecteurs
      Gmail/Drive = suite (non faites).
- [x] **Connecteur Gmail (P2)** â€” **fait en v0.3.2** : outil `gmail`
      (moteur natif testÃ© contre API simulÃ©e locale, token + scopes dans le
      coffre `vault`, scope minimal `gmail.metadata`, envoi tracÃ© dans
      `outbox/`). OAuth2 rÃ©el en attente d'identifiants du tuteur.
- [x] **Apparence avancÃ©e (APP)** â€” **fait en v0.3.3** : Ã©tats visuels
      complets (couleurs `STATE_COLORS` pour les 8 Ã©tats), avatar vivant
      (variantes par Ã©tat + anneau d'Ã©tat), CLI `appearance`
      (status/set/reset/suggest/apply/avatar), console web enrichie.
- [ ] Connecteurs Drive / Docs / Sheets (PHASE 4-5).
- [ ] IA externe comme OUTIL (portÃ© par Connecteurs IA : outil, jamais le cerveau).
- [ ] Voix (synthÃ¨se + reconnaissance), vision (camÃ©ra) ; hÃ©bergement Web et
      publication contrÃ´lÃ©e (PHASE 6-7) ; `MOURIR` (procÃ©dure explicite requise).
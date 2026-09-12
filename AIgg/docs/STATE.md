# AIgg — État du projet (STATE.md)

> Document de **réalité actuelle**, mis à jour à chaque échange de travail.
> Statuts : `IMPLEMENTED` (testé) / `PARTIAL` (partiel) / `PLANNED` (prévu non
> fait) / `BLOCKED` (bloqué). Une fonction n'est jamais déclarée terminée sans
> test réel (PASS).

Dernière mise à jour : 2026-09-12 · CORE_VERSION 0.4.3 · Suite de tests : 268 PASS / 0 FAIL.

## Socle N0 — grande suite (testé réellement)

| Composant | Statut | Preuve |
|---|---|---|
| Naissance (nom, tuteur, acte) | IMPLEMENTED | TEST_NAISSANCE / TEST_IDENTITE |
| Identité persistante (AIgg_ID immuable) | IMPLEMENTED | TEST_IDENTITE |
| Tuteur (création, permissions, sauvegarde) | IMPLEMENTED | TEST_TUTEUR, CLI + web |
| Mémoire 4 familles + correction | IMPLEMENTED | TEST_MEMOIRE |
| Journal NDJSON (sans clé dupliquée) | IMPLEMENTED | TEST_JOURNAL |
| Capacités (acquis / non acquis) | IMPLEMENTED | TEST_IDENTITE + registres |
| Permissions (moindre privilège, tout bloqué) | IMPLEMENTED | TEST_PERMISSIONS |
| Sens (DISPONIBLE/AUTORISE/ACTIF) — détection réelle | IMPLEMENTED | TEST_SENS |
| Veille / réveil / âge | IMPLEMENTED | TEST_IDENTITE + CLI |
| 8 états (BORN→STOPPED), transition sécurisée | IMPLEMENTED | TEST_IDENTITE (etats_8) |
| Sauvegarde / restauration (manifeste) | IMPLEMENTED | TEST_SAUVEGARDE / TEST_RESTAURATION |
| Interface web (console tuteur) | IMPLEMENTED | TEST_INTERFACE + smoke HTTP |
| Registre d'outils + Contrat Commun | IMPLEMENTED | TEST_PERMISSIONS, TEST_CONTRAT |
| Outils web / notebook / avatar | IMPLEMENTED | TEST_OUTILS / TEST_RECHERCHE |

## Corpus du Prompt Maître — 2e descente (testé réellement)

| Composant | Statut | Preuve |
|---|---|---|
| Conversation (zone + moteur honnête) | IMPLEMENTED | TEST_COMMUNICATION + smoke `/api/talk` |
| Cycle d'apprentissage « apprends que X → confirmation » | IMPLEMENTED | TEST_COMMUNICATION |
| Registre de besoins « demander au tuteur » | IMPLEMENTED | TEST_BESOINS + smoke `/api/needs` |
| Apparence contrôlée (proposer→valider→appliquer→journaliser) | IMPLEMENTED | TEST_APPARENCE + smoke |
| Le HTML = corps visible (variables CSS pilotées) | IMPLEMENTED | smoke (style.css / --ap-*) |
| Migration / copie portable (continuité AIgg_ID) | IMPLEMENTED | TEST_MIGRATION |
| Gestion d'erreurs PROBLÈME/CAUSE/SOLUTION/ÉTAT | IMPLEMENTED | CLI `AIgg.js` (web-read, migrate, catch) |
| Tests du corpus (13 tests nommés) | IMPLEMENTED | tests/run-tests.js, 122 vérifications |
| Licence MIT | IMPLEMENTED | LICENSE (racine) + package.json |

## Apparence avancée (v0.3.3 — chantier APP, testé réellement)

| Composant | Statut | Preuve |
|---|---|---|
| États visuels complets : `STATE_COLORS` (8 états) | IMPLEMENTED | `apparence_state_colors` |
| Couleur d'état résolue (`stateColor`, fallback) | IMPLEMENTED | `apparence_state_color` |
| Schéma rétro-compatible (`mergeSchema` complète les fichiers v1) | IMPLEMENTED | `apparence_merge_retrocompat` |
| Reset de l'apparence (journalisé `APPEARANCE_RESET`) | IMPLEMENTED | `apparence_reset`, `apparence_reset_journalise` |
| Avatar vivant : variantes par état (yeux/bouche/anneau couleur) | IMPLEMENTED | `avatar_etats_variantes`, `avatar_data_state`, `avatar_anneau_couleur` |
| CLI `appearance` (status/set/reset/suggest/apply/drop/avatar) | IMPLEMENTED | `AIgg.cmd appearance` (testé) |
| Badge coloré par état + sélecteurs d'état dans la console web | IMPLEMENTED | web/public (app.js, index.html, style.css) |
| Avatar régénéré après sleep/wake (web) | IMPLEMENTED | src/server.js (/api/sleep, /api/wake) |

## Bibliothèques de spécialisation — cahier appliqué (testé réellement)

| Composant | Statut | Preuve |
|---|---|---|
| Moteur `src/library.js` (100 % natif) | IMPLEMENTED | TEST_LIBRARIES |
| Cycle de vie create / list / update / remove (→ `_trash`) | IMPLEMENTED | TEST_LIBRARIES + CLI + API |
| Source ≠ Document ≠ Connaissance ≠ Compétence | IMPLEMENTED | TEST_LIBRARIES (provenance, NEVER_EXECUTED) |
| Document / code jamais exécuté | IMPLEMENTED | TEST_LIBRARIES (`document_jamais_execute`) |
| Compétence jamais `MASTERED` automatiquement | IMPLEMENTED | TEST_LIBRARIES (`competence_jamais_mastered_auto`) |
| Contradictions signalées (OPEN → RESOLVED) | IMPLEMENTED | TEST_LIBRARIES |
| Annotations du tuteur | IMPLEMENTED | TEST_LIBRARIES |
| Journal local par bibliothèque | IMPLEMENTED | TEST_LIBRARIES |
| Recherche niveaux 1 et 2 (multilingue FR/EN/ES, normalisation, classement expliqué) | IMPLEMENTED | TEST_LIBRARIES (recherche_n2_*) |
| Export / import `aigg-library` v1 (analyse pour confirmer) | IMPLEMENTED | TEST_LIBRARIES |
| Import via CLI (`import --file=… [--confirm]`) | IMPLEMENTED | CLI testé (aperçu par défaut) |
| Privée par défaut (hors dépôt public) | IMPLEMENTED | `.gitignore` (libraries/* sauf examples/) |
| Exemples publics sans savoir inventé | IMPLEMENTED | TEST_LIBRARIES (`exemples_sans_savoir_invente`) |
| API HTTP `/api/libraries*` + onglet web « Bibliothèques » | IMPLEMENTED | smoke HTTP réel (create/source/knowledge/search/export/delete) |
| CLI `AIgg.cmd library …` + aide française | IMPLEMENTED | testé réellement (health/list/search/create/remove/import) |

## Petits travaux P9-P11 (pack du tuteur — testé réellement)

| Composant | Statut | Preuve |
|---|---|---|
| P9 — Sondes sens réelles (Windows WINMM/WMI, Linux ALSA/V4L2) | IMPLEMENTED | TEST_SENS (sens_sonde_winmm_honnete, sens_bloque_unknown) |
| P10 — Aide CLI `library` en français reflétant le code réel | IMPLEMENTED | `AIgg.cmd library`, LIBRARIES.md, STATE/CHANGELOG |
| P11 — `docs-check` : audit docs/versions/compteurs, lecture seule | IMPLEMENTED | TEST_DOCS_CHECK (docs_check_ok, docs_check_detecte_divergence) |

## Communication externe e-mail — PHASE 4 (testé réellement)

| Composant | Statut | Preuve |
|---|---|---|
| Outil `email` (manifeste + moteur) | IMPLEMENTED | `tools/email/` (manifest.json + email.js) |
| Envoi SMTP natif — RFC 5321 (EHLO/MAIL/RCPT/DATA/QUIT) | IMPLEMENTED | TEST_OUTIL_EMAIL (serveur SMTP local réel, message vérifié à la réception) |
| Capabilité `COMMUNICATION` (acquise par `install email`) | IMPLEMENTED | `toolkits` — capabilities.json |
| Traçabilité `outbox/` (SENT/FAILED, private) | IMPLEMENTED | `email log` / `/api/email/log` |
| CLI `email send|status|log` + aide FR | IMPLEMENTED | `AIgg.cmd email` (testé) |
| API `/api/email/send` (Contrat Commun) | IMPLEMENTED | serveur (route, smoke HTTP) |
| Bloqué par défaut + config.json hors Git | IMPLEMENTED | permissions.js (DEFAULT_TOOLS_BLOCKED), .gitignore |
| Réception IMAP, AUTH SMTP, STARTTLS | PLANNED | documenté « non fait » (honnêteté) |

## Berceau — conscience de la taille et de l'espace (v0.3.12, testé réellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/berceau.js` : mesure réelle de soi (`measureSelf`, mondes exclus : `backups/`, `node_modules/`, `.git/`) | IMPLEMENTED | `berceau_mesure` |
| Quota alloué par le tuteur, 1 Go par défaut (`core/berceau.json`, privé) | IMPLEMENTED | `berceau_alloc_defaut` |
| Espace libre réel du disque (`fs.statfs`, sonde native) | IMPLEMENTED | `berceau_libre` (PASS réel) / `BLOCKED` si sonde indisponible |
| Statut `tight` (seuil 85 % du quota, ou disque trop plein) | IMPLEMENTED | `berceau_statut`, `berceau_demande_unique` |
| Demande honnête : besoin `AGRANDIR` unique « je suis à l'étroit … agrandis ou migre » | IMPLEMENTED | `berceau_demande_unique` (créé 1 seule fois) |
| Jamais d'action automatique : le tuteur agit (set / migrate) | IMPLEMENTED | conception + migration copie `core/berceau.json` |
| Conversation : « quelle est ta taille ? / ton berceau ? » → `TAILLE` réel | IMPLEMENTED | `berceau_conversation` |
| Proactivité au réveil : besoin `AGRANDIR` rappelé (comme QUESTION/CONFIRMATION) | IMPLEMENTED | `berceau_proactif` |
| CLI `berceau [set <taille> | check]` + aide FR, API `/api/berceau` | IMPLEMENTED | `AIgg.cmd berceau` (testé) |

## Habitations et Santé du système (v0.3.13, testé réellement)

| Composant | Statut | Preuve |
|---|---|---|
| Niveaux d'espace (`berceau.level()` depuis le quota réel, §1 du plan tuteur) : Graine 100 Mo → Berceau 1 Go → Studio 2 Go → Appartement 5 Go → Maison 10 Go → Atelier 20 Go → Laboratoire 50 Go → Centre 100 Go → Écosystème 250 Go+ | IMPLEMENTED | `habitation_seuils` |
| Le quota réellement alloué nomme l'habitation (jamais inventée) | IMPLEMENTED | `habitation_quota_nomme`, `habitation_graine` |
| Honnêteté : équipement listé = PRIÈRE (plan), plus d'espace ≠ plus intelligent | IMPLEMENTED | `habitation_honnete` |
| Conversation « quelle habitation / quel niveau / où habites-tu » → `LEVEL` réel | IMPLEMENTED | `habitation_conversation` |
| **Les seuils d'habitation sont PRÉDICTIFS, jamais une obligation : AIgg reste et continue d'acquérir badges/compétences/outils tant qu'il a de la place — seul l'étroitesse (≥ 85 %) déclenche la demande `AGRANDIR`** | IMPLEMENTED | `habitation_predictif_non_obligatoire`, `habitation_predictif_message` |
| CLI `berceau level` + statut enrichi (`levelName`, `levelIndex`) + aide FR | IMPLEMENTED | `AIgg.cmd berceau level` (testé) |
| Vue santé consolidée `src/health.js` : les 14 points du plan (§18), tous mesurés réellement | IMPLEMENTED | `sante_14_points`, `sante_inventaire_reel`, `sante_erreurs_shape` |
| Espace réel : total/utilisé/libre cohérents avec le berceau | IMPLEMENTED | `sante_espace_coherent` |
| Inventaire réel : bibliothèques et outils comptés depuis le disque, jamais fantômes | IMPLEMENTED | `sante_inventaire_reel` |
| Compétences : capacités (core) + compétences de bibliothèque (acquises/en cours/bloquées) | IMPLEMENTED | `sante_human_seuils` |
| CLI `AIgg.cmd health`, API `/api/health`, champ `health` dans `/api/state`, onglet web « Santé » | IMPLEMENTED | `AIgg.cmd health` (testé) + smoke web |

## Relations — fonction native (v0.4.1, testée réellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/relations.js` : source `relations/relations.ndjson` (NDJSON privé, ignoré par Git) | IMPLEMENTED | `relations_source_ndjson` |
| Catégories du Prompt Maître : Tuteur, TuteurIgg, AmiHumain, AmiIgg, Parent, Autres | IMPLEMENTED | `relations_categories` |
| Confiance **explicite** : toute relation démarre à 0 (jamais implicite) | IMPLEMENTED | `relations_add_confiance_zero` |
| Règle centrale : une relation entre tuteurs ne crée **jamais automatiquement** une confiance entre AIgg | IMPLEMENTED | `relations_tuteur_entier_aucune_confiance` |
| Confiance **progressive** (0→3) et **traçable** (`TRANSACTIONS`, `TRUST:N`) | IMPLEMENTED | `relations_trust_progressif_trace` |
| Plafond de confiance (jamais au-delà de 3) | IMPLEMENTED | `relations_trust_plafond` |
| Parent = filiation structurelle (jamais propriété ; identité séparée, aucun héritage de secrets) | IMPLEMENTED | `relations_parent_filiation` |
| Trace consultable (`relations log <ID>`) | IMPLEMENTED | `relations_log_transactions` |
| Archivage **réversible** et tracé (ARCHIVE/RESTORE) | IMPLEMENTED | `relations_archive_restaure` |
| Catégorie inconnue refusée (aucune invention) | IMPLEMENTED | `relations_categorie_invalide_refus` |
| Synthèse Conscience : `Conscience/Relations.json` cite la source native + tuteur ; `Moi.json` RELATIONS mis à jour | IMPLEMENTED | `relations_conscience_integree` + CLI testé |
| Tests autonettoyants (fichier temp, mémoire et journal restaurés, dépôt jamais modifié) | IMPLEMENTED | `relations_aucune_pollution_depot` |
| CLI `AIgg.cmd relations [list|add|trust|log|rm|restore]` + aide FR ; API `/api/relations` (GET/POST) | IMPLEMENTED | CLI testé + smoke |

## Intérêts — priorités internes + centres d'intérêt natifs (v0.4.2, testée réellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/interests.js` : source `interests/interests.ndjson` (NDJSON privé, ignoré par Git) | IMPLEMENTED | `interests_source_ndjson` |
| 7 priorités internes (`PRIORITES`) : APPRENDRE, COMPRENDRE, INTEGRITE, EXPLORER, COMMUNIQUER, COMPETENCES, OBJECTIFS (CODE/LABEL/NOTE) | IMPLEMENTED | `interests_priorites` |
| Priorité inconnue refusée (aucune invention) | IMPLEMENTED | `interests_priorite_inconnue_refus` |
| Intensité **explicite, progressive, traçable** (0 non exprimé → 1 déclaré → 2 approfondi → 3 engagé) | IMPLEMENTED | `interests_intensite_progressive_trace` |
| Plafond d'intensité (jamais au-delà de 3) | IMPLEMENTED | `interests_intensite_plafond` |
| Règle d'or : jamais de contournement des permissions (capacité ≠ permission), aucune reproduction ni action externe automatique | IMPLEMENTED | `interests_jamais_contourne_permissions` |
| Transactions `CREATION`/`INTENSITE:N`/`ARCHIVE`/`RESTORE` + journal `INTEREST_*` + souvenir mémoire famille `knowledge` | IMPLEMENTED | `interests_log_transactions`, `interests_journal_trace` |
| Archivage **réversible** et tracé | IMPLEMENTED | `interests_archive_restaure` |
| Synthèse Conscience : `Conscience/Besoins.json` (`PRIORITES_INTERNES`), `CentresInterets.json`, Intentions, Objectifs, `Moi.json` citent la source native — jamais une 2e base | IMPLEMENTED | `interests_conscience_integree` |
| CLI `AIgg.cmd interests [list|add|intensify|log|rm|restore|priorities]` + aide FR ; API `/api/interests` (GET/POST) | IMPLEMENTED | CLI testé + smoke |
| Tests autonettoyants (fichier temp, `knowledge` et journal restaurés, dépôt jamais modifié) | IMPLEMENTED | `interests_aucune_pollution_depot` |

## Compétences / Badges — arbre natif (v0.4.3, testée réellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/badges.js` : l'arbre est du **code** ; source d'état `competences/badges.ndjson` (NDJSON privé, ignoré par Git) — jamais dupliqué | IMPLEMENTED | `badges_source_ndjson` |
| 8 branches du Prompt Maître (SOCLE, INFORMATIQUE, RAISONNEMENT, DÉVELOPPEMENT, RECHERCHE, COMMUNICATION-SENS, SOCIAL, OUTILS) — 84 compétences | IMPLEMENTED | `badges_arbre_branches` |
| Niveaux 0→6 (inconnu → transmettre/construire) + chaîne (Connaissance → Exercice → … → Badge → Capacité → Outil → Nouvelles compétences) | IMPLEMENTED | `badges_arbre_branches`, CLI `levels` |
| Rust structurant sans réécriture : Rust I → II → III → système/réseau → WebAssembly (prérequis) | IMPLEMENTED | `badges_rust_chain` |
| Règle d'or : **jamais de badge automatique** — preuve + validation explicite du tuteur requises | IMPLEMENTED | `badges_honor_preuve_exigee` |
| Honor explicite et tracé (`BADGE:N` + `TRANSACTIONS`, `BADGE_HONORED` journalisé, souvenir mémoire `procedures`) | IMPLEMENTED | `badges_honor_explicite_trace`, `badges_journal_trace` |
| Compétence non validée = niveau 0 INCONNU (aucun badge implicite) | IMPLEMENTED | `badges_aucun_honor_automatique` |
| **Prérequis non contournables** (honor refusé tant que `REQUIS` non satisfaits) | IMPLEMENTED | `badges_prerequis_refus` |
| Niveau décroissant refusé (un badge ne se retire pas par surprise) | IMPLEMENTED | `badges_niveau_decroissant_refus` |
| Proposition d'apprentissage (`propose`) tracée, jamais un badge | IMPLEMENTED | `badges_propose_trace` |
| `check()` : PRÊT / OBSTACLES calculés depuis les prérequis | IMPLEMENTED | `badges_check` |
| **Capacité ≠ permission** : honor ne modifie AUCUNE permission ni capacité | IMPLEMENTED | `badges_jamais_contourne_permissions` |
| Synthèse Conscience : `Conscience/Competences.json` (ARBRE_COMPETENCES, NIVEAUX, CHAINE, REGLE, BADGES) + `Moi.json` (`COMPETENCES_NATIVES`) citent la source native | IMPLEMENTED | `badges_conscience_integree` |
| CLI `AIgg.cmd competences [tree|branches|levels|check|propose|honor|log|status]` + aide FR ; API `/api/competences` (GET/POST) | IMPLEMENTED | CLI testé + smoke |
| Tests autonettoyants (fichier temp, mémoire `procedures` et journal restaurés, dépôt jamais modifié) | IMPLEMENTED | `badges_aucune_pollution_depot` |

## Conscience — couche de synthèse fonctionnelle (v0.4.0, testé réellement)

| Composant | Statut | Preuve |
|---|---|---|
| `src/conscience.js` : couche de synthèse (JAMAIS 2e base — chaque section cite ses `SOURCES`) | IMPLEMENTED | `conscience_meta_synthese` |
| Dossier généré `AIgg/Conscience/` (Identite, Moi, Etats, Perceptions, Memoire, Besoins, Intentions, Objectifs, CentresInterets, Emotions, Relations, Competences, Valeurs, Limites, Experiences, Reflexion, Histoire, README, JournalConscient.ndjson) | IMPLEMENTED | `conscience_fichiers_presents` |
| `Moi.json` : QUI SUIS-JE, IDENTIFIANT, TUTEUR, OÙ, ÉTAT, JE SAIS, JE PEUX, JE NE PEUX PAS, LIMITES, J'APPRENDS, BESOINS/INTÉRÊTS, RELATIONS, OUTILS, RÉCENT, APPRIS, PROCHAINE ACTION AUTORISÉE | IMPLEMENTED | `conscience_moi_criteres` |
| Identité cohérente (jamais inventée) | IMPLEMENTED | `conscience_identite_coherente` |
| Prochaine action calculée = capacité + permission (jamais une initiative autonome) | IMPLEMENTED | `conscience_prochaine_action` |
| Relations : tuteur depuis `core/identity.json` ; modèle natif (v0.4.1) annoncé honnêtement | IMPLEMENTED | `conscience_relations_tuteur` |
| `JournalConscient.ndjson` append-only, clé unique | IMPLEMENTED | `conscience_journal_append` |
| Capabilités listées = capabilities réelles ; état réel | IMPLEMENTED | `conscience_capacites_reelles`, `conscience_etat_reel` |
| CLI `AIgg.cmd conscience [sync|moi|files]` + aide FR ; API `/api/conscience`, `/api/conscience/sync` | IMPLEMENTED | CLI testé + smoke |
| Dossier `Conscience/` **privé** (généré, ignoré par Git) | IMPLEMENTED | `.gitignore` (`Conscience/`) |

## Coffre-fort local (vault) — infrastructure sécurité (testé réellement)

| Composant | Statut | Preuve |
|---|---|---|
| Chiffrement AES-256-GCM (clé dérivée scrypt, sel/IV aléatoires) | IMPLEMENTED | src/vault.js + TEST_VAULT |
| `vault/vault.json` **hors Git** (jamais publié, même chiffré) | IMPLEMENTED | `.gitignore` (`vault/`) |
| Init / put / get / list / rm / wipe / status | IMPLEMENTED | `AIgg.cmd vault` (CLI testée) |
| Mot de passe jamais stocké (--password= ou env AIGG_VAULT_PASSWORD) | IMPLEMENTED | src/vault.js (aucun champ mdp) |
| Mauvais mot de passe refusé, secret jamais en clair dans le fichier | IMPLEMENTED | vault_mauvais_mdp_bloque, vault_secret_jamais_clair |
| Coffre autonettoyant pour les tests (tmp, jamais dans Git) | IMPLEMENTED | vault_test_autonettoyant |
| Récupération de mot de passe perdu | BLOCKED | illisible sans mot de passe — par conception (zéro récupérateur) |

## Connecteur Gmail (P2) — testé réellement (API simulée locale, aucun secret réel)

| Composant | Statut | Preuve |
|---|---|---|
| Outil `gmail` (manifeste + moteur natif) | IMPLEMENTED | `tools/gmail/` (manifest.json + gmail.js) |
| API Gmail v1 — list (métadonnées) / read / send, 100 % natif | IMPLEMENTED | TEST_OUTIL_GMAIL (serveur HTTP local simulant l'API, token Bearer vérifié) |
| Moindre privilège : scope minimal `gmail.metadata`, refus sans scope | IMPLEMENTED | gmail_scope_minimal — `gmail.list` exige le scope accordé |
| Token + scopes dans le coffre local (vault), jamais dans Git | IMPLEMENTED | `vault` (clés `gmail.access_token`, `gmail.scopes`) — .gitignore `tools/gmail/config.json`, `vault/` |
| CLI `gmail status|list|read|send` + aide FR | IMPLEMENTED | `AIgg.cmd gmail` (testé réellement) |
| Envoi tracé dans `outbox/` (SENT/FAILED) | IMPLEMENTED | gmail.js `logRecord` (même outbox que l'outil email) |
| Bloqué par défaut (permission + capabilité) | IMPLEMENTED | permissions.js (`gmail` dans DEFAULT_TOOLS_BLOCKED) + contrat |
| Accès réel à Gmail (OAuth2 Google) | PARTIAL | nécessite identifiants OAuth2 du tuteur rangés dans le coffre — moteur testé contre API simulée locale |

## PARTIAL (existe, mais limité / à renforcer)

| Composant | État réel |
|---|---|
| Communication e-mail | IMPLEMENTED (envoi SMTP natif, outil `email`) — réception IMAP non faite |
| Accès Gmail | PARTIAL — moteur de connecteur testé (API simulée) ; OAuth2 réel en attente d'identifiants |
| Recherche Web multi-sources | PARTIAL — DuckDuckGo sans clé implémenté ; Gmail/Drive/Maps non |
| Web `web.search` | PARTIAL — nécessite réseau ; testée réellement (3 résultats) le 2026-09-05 |
| Synchronisation des demandes après redémarrage | IMPLEMENTED (core/needs.json) — fil conversation limité à la session |

## PLANNED (prévu, non fait — on ne prétend pas le contraire)

- Réception e-mail (IMAP) : **non faite** (PHASE 4 en cours — l'envoi SMTP est fait).
- Connecteurs Google restants : Drive / Docs / Sheets (PHASE 4-5) — identifiants OAuth à ranger dans le coffre-fort `vault`. Gmail : moteur fait, OAuth2 réel en attente.
- IA externe comme OUTIL (porté par Connecteurs IA : outil, jamais le cerveau).
- Voix (synthèse + reconnaissance), vision (caméra) : sens/outils futurs.
- Hébergement Web et publication contrôlée (PHASE 6-7).
- Acquisition autonome d'outils sous contrôle du tuteur (PHASE 8).
- `MOURIR` (fin d'instance) : capacité prévue, non acquise (procédure explicite requise).

## BLOCKED (bloqué — obstacle réel identifié)

| Élément | Cause | Solution |
|---|---|---|
| Exécution de scripts `.ps1` sur cette machine | Politique d'exécution PowerShell `Restricted` | Utiliser `AIgg.cmd` (l'`AIgg.ps1` affiche ce message) |
| Recherche Web hors-ligne | Aucun réseau | Le test passe en `BLOCKED` (jamais `PASS` mensonger) |
| Publication GitHub | Commande utilisateur : d'abord intégrer le Prompt Maître | Effectué le 2026-09-05 (repo public + release v0.1.0) |

## Déviations documentées par rapport à l'arborescence cible (§27)

- `start/` → remplacé par `AIgg.cmd` / `AIgg.ps1` à la racine de l'incubateur
  (démarrage « un clic », plus simple).
- `config/` → les réglages privés (apparence, besoins) vivent dans `core/`
  (déjà exclu du dépôt public). Rien n'est perdu : mêmes données, autre dossier.
- `web/` → les fichiers sont sous `web/public/` (index.html, style.css, app.js),
  équivalent direct de `web/` cible.

## PROCHAIN TRAVAIL (organisé le 2026-09-06 — v0.2.0 : recherche N2 + P9/P10/P11)

Priorité d'ordre décroissant ; chaque item garde un critère observable.

### Maîtrise de la pile web (tuteur)
- [ ] Consulter la console web http://127.0.0.1:8070/ : onglets Conversation,
      Demandes, Apparence, Bibliothèques (créer une bibliothèque privée, ajouter
      une source + connaissance + compétence, vérifier la recherche) — critère :
      aucune erreur console, données visibles après rechargement.
- [x] **Décision prise le 2026-09-06 (v0.3.0)** : prochaine fonctionnalité =
      **communication externe e-mail (PHASE 4)** — premier outil externe :
      `email` (envoi SMTP natif), `outbox/` pour la traçabilité, test réel via
      serveur SMTP local. Réception (IMAP) et connecteurs Gmail/Drive = suite.

### Améliorations techniques courtes (liste d'attente)
- [x] `tools/notebook/notebook.js` : `runTest()` et le test `NOTEBOOK RÉEL`
      créaient des entrées persistantes (`test_suite`, `test_outil_notebook`) →
      **réglé en v0.1.3** : `runTest()` autonettoyant, test §12 supprime son
      entrée et vérifie `notebook.remove(id)`.
- [x] `tests/run-tests.js` (section 4 MÉMOIRE) : l'entrée `{question:'test',
      answer:'ok'}` n'était pas supprimée à la fin → **réglé** (le test supprime
      déjà son entrée ; 0 résidu constaté le 2026-09-06).
- [x] Observer si le mode `library` CLI a besoin d'une aide en français plus
      détaillée (`AIgg.cmd library` sans argument l'affiche déjà).
      → **fait en v0.2.0 (P10)** : aide française complète, calquée sur le code réel.

### Évolutions prévues par les cahiers (non commencées — ne pas prétendre le contraire)
- [x] Recherche bibliothèque **niveau 2** : import/export réel multi-fournisseur,
      calcul de similarité, multilingue (§18 et §24 du cahier bibliothèque).
      → **fait en v0.2.0** : `searchL2` (normalisation, classement expliqué,
      filtres, FR/EN/ES), import réel CLI `--file` ; relecture conjointe
      N2 + état/documents selon « Documenter le réel » en cours de finalisation.
- [x] **Communication externe e-mail (PHASE 4)** — **fait en v0.3.0** :
      outil `email` (envoi SMTP natif, test réel local), `outbox/` privé,
      CLI + API + capabilité COMMUNICATION. Réception IMAP et connecteurs
      Gmail/Drive = suite (non faites).
- [x] **Connecteur Gmail (P2)** — **fait en v0.3.2** : outil `gmail`
      (moteur natif testé contre API simulée locale, token + scopes dans le
      coffre `vault`, scope minimal `gmail.metadata`, envoi tracé dans
      `outbox/`). OAuth2 réel en attente d'identifiants du tuteur.
- [x] **Apparence avancée (APP)** — **fait en v0.3.3** : états visuels
      complets (couleurs `STATE_COLORS` pour les 8 états), avatar vivant
      (variantes par état + anneau d'état), CLI `appearance`
      (status/set/reset/suggest/apply/avatar), console web enrichie.
- [ ] Connecteurs Drive / Docs / Sheets (PHASE 4-5).
- [ ] IA externe comme OUTIL (porté par Connecteurs IA : outil, jamais le cerveau).
- [ ] Voix (synthèse + reconnaissance), vision (caméra) ; hébergement Web et
      publication contrôlée (PHASE 6-7) ; `MOURIR` (procédure explicite requise).
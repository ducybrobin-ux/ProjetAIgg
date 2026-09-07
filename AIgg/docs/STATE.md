# AIgg — État du projet (STATE.md)

> Document de **réalité actuelle**, mis à jour à chaque échange de travail.
> Statuts : `IMPLEMENTED` (testé) / `PARTIAL` (partiel) / `PLANNED` (prévu non
> fait) / `BLOCKED` (bloqué). Une fonction n'est jamais déclarée terminée sans
> test réel (PASS).

Dernière mise à jour : 2026-09-06 · CORE_VERSION 0.3.0 · Suite de tests : 123 PASS / 0 FAIL.

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

## PARTIAL (existe, mais limité / à renforcer)

| Composant | État réel |
|---|---|
| Communication e-mail | IMPLEMENTED (envoi SMTP natif, outil `email`) — réception IMAP non faite |
| Recherche Web multi-sources | PARTIAL — DuckDuckGo sans clé implémenté ; Gmail/Drive/Maps non |
| Web `web.search` | PARTIAL — nécessite réseau ; testée réellement (3 résultats) le 2026-09-05 |
| Synchronisation des demandes après redémarrage | IMPLEMENTED (core/needs.json) — fil conversation limité à la session |

## PLANNED (prévu, non fait — on ne prétend pas le contraire)

- Réception e-mail (IMAP) : **non faite** (PHASE 4 en cours — l'envoi SMTP est fait).
- Connecteurs Gmail / Drive / Docs / Sheets (PHASE 4-5).
- IA externe comme OULE (porté par Connecteurs IA : outil, jamais le cerveau).
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
- [ ] Connecteurs Gmail / Drive / Docs / Sheets (PHASE 4-5).
- [ ] IA externe comme OULE (porté par Connecteurs IA : outil, jamais le cerveau).
- [ ] Voix (synthèse + reconnaissance), vision (caméra) ; hébergement Web et
      publication contrôlée (PHASE 6-7) ; `MOURIR` (procédure explicite requise).
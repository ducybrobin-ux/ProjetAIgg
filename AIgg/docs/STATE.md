# AIgg — État du projet (STATE.md)

> Document de **réalité actuelle**, mis à jour à chaque échange de travail.
> Statuts : `IMPLEMENTED` (testé) / `PARTIAL` (partiel) / `PLANNED` (prévu non
> fait) / `BLOCKED` (bloqué). Une fonction n'est jamais déclarée terminée sans
> test réel (PASS).

Dernière mise à jour : 2026-09-05 · CORE_VERSION 0.1.0 · Suite de tests : 68 PASS / 0 FAIL.

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
| Sens (DISPONIBLE/AUTORISE/ACTIF) | IMPLEMENTED | TEST_SENS |
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
| Tests du corpus (13 tests nommés) | IMPLEMENTED | tests/run-tests.js, 68 vérifications |
| Licence MIT | IMPLEMENTED | LICENSE (racine) + package.json |

## PARTIAL (existe, mais limité / à renforcer)

| Composant | État réel |
|---|---|
| Communication e-mail (Gmail…) | PARTIAL — architecture outil prête, aucun connecteur e-mail encore. |
| Recherche Web multi-sources | PARTIAL — DuckDuckGo sans clé implémenté ; Gmail/Drive/Maps non |
| Sens réels de la machine | PARTIAL — détection d'écran/clavier/fichiers/horloge/réseau ; micro/caméra/voix déclarés non disponibles |
| Web `web.search` | PARTIAL — nécessite réseau ; testée réellement (3 résultats) le 2026-09-05 |
| Synchronisation des demandes après redémarrage | IMPLEMENTED (core/needs.json) — fil conversation limité à la session |

## PLANNED (prévu, non fait — on ne prétend pas le contraire)

- Communication externe via e-mail (PHASE 4 du Prompt Maître).
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
| Publication GitHub | Commande utilisateur : d'abord intégrer le Prompt Maître | En cours d'exécution après intégration |

## Déviations documentées par rapport à l'arborescence cible (§27)

- `start/` → remplacé par `AIgg.cmd` / `AIgg.ps1` à la racine de l'incubateur
  (démarrage « un clic », plus simple).
- `config/` → les réglages privés (apparence, besoins) vivent dans `core/`
  (déjà exclu du dépôt public). Rien n'est perdu : mêmes données, autre dossier.
- `web/` → les fichiers sont sous `web/public/` (index.html, style.css, app.js),
  équivalent direct de `web/` cible.
# AIgg — État du projet (STATE.md)

> Document de **réalité actuelle**, mis à jour à chaque échange de travail.
> Statuts : `IMPLEMENTED` (testé) / `PARTIAL` (partiel) / `PLANNED` (prévu non
> fait) / `BLOCKED` (bloqué). Une fonction n'est jamais déclarée terminée sans
> test réel (PASS).

Dernière mise à jour : 2026-09-05 · CORE_VERSION 0.1.1 · Suite de tests : 93 PASS / 0 FAIL.

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
| Recherche niveau 1 (correspondance locale) | IMPLEMENTED | TEST_LIBRARIES |
| Export / import `aigg-library` v1 (analyse pour confirmer) | IMPLEMENTED | TEST_LIBRARIES |
| Privée par défaut (hors dépôt public) | IMPLEMENTED | `.gitignore` (libraries/* sauf examples/) |
| Exemples publics sans savoir inventé | IMPLEMENTED | TEST_LIBRARIES (`exemples_sans_savoir_invente`) |
| API HTTP `/api/libraries*` + onglet web « Bibliothèques » | IMPLEMENTED | smoke HTTP réel (create/source/knowledge/search/export/delete) |
| CLI `AIgg.cmd library …` | IMPLEMENTED | testé réellement (health/list/search) |

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
| Publication GitHub | Commande utilisateur : d'abord intégrer le Prompt Maître | Effectué le 2026-09-05 (repo public + release v0.1.0) |
| Recherche bibliothèque niveau 2 (similarité, multilingue, import/export réel) | Non implémenté | Prévu dans les évolutions du cahier (§18, §24) |

## Déviations documentées par rapport à l'arborescence cible (§27)

- `start/` → remplacé par `AIgg.cmd` / `AIgg.ps1` à la racine de l'incubateur
  (démarrage « un clic », plus simple).
- `config/` → les réglages privés (apparence, besoins) vivent dans `core/`
  (déjà exclu du dépôt public). Rien n'est perdu : mêmes données, autre dossier.
- `web/` → les fichiers sont sous `web/public/` (index.html, style.css, app.js),
  équivalent direct de `web/` cible.

## PROCHAIN TRAVAIL (organisé le 2026-09-05, fin de journée v0.1.1)

Priorité d'ordre décroissant ; chaque item garde un critère observable.

### Maîtrise de la pile web (tuteur)
- [ ] Consulter la console web http://127.0.0.1:8070/ : onglets Conversation,
      Demandes, Apparence, Bibliothèques (créer une bibliothèque privée, ajouter
      une source + connaissance + compétence, vérifier la recherche) — critère :
      aucune erreur console, données visibles après rechargement.
- [ ] Décider de la prochaine fonctionnalité (propositions ci-dessous) et le
      noter ici avant de commencer.

### Améliorations techniques courtes (liste d'attente)
- [ ] `tools/notebook/notebook.js` : `runTest()` et le test `NOTEBOOK RÉEL`
      créent des entrées persistantes (`test_suite`, `test_outil_notebook`) qui
      s'accumulent — nettoyage à l'issue du test souhaitable (le 2026-09-05 :
      25 entrées résiduelles purgées manuellement).
- [ ] `tests/run-tests.js` (section 4 MÉMOIRE) : l'entrée `{question:'test',
      answer:'ok'}` n'est pas supprimée à la fin → suppression automatique
      souhaitable (4 résidus purgés manuellement le 2026-09-05).
- [ ] Observer si le mode `library` CLI a besoin d'une aide en français plus
      détaillée (`AIgg.cmd library` sans argument l'affiche déjà).

### Évolutions prévues par les cahiers (non commencées — ne pas prétendre le contraire)
- [ ] Recherche bibliothèque **niveau 2** : import/export réel multi-fournisseur,
      calcul de similarité, multilingue (§18 et §24 du cahier bibliothèque).
- [ ] Communication externe e-mail (PHASE 4 du Prompt Maître).
- [ ] Connecteurs Gmail / Drive / Docs / Sheets (PHASE 4-5).
- [ ] IA externe comme OULE (porté par Connecteurs IA : outil, jamais le cerveau).
- [ ] Voix (synthèse + reconnaissance), vision (caméra) ; hébergement Web et
      publication contrôlée (PHASE 6-7) ; `MOURIR` (procédure explicite requise).
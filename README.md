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
.\AIgg.cmd tests        # auto-diagnostics (134 vérifications réelles)
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
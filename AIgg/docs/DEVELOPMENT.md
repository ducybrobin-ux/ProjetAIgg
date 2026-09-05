# AIgg — Guide pour les futurs agents (DEVELOPMENT.md)

> Ce document permet de reprendre le projet sans avoir la conversation
> d'origine. Lisez aussi `AUDIT.md`, `ARCHITECTURE.md`, `STATE.md`,
> `TOOLS.md`, `SECURITY.md`, `MIGRATION.md`, `CHANGELOG.md`.

## Principe directeur

NE RIEN INVENTER. Vérifier l'état réel. Réparer avant d'ajouter. Toute
fonction annoncée doit être testée réellement (PASS/FAIL/BLOCKED/NOT_TESTED).
Les exigences détaillées sont dans le « Prompt Maître » (voir `État |
InformationsProjetAIgg/Prompt maître — Construction AIgg avec Open Code.md`).

## Lancement

Prérequis : Node.js ≥ 18 (aucune dépendance npm ; la politique PowerShell
Restricted empêche les `.ps1` — utiliser `AIgg.cmd`).

```powershell
cd AIgg
.\AIgg.cmd birth        # créé l'AIgg + acte de naissance (nom, tuteur)
.\AIgg.cmd status       # identité, état, capacités, permissions, sens
.\AIgg.cmd server       # console du tuteur → http://127.0.0.1:8070/
.\AIgg.cmd tests        # 68 vérifications, PASS/FAIL réels
```

Commandes CLI : `birth status wake sleep pause backup learn server tests
needs discover propose <outil> authorize <outil> install <outil> test
<outil> revoke <outil> web-read <url> web-search <requête> notebook-add
<question> avatar migrate <destination>`.

## Architecture (résumé)

- `src/` modules : `config` (chemins/versions), `util` (UUID, JSON atomique),
  `identity`, `state` (8 états), `memory` (4 familles), `journal`, `senses`,
  `capabilities`, `permissions`, `needs`, `appearance`, `talk`, `contract`,
  `toolkit`, `backup`, `migrate`, `server` (API + console web).
- `tools/<nom>/` : `manifest.json` + implémentation native.
- `core/` PRIVÉ et exclu de Git : tous les fichiers d'état.
- Données privées aussi exclues : `memory/ journal/ inbox/ outbox/ backups/
  notebook/ senses/` + `tools/*/providers.json` + `web/public/avatar.svg`.

## Contrat Commun

Pipeline exécuté pour toute action outil (`src/contract.js`) :
`IDENTIFIER → vérifier CAPACITÉ → vérifier PERMISSION → EXÉCUTER →
JOURNALISER → MEMORISER (si demandé) → RETOURNER`.
Blocages honnêtes : `IDENTITY | CAPACITY | PERMISSION | EXECUTION`.

## Ajouter un outil

1. Créer `tools/<nom>/manifest.json` avec les champs attendus :
   `name, title, version, category, need, capability, description,
   needs_permissions, interactions, risks, independence,
   requires_external_ai, reversibility`.
2. Créer `tools/<nom>/<nom>.js` exportant une ou plusieurs fonctions + un
   `runTest()` réel (test local sans réseau par défaut).
3. `AIgg.cmd discover` (découverte) → `propose <nom>` → `authorize <nom>`
   → `install <nom>` (acquiert la capacité) → `test <nom>`.
4. Ajouter la capacité résultante visible dans `docs/CAPABILITIES.md` et
   documenter l'outil dans `docs/TOOLS.md`.
5. **Ne jamais** mettre de clé/token partagé ; `providers.json` est exclu.

## Ajouter un test réel

Dans `tests/run-tests.js` : créer une section numérotée et un `report(...)`
avec un critère observable. Marquer `PASS` uniquement si vérifié, `FAIL` si
l'échec est réel, `BLOCKED` si obstacle environnemental (réseau absent,
politique système…). Ne jamais écrire `PASS` parce que le code « semble »
correct.

## Conventions

- Code et messages internes en français ; sorties « library » (API, données)
  en anglais ; messages destinés à l'utilisateur en français.
- JSON jolifié en écriture atomique (`util.writeJson` : `.tmp` + rename).
- Journal : NDJSON, une clé par événement, pas de doublon.
- Ajouts de fonctionnalités : documenter dans `CHANGELOG.md` et `STATE.md`
  AVANT de considérer le travail terminé.
- Tout fichier privé par défaut ; tout ce qui part dans Git est du public
  (vérifier `git status` avant de pousser).

## Checklist « fin de tâche »

- [ ] `.\AIgg.cmd tests` → PASS au moins aussi bon qu'avant
- [ ] smoke réel de l'API (`node temp/smoke.js` ou navette HTTP)
- [ ] `docs/STATE.md` reflète l'état réel
- [ ] `docs/CHANGELOG.md` documente la modification
- [ ] aucun secret/mail réel dans l'index Git
# AIgg — Migration et portabilité (MIGRATION.md)

## Règle de continuité (§39)

Le déplacement d'AIgg **ne crée pas un nouvel AIgg**. AIgg_ID reste
strictement identique après migration. L'identité et l'histoire restent
cohérentes.

## Procédure

```powershell
cd AIgg
.\AIgg.cmd migrate G:\AIgg\Bob007
```

Vérifications faites avant la copie :
- identité source présente (naissance déjà effectuée) ;
- destination non vide et **hors** de l'incubateur source ;
- destination pas à l'intérieur de la source.

Contenu copié : code (`src/`, `AIgg.js`, `AIgg.cmd`, `AIgg.ps1`,
`package.json`, `web/`, `tools/`, `docs/`, `tests/`) + données privées
(`core/`, `memory/`, `sense/`, `journal/`, `notebook/`, `inbox/`, `outbox/`).
Sauvegardes (`backups/`) **exclues** : elles restent dans l'incubateur
d'origine.

Contrôles effectués à la fin (rapport) :

| Vérification | Critère |
|---|---|
| FILES_COPIED | > 0 |
| MEMORY_ENTRIES_PRESENT | fichiers `.json` de mémoire présents |
| CONTINUITY_VERIFIED | AIgg_ID(source) === AIgg_ID(destination) |
| migration_exclut_backups | dossier `backups/` absent à destination |

Si la continuité n'est pas vérifiée, le rapport est `STATUS: FAILED`
et le code de sortie est 1 (on ne cache pas l'erreur).

## Cas d'usage (parcours physiques)

- USB → ordinateur : copier l'incubateur, lancer `AIgg.cmd status` : le même
  AIgg répond.
- Ordinateur → serveur : même opération ; le serveur reste local (127.0.0.1)
  tant que le tuteur n'a pas explicitement exposé/permis autre chose.
- Serveur → Web : PHASE PLANNÉE (hébergement contrôlé, non réalisé).

## Test réel

La suite `tests/run-tests.js` exécute `TEST_MIGRATION` : migrate vers un
dossier temporaire, vérifie la continuité, puis supprime le dossier. Résultat
sur cette machine (2026-09-05) : 6/6 PASS (dont `migration_identite_identique`).

## Notes de prudence

- La destination doit être sur un support où AIgg a les droits d'écriture.
- Les permissions « settings » (`migrate: false` par défaut dans le scope)
  reflètent le fait que la migration est une action **explicite du tuteur**,
  pas une capacité autonome.
- Après migration, refaire un `AIgg.cmd tests` sur le site d'accueil pour
  valider l'incubateur copié.
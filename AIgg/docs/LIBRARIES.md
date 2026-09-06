# AIgg — Bibliothèques de spécialisation (LIBRARIES.md)

> Référence d'application du cahier
> `InformationsProjetAIgg/AIgg_BIBLIOTHEQUE_SPECIALISATION_CAHIER_DE_CONCEPTION.txt`.
> Moteur : `src/library.js`, 100 % natif (JSON + fs), aucune IA externe.

## Définition

Une **bibliothèque** n'est pas un dossier de liens : c'est un **environnement
d'apprentissage structuré** qui appartient au **tuteur** et n'est, par défaut,
jamais partagé.

Distinctions absolues :

- **BIBLIOTHÈQUE ≠ MÉMOIRE ≠ CERVEAU ≠ IDENTITÉ.** La bibliothèque est un
  support d'apprentissage ; la mémoire reste la mémoire d'AIgg.
- **SOURCE ≠ DOCUMENT ≠ CONNAISSANCE ≠ COMPÉTENCE.** Une source est une
  référence ; un document est un texte stocké ; une connaissance est un savoir
  déclaré avec provenance ; une compétence est une capacité pratiquée et
  prouvée. Aucun de ces niveaux ne doit être confondu avec les autres.

## Règles fondamentales

1. **Un document n'est jamais une vérité automatique.** Son contenu est
   stocké, jamais exécuté, jamais considéré vrai sans analyse.
2. **Le code importé n'est jamais exécuté.** `NEVER_EXECUTED: true` est posé
   sur chaque document.
3. **Une compétence n'est jamais `MASTERED` automatiquement.** À la création,
   une compétence est toujours `UNKNOWN` ; un passage à un état supérieur
   (jusqu'à `MASTERED`) exige une preuve et l'action du tuteur.
4. **Privée par défaut.** `privacy: 'private'` à la création ; les
   bibliothèques créées et la corbeille `libraries/_trash/` sont exclues du
   dépôt public. Seuls les exemples `libraries/examples/` sont publics.
5. **Moteur local.** Aucune IA externe requise pour chercher, classer ou
   comprendre.

## Arborescence d'une bibliothèque

```
libraries/
  _trash/                      # suppression = déplacement ici (corbeille)
  examples/science/ ...        # exemples publics (structure, sans savoir inventé)
  <id>/
    library.json               # métadonnées (propriétaire, domaines, notes, contradictions)
    sources.json               # références (A-E : confiance de la source)
    curriculum.json            # étapes d'apprentissage (niveau, sujets)
    competencies.json          # compétences + preuves + historique d'états
    knowledge/<fichiers>.json  # connaissances déclarées (avec provenance)
    documents/<fichiers>.json  # documents stockés, JAMAIS exécutés
    exercises/<fichiers>.json  # exercices (question, attendu, indices)
    journal/events.ndjson      # journal local de la bibliothèque
```

## États et confiance

- **États de connaissance** : `UNKNOWN, DISCOVERED, LEARNING, UNDERSTOOD,
  REQUIRES_REVIEW`.
- **États de compétence** : `UNKNOWN, LEARNING, PRACTICED,
  PARTIALLY_MASTERED, MASTERED, REQUIRES_REVIEW` — jamais `MASTERED`
  automatiquement.
- **Niveaux de confiance d'une source** : `A` (réf. officielle/vérifiée) à `E`
  (non vérifiée). Des sources de niveaux différents peuvent coexister ; la
  provenance de chaque connaissance cite la source utilisée.

## Contradictions (§14 du cahier)

Les contradictions entre connaissances ou sources sont **signalées et
conservées** : `knowledge_a`, `knowledge_b`, statut `OPEN` puis `RESOLVED`
après arbitrage du tuteur. On ne supprime jamais silencieusement un conflit.

## Recherche (§18) — niveau 2 implémenté

Le moteur expose toujours `search(requête, [bibliothèque])` (correspondance
locale, niveau 1), et surtout **`searchL2(requête, options)`** (niveau 2) :

- **Normalisation** : minuscules, accents retirés, ponctuation neutralisée,
  mots vides FR/EN/ES filtrés, racines communes (ex. « énergie / energy /
  energía ») ;
- **Multilingue** : une même requête retrouve les connaissances pertinentes
  rédigées en français, anglais ou espagnol ;
- **Classement expliqué** : chaque résultat porte un score et la liste des
  causes (`title`, `tags`, `concepts`, `content`, `provenance`, `exact`) ;
- **Filtres** : `library`, `language`, `type` (connaissance/source/document),
  `status`, `tags`, `provenance`, `limit` ;
- **Métadonnées** : les connaissances conservent `title`, `tags`, `concepts`,
  `language` et un `id` stable (lisible par la recherche et l'export).

CLI :

```
AIgg.cmd library search "photosynthèse"
AIgg.cmd library search "photosynthèse" --language=fr --limit=10
AIgg.cmd library search energy --language=en --type=connaissance
```

## Import / Export (§24)

Format **`aigg-library` v1** : métadonnées + sources + curriculum +
compétences + connaissances + exercices + documents.

- `importAnalyse(bundle)` : analyse sans rien écrire (id proposé, existence,
  comptages).
- `importActivate(bundle, identity, confirmed)` : remplace une bibliothèque
  existante seulement avec `confirmed=true`. Les compétences importées ne
  changent d'état que si l'export l'avait déjà prouvé (jamais d'auto-`MASTERED`).
- L'import accepte les deux dialectes : le bundle exporté par AIgg
  (`library` + champs exportés) et le format allégé `name` + `metadata`
  (fiches de corpus multilingues) ; `title/tags/concepts/language` et les ids
  de connaissance/source sont préservés.

CLI :

```
AIgg.cmd library import --file=Corpus_FR.json          # aperçu, sans écrire
AIgg.cmd library import --file=Corpus_FR.json --confirm # importe / remplace
```

## Usage

CLI :

```
AIgg.cmd library list                  # liste (y compris exemples publics)
AIgg.cmd library health                # dossiers + modèles
AIgg.cmd library create Mathématiques --domain=maths --private
AIgg.cmd library show <id>
AIgg.cmd library source-add <id> <titre> --trust=A --type=PDF --url=...
AIgg.cmd library knowledge-add <id> <contenu> --source=<sourceId>
AIgg.cmd library competence-add <id> <nom>
AIgg.cmd library competence-set <id> <comp> MASTERED   # exige preuve du tuteur
AIgg.cmd library contradiction-add <id> <a> <b>
AIgg.cmd library note-add <id> <texte>
AIgg.cmd library search <requête> [--language=fr|en|es] [--type=connaissance|source|document]
AIgg.cmd library export <id>
AIgg.cmd library import --file=<fichier> [--confirm]
AIgg.cmd library remove <id>           # → _trash (corbeille)
```

Console web : onglet **« Bibliothèques »** (liste, détail, création privée,
recherche) + API `/api/libraries*` (voir server.js).

## Modèles

`templates/library.json`, `templates/source.json`, `templates/curriculum.json`,
`templates/competency.json` documentent la structure attendue.

## Exemples publics

`libraries/examples/science/` et `libraries/examples/programming/` montrent
**la structure** (sources, curriculum, compétences) mais **aucune connaissance
pré-remplie** : aucun savoir inventé n'est livré. Le tuteur construit son
propre contenu.
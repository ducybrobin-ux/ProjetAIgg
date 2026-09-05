# AIgg — Sécurité (SECURITY.md)

## Principe absolu : MOINDRE PRIVILÈGE

Par défaut, AIgg ne peut **rien** publier, supprimer, migrer, envoyer ni
accéder arbitrairement aux fichiers. Toute capacité doit être explicitement
autorisée par le tuteur (CLI `authorize` ou console web).

`core/permissions.json` (privé) porte les permissions `scope` :

| Action | Défaut |
|---|---|
| publish | false |
| delete | false |
| migrate | false |
| send_external | false |
| arbitrary_file_access | false |

Tous les outils `tools/*` sont `authorized: false` à la naissance.
Le Contrat Commun (`src/contract.js`) bloque toute exécution sans
identité / capacité / permission : codes `IDENTITY`, `CAPACITY`,
`PERMISSION`, `EXECUTION`.

## Jamais de secrets dans le public

Exclus du dépôt Git (`.gitignore` racine + `AIgg/.gitignore`) :

- `core/` entier (identité, certificat, état, capacités, permissions,
  besoins, apparence) ;
- `memory/`, `journal/`, `inbox/`, `outbox/`, `backups/`, `notebook/`,
  `senses/` ;
- `libraries/*` privées du tuteur et `libraries/_trash/` (seuls
  `libraries/examples/` sont publics — structure sans savoir pré-rempli) ;
- `tools/*/providers.json` (clés éventuelles de recherche) ;
- `web/public/avatar.svg` (artefact généré localement) ;
- `.env`, clés, certificats.

Règles :
- aucun mot de passe / token / clé privée dans Git, HTML, JS public, journal,
  mémoire, prompt, README public ;
- l'e-mail du tuteur n'apparaît que dans `core/identity.json` (exclu) ;
- test automatisé : avatar et pages publiques vérifiés sans secret
  (TEST_AVATAR « avatar_pas_de_secret », TEST_IDENTITE).

## Frontière tuteur / AIgg / outils

- Le tuteur détient l'autorité sur les permissions et peut révoquer à tout
  moment (`revoke`, `Désinstaller`).
- Les outils externes (e-mail, Drive, IA externes…) sont facultatifs,
  révocables, jamais le cerveau obligatoire d'AIgg.
- AIgg ne modifie jamais son apparence silencieusement : toute proposition
  passe par validation du tuteur puis journalisation (`APPEARANCE_*`).

## Bibliothèques de spécialisation

- Les bibliothèques appartiennent au tuteur et sont **privées par défaut** :
  hors dépôt public (`libraries/*` ignorées par Git, sauf `examples/`).
- Les documents importés et le code **ne sont jamais exécutés**
  (`NEVER_EXECUTED`), même s'ils semblent fiables.
- Un document n'est jamais considéré comme une « vérité » automatique ; les
  contradictions restent signalées tant que le tuteur ne les arbitre pas.

## Démarrage sûr

- Serveur local sur 127.0.0.1 (pas exposé au réseau).
- Migration : refuse une destination identique ou interne à l'incubateur.
- `migrate` copie les données privées (exclues de Git) vers la destination
  choisie par le tuteur.

## Actions dangereuses

- `MOURIR` (fin d'instance) : **non disponible** ; le mécanisme devra exiger
  une procédure explicite.
- Suppression de mémoire : réservée au tuteur, journalisée (`MEMORY_DELETE`).
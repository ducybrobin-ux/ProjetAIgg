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

Tous les outils `tools/*` sont `authorized: false` à la naissance
(`email`, Gmail, Drive… ajoutés à `DEFAULT_TOOLS_BLOCKED`).
Le Contrat Commun (`src/contract.js`) bloque toute exécution sans
identité / capacité / permission : codes `IDENTITY`, `CAPACITY`,
`PERMISSION`, `EXECUTION`.
L'envoi externe (`send_external: false` par défaut) n'est possible que si le
tuteur autorise l'outil `email` ET fournit une configuration valide
(`tools/email/config.json`, hors Git).

## Jamais de secrets dans le public

Exclus du dépôt Git (`.gitignore` racine + `AIgg/.gitignore`) :

- `core/` entier (identité, certificat, état, capacités, permissions,
  besoins, apparence) ;
- `memory/`, `journal/`, `inbox/`, `outbox/`, `backups/`, `notebook/`,
  `senses/` ;
- `libraries/*` privées du tuteur et `libraries/_trash/` (seuls
  `libraries/examples/` sont publics — structure sans savoir pré-rempli) ;
- `tools/*/providers.json` (clés éventuelles de recherche) ;
- `tools/email/config.json` (configuration SMTP du tuteur — espace privé) ;
- `web/public/avatar.svg` (artefact généré localement) ;
- `vault/` (coffre-fort local — même chiffré, il reste hors Git) ;
- `.env`, clés, certificats.

Règles :
- aucun mot de passe / token / clé privée dans Git, HTML, JS public, journal,
  mémoire, prompt, README public (l'outil `email` n'utilise aucun secret en
  v0.3.0 : pas d'AUTH/STARTTLS, un serveur SMTP simple non chiffré) ;
- l'e-mail du tuteur n'apparaît que dans `core/identity.json` (exclu) ;
- test automatisé : avatar et pages publiques vérifiés sans secret
  (TEST_AVATAR « avatar_pas_de_secret », TEST_IDENTITE).

## Coffre-fort local (vault) — secrets sous chiffrement

- Les secrets (tokens OAuth des connecteurs, mots de passe d'une boîte
  e-mail, identifiants applicatifs) vont dans `vault/vault.json`, chiffré en
  **AES-256-GCM** avec clé dérivée par **scrypt** (natif, zéro dépendance).
- Le **mot de passe du coffre n'est jamais stocké** : il est fourni à chaque
  commande (`--password=` ou variable d'environnement `AIGG_VAULT_PASSWORD`)
  et n'apparaît dans aucun fichier, journal, mémoire ou doc.
- `vault/` est **hors Git** (.gitignore) : même chiffré, il n'est jamais publié.
- CLI : `AIgg.cmd vault init|put|get|list|rm|wipe|status`.
- Si le mot de passe est perdu, les secrets sont illisibles — aucune
  récupération magique n'existe (par conception).

## Connecteur Gmail — moindre privilège et secrets dans le coffre

- Outil `gmail` : accès via l'API Gmail v1, **scope minimal `gmail.metadata`**
  par défaut ; `read` corps complet exige `gmail.readonly`, `send` exige
  `gmail.send` — toute opération sur un scope absent est **refusée**.
- Le `access_token` et les scopes accordés vivent dans le **vault**
  (clés `gmail.access_token`, `gmail.scopes`), jamais dans Git, journal,
  mémoire ou aide CLI.
- `tools/gmail/config.json` (base d'API surchargable) est hors Git.
- Aucun envoi automatique : chaque `send` passe par le Contrat Commun
  (permission + capacité) et est tracé dans `outbox/`.
- Le connecteur est **révocable** (`AIgg.cmd revoke gmail`, `vault rm
  gmail.access_token`).
- Limite honnête : le moteur est testé contre une API simulée locale ; l'accès
  réel exige les identifiants OAuth2 du tuteur.

## Frontière tuteur / AIgg / outils

- Le tuteur détient l'autorité sur les permissions et peut révoquer à tout
  moment (`revoke`, `Désinstaller`).
- Les outils externes (e-mail, Drive, IA externes…) sont facultatifs,
  révocables, jamais le cerveau obligatoire d'AIgg.
- AIgg ne modifie jamais son apparence silencieusement : toute proposition
  passe par validation du tuteur puis journalisation (`APPEARANCE_*`).
- `appearance set` (CLI) applique directement mais c'est **le tuteur qui
  commande** : l'action est journalisée (`APPEARANCE_SET_BY_TUTOR`) ; AIgg
  n'a aucun chemin pour changer son apparence par lui-même.
- L'avatar reflète l'état (couleur d'anneau, `data-state`) sans jamais
  contenir d'identifiant ni d'e-mail du tuteur (test `avatar_pas_de_secret`).

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
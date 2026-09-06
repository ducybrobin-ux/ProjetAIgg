# AIgg — Incubateur

Socle minimal N0 d'un petit être numérique (l'« œuf »), indépendant de toute
IA externe obligatoire. Aucune dépendance npm : Node.js natif uniquement
(`http`, `fs`, `crypto`, `readline`).

## État réel (vérifié par le lot de tests)

- Naissance interactive : nom, tuteur, e-mail, informations facultatives.
- Acte de naissance : `core/birth_certificate.json`.
- Identité technique (UUID) distincte du nom : `core/identity.json`.
- Mémoire par familles (autobiographique, connaissances, relationnelle,
  procédurale) dans `memory/`, avec répertoire complet, recherche, correction,
  suppression.
- Journal d'événements : `journal/events.ndjson`.
- **Sens avec états DISPONIBLE / AUTORISE / ACTIF** : détection réelle de la
  machine (micro, caméra, haut-parleurs) sans matériel supposé.
- Capacités acquises (organes) et rétractées, permissions (moindre privilège).
- Veille / réveil, âge calculé depuis la naissance.
- Sauvegardes et restauration dans `backups/` (avec manifeste).
- **Registre d'outils** : chaque outil possède un `manifest.json` (nom,
  version, capacité, interactions, risques, réversibilité). Flux d'acquisition
  BESOIN -> RECHERCHE -> PROPOSITION -> AUTORISATION -> TEST -> INSTALLATION
  -> UTILISATION, et révocation.
- **Contrat Commun** : toute exécution suit
  IDENTIFIER -> VERIFIER CAPACITE -> VERIFIER PERMISSION -> EXECUTER ->
  JOURNALISER -> RETOURNER -> MEMORISER.
- **Console tuteur web** : identité, état, capacités, sens, outils,
  permissions, mémoire, notebook, journal, sauvegardes, avatar, **conversation**,
  **demandes** (besoins), **apparence** et **bibliothèques**.
- **Outils disponibles** : `web` (lecture HTTP + recherche), `notebook` (carnet
  de laboratoire), `avatar` (représentation SVG déterministe).
- **Conversation** : moteur honnête — reconnaît quelques formulations simples,
  apprend par « apprends que … » avec confirmation du tuteur, sinon répond
  « Je ne sais pas encore faire cela. »
- **Besoins** : AIgg peut demander de l'aide au tuteur (confirmation,
  autorisation d'outil, information) — visible dans l'onglet Demandes.
- **Apparence** : proposition → validation → application → journalisation ;
  le HTML est le corps visible d'AIgg (variables CSS pilotées).
- **États** : BORN, AWAKE, LEARNING, THINKING, WAITING, SLEEPING, PAUSED,
  STOPPED — transitions sécurisées et journalisées.
- **Migration** : `AIgg.cmd migrate <dest>` préserve strictement l'AIgg_ID.
- **Bibliothèques de spécialisation** : environnement d'apprentissage
  structuré appartenant au tuteur (`src/library.js`), privées par défaut,
  avec sources, documents (jamais exécutés), connaissances (avec provenance),
  compétences (jamais MASTERED automatiquement), curriculum, exercices,
  contradictions, annotations, journal, **recherche niveau 2 multilingue**
  (FR/EN/ES, classement expliqué, filtres), export/import
  `aigg-library` v1 via CLI. Voir `LIBRARIES.md`.

## Commandes

Le lanceur officiel est **`AIgg.cmd`** (fonctionne dans cmd et PowerShell,
indépendant de la politique d'exécution Windows) :

```powershell
.\AIgg.cmd birth             # naissance (interactive)
.\AIgg.cmd status            # état complet
.\AIgg.cmd wake / sleep      # veille
.\AIgg.cmd backup            # sauvegarde
.\AIgg.cmd learn             # apprentissage guidé
.\AIgg.cmd discover          # outils découverts
.\AIgg.cmd propose <outil>   # proposition d'acquisition
.\AIgg.cmd authorize <outil> # autoriser (tuteur)
.\AIgg.cmd install <outil>   # installer + acquérir la capacité
.\AIgg.cmd test <outil>      # test réel (PASS/FAIL/BLOCKED/NOT_TESTED)
.\AIgg.cmd revoke <outil>    # révoquer (permission + capacité)
.\AIgg.cmd web-read <url>    # lire une page (via le contrat, outil web)
.\AIgg.cmd web-search <q>    # recherche web
.\AIgg.cmd notebook-add <q>  # expérience de laboratoire
.\AIgg.cmd notebook-del <id>  # supprime une expérience (révocable)
.\AIgg.cmd avatar            # générer la représentation
.\AIgg.cmd needs             # liste des demandes d'AIgg
.\AIgg.cmd migrate <dest>    # copy portable (continuité AIgg_ID)
.\AIgg.cmd library list      # bibliothèques de spécialisation
.\AIgg.cmd library create Maths --domain=maths --private
.\AIgg.cmd library search <q># recherche niveau 2 (multilingue FR/EN/ES)
.\AIgg.cmd library import --file=<fichier> --confirm
.\AIgg.cmd docs-check      # audit READ SEUL des docs (versions, compteurs)
.\AIgg.cmd server            # console du tuteur web
.\AIgg.cmd tests             # auto-diagnostics (122 vérifications)
```

`AIgg.ps1` est un équivalent PowerShell facultatif. Si la politique d'exécution
est `Restricted`, Windows n'exécute pas les scripts PowerShell : utiliser
`AIgg.cmd`.

## Conventions

- Toute nouvelle fonctionnalité = nouveau module dans `src/`, test réel.
- Jamais de secret dans Git, journal, mémoire, prompts.
- Chaque outil est indépendant, versionné, permissionné, révocable. Un outil
  tiers (Gmail, Drive, IA externe…) n'est jamais le cerveau d'AIgg.
- Fiabilité > Simplicité > Sécurité > Portabilité > Extension.
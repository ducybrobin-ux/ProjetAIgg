# AIgg — Capacités (CAPABILITIES.md)

> Registre réel : `core/capabilities.json` (privé). La source des statuts
> affichés est ce fichier. Règle absolue : **CAPACITÉ ≠ OUTIL ≠ AGENT ≠
> SERVICE ≠ IDENTITÉ**. Une capacité est acquise par AIgg ; un outil est ce
> qu'AIgg utilise ; une IA externe est un outil possible, jamais AIgg.

## Capacités de naissance (niveau 0, déjà acquises)

| Capacité | Description | Source |
|---|---|---|
| IDENTITE | Connaître son identité | socle |
| TEMPS | Percevoir le temps et son âge | socle |
| MEMOIRE | Mémoriser et se souvenir | socle |
| JOURNAL | Journaliser les événements | socle |
| QUESTIONNEMENT | Poser des questions pour comprendre | socle |
| PERMISSIONS | Respecter les permissions | socle |
| ATTENTION | Réagir aux événements dignes de réaction | socle |
| BESOINS | Déterminer ce dont il a besoin | socle |
| ACTION | Effectuer des actions permises | socle |
| DORMIR | Mettre en veille et conserver l'expérience | socle |
| VIVRE | Démarrer, observer, apprendre, interagir | socle |

## Capacités acquises via des outils

| Capacité | Outil | Comment |
|---|---|---|
| RECHERCHER | `web` | Lecture HTTP + recherche multi-sources (autorisée, testée) |
| LABORATOIRE | `notebook` | Expériences reproductibles en local |
| REPRESENTATION | `avatar` | Représentation visuelle SVG (apparence, pas identité) |
| COMMUNICATION | `email` | Envoi e-mail SMTP natif (v0.3.0, tracé outbox/) |
| CONSULTATION | `ia` | Consulter une IA externe en OUTIL (v0.3.10 ; multi-fournisseurs + outbox/ en v0.3.11) — réponse EXTERNAL_IA, jamais mémorisée automatiquement |

## Capacités prévues, non acquises (honnête)

- `MOURIR` : arrêt définitif selon procédure explicite du tuteur (non acquis —
  on ne le déclare PAS disponible).
- Réception e-mail (IMAP), VOIX, VISION, STOCKAGE EXTERNE, CALENDRIER,
  CARTOGRAPHIE, PROGRAMMATION, HÉBERGEMENT, PUBLICATION, MIGRATION autonome :
  **mécanisme prêt** (registre d'outils + capacités), mais **non codées**.

## Réflexe de conscience de soi — Berceau (v0.3.12)

Hors registre (ce n'est pas une capacité acquise à la demande, mais une
**introspection constante**, comme percevoir son âge) :

- AIgg mesure son poids réel (`src/berceau.js`) et l'espace libre du disque
  (`fs.statfs`) — réponse de fait en conversation (« quelle est ta taille ? »).
- Quota « Berceau » alloué par le tuteur (1 Go par défaut, `core/berceau.json`).
- À l'étroit → besoin `AGRANDIR` (demande d'aide, jamais d'action autonome).

## Habitations et Santé (v0.3.13)

- **Habitations** : le quota alloué nomme le niveau d'espace (`berceau.level()`)
  — Graine 100 Mo → Berceau 1 Go → Studio 2 Go → Appartement 5 Go → Maison
  10 Go → Atelier 20 Go → Laboratoire 50 Go → Centre 100 Go → Écosystème
  250 Go et plus. L'équipement listé par niveau est le **plan** du tuteur,
  jamais annoncé comme acquis ; plus d'espace ≠ plus intelligent. Les seuils
  sont **prédictifs et jamais une obligation** : AIgg reste dans son habitation
  et continue d'acquérir badges, compétences et outils tant qu'il a de la
  place ; il ne « déménage » jamais tout seul — soit le tuteur réalloue un
  quota plus grand (`berceau set`), soit AIgg devient à l'étroit (≥ 85 %) et
  demande (`AGRANDIR`).
- **Santé du système** (`src/health.js`) : introspection consolidée réellement
  mesurée (les 14 points du plan) — état, niveau, espace, bibliothèques, outils,
  compétences, permissions, sens, tâches, erreurs récentes, sauvegardes.
  Accessible par CLI (`health`), API (`/api/health`) et console web (onglet
  « Santé »).

## Principes d'acquisition

- Une capacité s'acquiert par `capabilities.acquireCapacity()` (utilisé par
  `toolkit.install()`), se libère par `releaseCapacity()` (sur révocation).
- Le pipeline vérifie AVANT d'exécuter : capacité acquise ? permission
  accordée ? (`src/contract.js`).
- Aucune capacité n'est ajoutée au registre sans test réel de l'outil qui la
  fournit.
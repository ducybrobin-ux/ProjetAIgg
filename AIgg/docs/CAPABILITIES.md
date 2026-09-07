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

## Capacités prévues, non acquises (honnête)

- `MOURIR` : arrêt définitif selon procédure explicite du tuteur (non acquis —
  on ne le déclare PAS disponible).
- Réception e-mail (IMAP), VOIX, VISION, STOCKAGE EXTERNE, CALENDRIER,
  CARTOGRAPHIE, PROGRAMMATION, HÉBERGEMENT, PUBLICATION, MIGRATION autonome :
  **mécanisme prêt** (registre d'outils + capacités), mais **non codées**.

## Principes d'acquisition

- Une capacité s'acquiert par `capabilities.acquireCapacity()` (utilisé par
  `toolkit.install()`), se libère par `releaseCapacity()` (sur révocation).
- Le pipeline vérifie AVANT d'exécuter : capacité acquise ? permission
  accordée ? (`src/contract.js`).
- Aucune capacité n'est ajoutée au registre sans test réel de l'outil qui la
  fournit.
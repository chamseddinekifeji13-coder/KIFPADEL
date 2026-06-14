# Abonnements alertes (tournois / événements)

## Tables Supabase

Migration : `20260615120000_notification_subscriptions_and_outbox.sql`

| Table | Rôle |
|-------|------|
| `player_notification_preferences` | Préférences globales (tournois, événements, WhatsApp, e-mail, tous les clubs) |
| `club_alert_subscriptions` | Abonnement alertes pour un club précis |
| `notification_outbox` | File d’envoi WhatsApp / e-mail |

## Qui reçoit une alerte tournoi ?

Quand un tournoi passe en `registration_open` :

- Joueurs avec `tournaments_enabled = true`
- Et **soit** `all_clubs_alerts = true`
- **Soit** une ligne dans `club_alert_subscriptions` pour ce club

Canaux selon `whatsapp_enabled` / `email_enabled`.

## Inscription

- Le numéro WhatsApp est demandé à **création de compte** (stocké sur le profil).
- La **vérification OTP WhatsApp** reste obligatoire à l’onboarding avant réservation.
- Une ligne `player_notification_preferences` est créée à l’inscription.

## Template WhatsApp tournoi (Meta)

`kifpadel_tournament_alert` — variables : club, titre, date, lien

```env
WHATSAPP_TOURNAMENT_ALERT_TEMPLATE=kifpadel_tournament_alert
```

## Événements club (API interne)

`enqueueClubEventAlerts({ clubId, eventId, title, summary })` — à appeler quand un événement est publié (UI club à brancher).

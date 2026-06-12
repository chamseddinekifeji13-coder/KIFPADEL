# Notifications réservation (WhatsApp + e-mail)

Après chaque réservation réussie, Kifpadel envoie :

1. **WhatsApp** au joueur (`profiles.phone_e164`)
2. **WhatsApp** au club (`clubs.contact_phone`)
3. **E-mail** au joueur (compte Supabase Auth)
4. **E-mail** au club (`clubs.contact_email`)

Les envois sont **non bloquants** : une erreur de notification ne annule pas la réservation.

## WhatsApp (Meta Cloud API)

Réutilise les variables OTP :

```env
WHATSAPP_CLOUD_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

Templates à créer et faire approuver par Meta (catégorie **Utility**) :

### `kifpadel_booking_player` (langue `fr`)

Corps (6 variables) :

```text
Bonjour ! Votre réservation à {{1}} est enregistrée : {{2}} {{3}}, terrain {{4}}, {{5}} DT. Paiement : {{6}}.
```

| Variable | Contenu |
|----------|---------|
| {{1}} | Nom du club |
| {{2}} | Date (ex. lundi 15 juin) |
| {{3}} | Heures (ex. 08:00–09:00) |
| {{4}} | Terrain |
| {{5}} | Montant DT |
| {{6}} | Mode paiement |

### `kifpadel_booking_club` (langue `fr`)

Corps (6 variables) :

```text
Nouvelle réservation : {{1}} — {{2}} {{3}}, place {{4}}/4, {{5}} DT ({{6}}).
```

| Variable | Contenu |
|----------|---------|
| {{1}} | Nom joueur |
| {{2}} | Date |
| {{3}} | Heures |
| {{4}} | Place (1–4) |
| {{5}} | Montant DT |
| {{6}} | Mode paiement |

Variables optionnelles :

```env
WHATSAPP_BOOKING_PLAYER_TEMPLATE=kifpadel_booking_player
WHATSAPP_BOOKING_CLUB_TEMPLATE=kifpadel_booking_club
WHATSAPP_BOOKING_TEMPLATE_LANGUAGE=fr
NOTIFICATION_WHATSAPP_ENABLED=true
```

## E-mail (Resend)

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=notifications@kifpadel.tn
NOTIFICATION_EMAIL_ENABLED=true
```

Le domaine d’envoi doit être vérifié dans Resend.

## Développement local

Sans credentials, les notifications sont **loggées** en console (`[notifications:dev]`) et la réservation continue.

## Désactiver un canal

```env
NOTIFICATION_WHATSAPP_ENABLED=false
NOTIFICATION_EMAIL_ENABLED=false
```

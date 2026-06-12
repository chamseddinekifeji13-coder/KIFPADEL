# Vérification téléphone via WhatsApp (coût minimal)

Kifpadel envoie un code OTP à 6 chiffres via **WhatsApp Cloud API** (Meta), pas par SMS.

## Pourquoi WhatsApp ?

- En Tunisie, les conversations d’**authentification** WhatsApp sont en général **moins chères** que les SMS OTP.
- Un seul code à la création du compte (onboarding) + rate limits côté serveur.

## Configuration Meta

1. Créer une app Meta + activer **WhatsApp Business**.
2. Ajouter un numéro WhatsApp et obtenir le **Phone Number ID**.
3. Créer un **template d’authentification** (catégorie Authentication), ex. :
   - Nom : `kifpadel_otp`
   - Langue : `fr`
   - Corps : `Votre code Kifpadel : {{1}}`
4. Soumettre le template pour approbation Meta.
5. Générer un **token permanent** avec permission `whatsapp_business_messaging`.

## Variables d’environnement (Vercel / `.env.local`)

```env
WHATSAPP_CLOUD_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_OTP_TEMPLATE_NAME=kifpadel_otp
WHATSAPP_OTP_TEMPLATE_LANGUAGE=fr
```

Optionnel : `PHONE_OTP_PEPPER` pour renforcer le hash des codes OTP.

## Migration Supabase

Appliquer :

`supabase/migrations/20260611120000_phone_verification_whatsapp.sql`

Colonnes : `profiles.phone_e164`, `profiles.phone_verified_at`, table `phone_verification_challenges`.

## Mode développement

Sans token WhatsApp et `NODE_ENV !== production`, le code OTP est loggé serveur et affiché dans l’UI onboarding (`devHint`).

## Règles produit

- Onboarding : numéro WhatsApp **obligatoire** et vérifié.
- Réservation : `phone_verified_at` requis.
- Nouveaux comptes (&lt; 7 jours ou trust &lt; 55) : paiement **en ligne uniquement**.
- Liste joueurs : uniquement profils avec `phone_verified_at` non null.

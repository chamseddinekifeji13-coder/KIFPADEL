# Inscription Google (recommandée) + email

Kifpadel **recommande** la création de compte via **Google OAuth**, mais accepte aussi l’inscription **email / mot de passe**.

## Côté produit

- Page **Créer un compte** : bouton Google en premier (badge « Recommandé »), puis formulaire email.
- Page **Connexion** : Google en premier, puis email / mot de passe.
- **WhatsApp OTP obligatoire** à l’onboarding pour tous les nouveaux comptes (anti-faux profils).
- Gates nouveaux comptes : paiement en ligne uniquement les premiers jours.

## Configuration Supabase

1. Dashboard → **Authentication** → **Providers** → activer **Google**.
2. Créer des identifiants OAuth dans [Google Cloud Console](https://console.cloud.google.com/).
3. **URL Configuration** → redirect URLs (ajouter toutes les variantes) :
   - `https://www.kifpadel.tn/fr/auth/callback`
   - `https://www.kifpadel.tn/en/auth/callback`
   - `https://kifpadel.tn/fr/auth/callback` (redirigé vers www)
   - `https://kifpadel.tn/en/auth/callback`
4. **Site URL** Supabase : `https://www.kifpadel.tn`
5. Vercel : `NEXT_PUBLIC_SITE_URL=https://www.kifpadel.tn`
6. Google Cloud Console → **Authorized redirect URIs** : l’URL callback Supabase
   (`https://<project-ref>.supabase.co/auth/v1/callback`).

## Combinaison avec WhatsApp OTP

Flux : **Google ou email** → onboarding → **vérification WhatsApp** → réservation.

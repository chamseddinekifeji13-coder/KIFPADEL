# Inscription via Gmail (Google OAuth)

Kifpadel privilégie la création de compte via **Google OAuth** avec une adresse **@gmail.com** (ou @googlemail.com).

## Côté produit

- Page **Créer un compte** : bouton Google uniquement (plus d’inscription email/mot de passe).
- Page **Connexion** : Google en premier, puis email/mot de passe pour les comptes déjà créés.
- Après OAuth : refus si l’email Google n’est pas un domaine Gmail consumer.

## Configuration Supabase

1. Dashboard → **Authentication** → **Providers** → activer **Google**.
2. Créer des identifiants OAuth dans [Google Cloud Console](https://console.cloud.google.com/).
3. Authorized redirect URI Supabase (fourni par le dashboard).
4. **URL Configuration** → ajouter les redirect URLs du site :
   - `https://www.kifpadel.tn/fr/auth/callback`
   - `https://www.kifpadel.tn/en/auth/callback`
   - (preview / localhost selon environnement)
5. Variable `NEXT_PUBLIC_SITE_URL` alignée avec le domaine de production.

## Combinaison avec WhatsApp OTP

Flux recommandé : **Google Gmail** → onboarding → **vérification WhatsApp** → réservation.

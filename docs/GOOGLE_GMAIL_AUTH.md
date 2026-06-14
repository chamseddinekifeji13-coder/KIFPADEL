# Inscription Google (recommandée) + email

Kifpadel **recommande** la création de compte via **Google OAuth**, mais accepte aussi l’inscription **email / mot de passe**.

## Désactiver Google (temporaire)

1. Supabase → **Providers → Google** : désactiver le toggle.
2. Vercel : `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false` (ou ne pas définir la variable).
3. Les pages connexion / inscription n’affichent plus le bouton Google — **e-mail + mot de passe** uniquement.

Pour réactiver plus tard : configurer Client ID/Secret, activer le provider Supabase, puis `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.

## Côté produit

- Page **Créer un compte** : bouton Google en premier (badge « Recommandé »), puis formulaire email.
- Page **Connexion** : Google en premier, puis email / mot de passe.
- **WhatsApp OTP obligatoire** à l’onboarding pour tous les nouveaux comptes (anti-faux profils).
- Gates nouveaux comptes : paiement en ligne uniquement les premiers jours.

## Configuration Supabase

1. Dashboard → **Authentication** → **Providers** → activer **Google**.
2. Créer des identifiants OAuth dans [Google Cloud Console](https://console.cloud.google.com/).
3. **URL Configuration** → **Redirect URLs** (ajouter) :
   - `https://www.kifpadel.tn/**` (recommandé — couvre callback + query)
   - ou exactement :
     - `https://www.kifpadel.tn/fr/auth/callback`
     - `https://www.kifpadel.tn/en/auth/callback`
4. **Site URL** Supabase : `https://www.kifpadel.tn`
5. Vercel : `NEXT_PUBLIC_SITE_URL=https://www.kifpadel.tn`
6. Google Cloud Console → **Authorized redirect URIs** : l’URL callback Supabase
   (`https://cevnlahwxyikrplufzst.supabase.co/auth/v1/callback`).

### Erreur 400 sur `/auth/v1/authorize?provider=google`

Vérifier dans Supabase Dashboard :

1. **Authentication → Providers → Google** : activé + Client ID / Secret Google valides
2. **Authentication → URL Configuration → Redirect URLs** : `https://www.kifpadel.tn/**` présent
3. **Site URL** = `https://www.kifpadel.tn` (pas l’apex sans www)

L’app envoie `redirect_to` sans paramètres (`/fr/auth/callback`) ; la cible `next` est stockée en cookie.

## Combinaison avec WhatsApp OTP

Flux : **Google ou email** → onboarding → **vérification WhatsApp** → réservation.

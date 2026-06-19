# Templates e-mail Supabase Auth (Kifpadel)

À coller dans **Supabase Dashboard → Authentication → Email Templates**.

Variables Supabase disponibles : `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Token }}`, etc.

Couleurs : or `#D4AF37`, fond `#141414`, texte `#f5f5f5`.

---

## Confirm signup (confirmation d'inscription)

**Subject :**
```
Confirmez votre compte Kifpadel
```

**Body (HTML) :**

```html
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#141414;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#D4AF37,#B8941F);height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #2a2a2a;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#D4AF37;">Kifpadel</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#f5f5f5;">Bienvenue sur Kifpadel</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9ca3af;">Bonjour,</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#9ca3af;">Confirmez votre adresse e-mail <strong style="color:#f5f5f5;">{{ .Email }}</strong> pour activer votre compte et réserver des terrains de padel en Tunisie.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#B8941F);color:#000;font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Confirmer mon e-mail</a>
          </p>
          <p style="margin:0;font-size:13px;color:#666;">Si vous n'avez pas créé de compte, ignorez cet e-mail.</p>
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #2a2a2a;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Réservez des terrains de padel en Tunisie.</p>
          <p style="margin:0;font-size:13px;"><a href="https://www.kifpadel.tn" style="color:#D4AF37;text-decoration:none;font-weight:600;">kifpadel.tn</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## Reset password (mot de passe oublié)

**Subject :**
```
Réinitialisez votre mot de passe Kifpadel
```

**Body (HTML) :** même structure, remplacer le corps par :

```html
<h1 style="margin:0 0 16px;font-size:20px;color:#f5f5f5;">Réinitialisation du mot de passe</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#9ca3af;">Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expire sous 24 h.</p>
<p style="text-align:center;margin:28px 0;">
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#B8941F);color:#000;font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Nouveau mot de passe</a>
</p>
```

---

## Redirect URLs autorisées

Dans **Authentication → URL Configuration**, inclure :

- `https://www.kifpadel.tn/fr/auth/confirm-email`
- `https://www.kifpadel.tn/en/auth/confirm-email`
- `https://www.kifpadel.tn/fr/auth/callback`
- `https://www.kifpadel.tn/en/auth/callback`

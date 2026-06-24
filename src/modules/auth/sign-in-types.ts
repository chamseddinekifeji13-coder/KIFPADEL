export type SignInErrorCode =
  | "missing_fields"
  | "email_not_confirmed"
  | "auth_config_error"
  | "rate_limited"
  | "invalid_credentials";

export type SignInInput = {
  locale: string;
  email: string;
  password: string;
  next?: string;
};

export type SignInResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: SignInErrorCode };

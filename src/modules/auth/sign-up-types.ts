export type SignUpErrorCode =
  | "missing_fields"
  | "invalid_gender"
  | "invalid_phone"
  | "phone_in_use"
  | "user_exists"
  | "invalid_redirect_url"
  | "profile_trigger_error"
  | "auth_config_error"
  | "rate_limited"
  | "weak_password"
  | "invalid_email"
  | "bot_protection"
  | "service_unavailable"
  | "signup_failed";

export type SignUpInput = {
  locale: string;
  email: string;
  password: string;
  phone: string;
  displayName?: string;
  gender: string;
  next?: string;
  ref?: string | null;
};

export type SignUpResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: SignUpErrorCode };

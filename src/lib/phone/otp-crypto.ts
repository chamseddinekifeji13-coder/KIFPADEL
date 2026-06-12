import { createHash, randomInt } from "node:crypto";

const OTP_LENGTH = 6;

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

function pepper(): string {
  return (
    process.env.PHONE_OTP_PEPPER ??
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ??
    "kifpadel-dev-pepper-change-in-production"
  );
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(`${pepper()}:${code}`).digest("hex");
}

export function isValidOtpFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS_PER_HOUR = 4;

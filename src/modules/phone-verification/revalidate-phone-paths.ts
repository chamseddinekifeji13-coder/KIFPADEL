import { revalidatePath } from "next/cache";

/** Invalide le cache RSC des écrans liés à la vérification téléphone. */
export function revalidatePhoneVerificationPaths(): void {
  for (const locale of ["fr", "en"] as const) {
    revalidatePath(`/${locale}/profile`);
    revalidatePath(`/${locale}/profile/verify-phone`);
    revalidatePath(`/${locale}/onboarding`);
    revalidatePath(`/${locale}/book`);
  }
}

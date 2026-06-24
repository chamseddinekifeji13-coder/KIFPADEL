"use server";

import { revalidatePath } from "next/cache";

import {
  type NoShowDebtMode,
  parseClubFinancialPolicy,
} from "@/domain/rules/club-financial-policy";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { sanitizeHttpsUrl } from "@/lib/url/sanitize-https-url";
import {
  optionalTrimmedString,
  parseNonNegativeInt,
  parsePositiveMoneyOrNull,
} from "@/lib/utils/club-form-parse";

import type { ActionResult } from "@/modules/clubs/actions";

const STAFF_ROLES = new Set(["club_staff", "club_manager", "club_admin", "platform_admin"]);

const NO_SHOW_DEBT_MODES = new Set<NoShowDebtMode>(["full_share", "percent", "fixed", "none"]);

function parseBoundedInt(
  raw: FormDataEntryValue | null | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseCheckbox(raw: FormDataEntryValue | null | undefined): boolean {
  return String(raw ?? "") === "1";
}

function parseNoShowDebtMode(raw: FormDataEntryValue | null | undefined): NoShowDebtMode {
  const s = String(raw ?? "").trim() as NoShowDebtMode;
  return NO_SHOW_DEBT_MODES.has(s) ? s : "full_share";
}

const MEMBERSHIP_USER_COLUMNS = ["user_id", "player_id"] as const;

async function findStaffMembershipRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerActionClient>>,
  clubId: string,
  userId: string,
): Promise<string | null> {
  for (const col of MEMBERSHIP_USER_COLUMNS) {
    let qb = supabase.from("club_memberships").select("role").eq("club_id", clubId);
    qb = col === "user_id" ? qb.eq("user_id", userId) : qb.eq("player_id", userId);

    const { data, error } = await qb.maybeSingle();

    if (!error && data?.role) {
      return data.role;
    }
  }
  return null;
}

export async function updateClubBasicsAction(formData: FormData): Promise<ActionResult> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const clubId = String(formData.get("club_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const addressRaw = String(formData.get("address") ?? "").trim();
  const address = addressRaw.length > 0 ? addressRaw : null;
  const indoorCourts = parseNonNegativeInt(formData.get("indoor_courts_count"));
  const outdoorCourts = parseNonNegativeInt(formData.get("outdoor_courts_count"));
  const contactName = optionalTrimmedString(formData.get("contact_name"));
  const contactPhone = optionalTrimmedString(formData.get("contact_phone"));
  const contactEmail = optionalTrimmedString(formData.get("contact_email"));
  const racketRentalEnabled = String(formData.get("racket_rental_enabled") ?? "") === "1";
  const racketPriceParsed = parsePositiveMoneyOrNull(formData.get("racket_rental_price_per_unit"));
  const logoUrlRaw = String(formData.get("logo_url") ?? "").trim();
  const logoUrl = logoUrlRaw.length > 0 ? sanitizeHttpsUrl(logoUrlRaw) : null;

  const noShowDebtMode = parseNoShowDebtMode(formData.get("no_show_debt_mode"));
  const noShowDebtPercent = parseBoundedInt(formData.get("no_show_debt_percent"), 1, 100, 100);
  const noShowDebtFixedParsed = parsePositiveMoneyOrNull(formData.get("no_show_debt_fixed_dt"));
  const noShowTrustPenalty = parseBoundedInt(formData.get("no_show_trust_penalty"), 0, 50, 18);
  const noShowGraceMinutes = parseBoundedInt(formData.get("no_show_grace_minutes"), 5, 60, 15);
  const noShowAutoReport = parseCheckbox(formData.get("no_show_auto_report"));
  const freeCancellationHours = parseBoundedInt(formData.get("free_cancellation_hours"), 1, 72, 24);
  const lateCancelPenaltyEnabled = parseCheckbox(formData.get("late_cancel_penalty_enabled"));
  const lateCancelTrustPenalty = parseBoundedInt(formData.get("late_cancel_trust_penalty"), 0, 50, 10);
  const allowPayOnSite = parseCheckbox(formData.get("allow_pay_on_site"));
  const minTrustForPayOnSite = parseBoundedInt(formData.get("min_trust_for_pay_on_site"), 0, 100, 70);
  const requirePhoneVerification = parseCheckbox(formData.get("require_phone_verification"));
  const requireProfileComplete = parseCheckbox(formData.get("require_profile_complete"));
  const bookingFillDeadlineMinutes = parseBoundedInt(
    formData.get("booking_fill_deadline_minutes"),
    0,
    1440,
    30,
  );

  if (logoUrlRaw.length > 0 && !logoUrl) {
    return {
      ok: false,
      error: "URL du logo invalide — utilisez une adresse https:// complète.",
    };
  }

  if (!clubId || !name || !city) {
    return {
      ok: false,
      error: "Club, nom et ville sont obligatoires.",
    };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Vous devez être connecté pour enregistrer." };
  }

  const role = await findStaffMembershipRole(supabase, clubId, user.id);

  if (!role || !STAFF_ROLES.has(role)) {
    return { ok: false, error: "Vous n’avez pas le droit de modifier ce club." };
  }

  if (racketRentalEnabled && racketPriceParsed == null) {
    return {
      ok: false,
      error: "Indiquez un prix valide par raquette (DT) ou désactivez la location.",
    };
  }

  if (noShowDebtMode === "fixed" && noShowDebtFixedParsed == null) {
    return {
      ok: false,
      error: "Indiquez un montant fixe de pénalité no-show (DT) ou choisissez un autre mode.",
    };
  }

  const policyPreview = parseClubFinancialPolicy({
    no_show_debt_mode: noShowDebtMode,
    no_show_debt_fixed_cents:
      noShowDebtFixedParsed != null ? Math.round(noShowDebtFixedParsed * 100) : null,
    no_show_debt_percent: noShowDebtPercent,
    no_show_trust_penalty: noShowTrustPenalty,
    no_show_grace_minutes: noShowGraceMinutes,
    no_show_auto_report: noShowAutoReport,
    free_cancellation_hours: freeCancellationHours,
    late_cancel_penalty_enabled: lateCancelPenaltyEnabled,
    late_cancel_trust_penalty: lateCancelTrustPenalty,
    allow_pay_on_site: allowPayOnSite,
    min_trust_for_pay_on_site: minTrustForPayOnSite,
    require_phone_verification: requirePhoneVerification,
    require_profile_complete: requireProfileComplete,
  });

  const { error: updateError } = await supabase
    .from("clubs")
    .update({
      name,
      city,
      address,
      indoor_courts_count: indoorCourts,
      outdoor_courts_count: outdoorCourts,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      logo_url: logoUrl,
      racket_rental_enabled: racketRentalEnabled,
      racket_rental_price_per_unit: racketRentalEnabled ? racketPriceParsed : null,
      no_show_debt_mode: policyPreview.noShowDebtMode,
      no_show_debt_fixed_cents: policyPreview.noShowDebtFixedCents,
      no_show_debt_percent: policyPreview.noShowDebtPercent,
      no_show_trust_penalty: policyPreview.noShowTrustPenalty,
      no_show_grace_minutes: policyPreview.noShowGraceMinutes,
      no_show_auto_report: policyPreview.noShowAutoReport,
      free_cancellation_hours: policyPreview.freeCancellationHours,
      late_cancel_penalty_enabled: policyPreview.lateCancelPenaltyEnabled,
      late_cancel_trust_penalty: policyPreview.lateCancelTrustPenalty,
      allow_pay_on_site: policyPreview.allowPayOnSite,
      min_trust_for_pay_on_site: policyPreview.minTrustForPayOnSite,
      require_phone_verification: policyPreview.requirePhoneVerification,
      require_profile_complete: policyPreview.requireProfileComplete,
      booking_fill_deadline_minutes: bookingFillDeadlineMinutes,
    })
    .eq("id", clubId);

  if (updateError) {
    console.error("[updateClubBasicsAction] update failed", updateError);
    return { ok: false, error: "La mise à jour a échoué. Réessayez plus tard." };
  }

  revalidatePath(`/${locale}/club/settings`, "page");
  revalidatePath(`/${locale}/club/dashboard`, "page");
  revalidatePath(`/${locale}/book/${clubId}`, "page");
  revalidatePath(`/${locale}/book`, "page");
  revalidatePath(`/${locale}/clubs`, "page");

  return { ok: true };
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  Clock,
  AlertTriangle,
  Save,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Info,
  User,
  Dumbbell,
  Coins,
  ImageIcon,
  Upload,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { updateClubBasicsAction } from "@/modules/clubs/actions/update-club-basics";
import { uploadClubLogoAction } from "@/modules/clubs/actions/upload-club-logo";
import type { NoShowDebtMode } from "@/domain/rules/club-financial-policy";

type Settings = {
  clubId: string;
  clubName: string;
  city: string;
  address: string;
  indoorCourtsCount: number;
  outdoorCourtsCount: number;
  contactName: string;
  phone: string;
  email: string;
  /** URL HTTPS du logo (champ libre, validé côté serveur). */
  logoUrlRaw: string;
  racketRentalEnabled: boolean;
  /** Champ libre prix unitaire DT (parsé côté serveur). */
  racketRentalPriceRaw: string;
  noShowDebtMode: NoShowDebtMode;
  noShowDebtPercent: number;
  noShowDebtFixedRaw: string;
  allowPayOnSite: boolean;
  minTrustForPayOnSite: number;
  requirePhoneVerification: boolean;
  requireProfileComplete: boolean;
  freeCancellationHours: number;
  lateCancelPenalty: boolean;
  lateCancelTrustPenalty: number;
  noShowPenaltyPoints: number;
  autoReportNoShow: boolean;
  noShowGracePeriodMinutes: number;
};

type ClubSettingsFormProps = {
  initialSettings: Settings;
  locale: string;
};

export function ClubSettingsForm({ initialSettings, locale }: ClubSettingsFormProps) {
  const router = useRouter();
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    const fd = new FormData();
    fd.set("locale", locale);
    fd.set("club_id", settings.clubId);
    fd.set("name", settings.clubName);
    fd.set("city", settings.city);
    fd.set("address", settings.address);
    fd.set("indoor_courts_count", String(settings.indoorCourtsCount));
    fd.set("outdoor_courts_count", String(settings.outdoorCourtsCount));
    fd.set("contact_name", settings.contactName);
    fd.set("contact_phone", settings.phone);
    fd.set("contact_email", settings.email);
    fd.set("logo_url", settings.logoUrlRaw.trim());
    fd.set("racket_rental_enabled", settings.racketRentalEnabled ? "1" : "0");
    fd.set("racket_rental_price_per_unit", settings.racketRentalPriceRaw.trim());
    fd.set("no_show_debt_mode", settings.noShowDebtMode);
    fd.set("no_show_debt_percent", String(settings.noShowDebtPercent));
    fd.set("no_show_debt_fixed_dt", settings.noShowDebtFixedRaw.trim());
    fd.set("no_show_trust_penalty", String(settings.noShowPenaltyPoints));
    fd.set("no_show_grace_minutes", String(settings.noShowGracePeriodMinutes));
    fd.set("no_show_auto_report", settings.autoReportNoShow ? "1" : "0");
    fd.set("free_cancellation_hours", String(settings.freeCancellationHours));
    fd.set("late_cancel_penalty_enabled", settings.lateCancelPenalty ? "1" : "0");
    fd.set("late_cancel_trust_penalty", String(settings.lateCancelTrustPenalty));
    fd.set("allow_pay_on_site", settings.allowPayOnSite ? "1" : "0");
    fd.set("min_trust_for_pay_on_site", String(settings.minTrustForPayOnSite));
    fd.set("require_phone_verification", settings.requirePhoneVerification ? "1" : "0");
    fd.set("require_profile_complete", settings.requireProfileComplete ? "1" : "0");

    const result = await updateClubBasicsAction(fd);

    setSaving(false);

    if (!result.ok) {
      setSaveError(result.error);
      return;
    }

    setSaved(true);
    router.refresh();
    window.setTimeout(() => setSaved(false), 3000);
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingLogo(true);
    setLogoUploadError(null);

    const fd = new FormData();
    fd.set("locale", locale);
    fd.set("club_id", settings.clubId);
    fd.set("logo_file", file);

    const result = await uploadClubLogoAction(fd);

    setUploadingLogo(false);
    event.target.value = "";

    if (!result.ok) {
      setLogoUploadError(result.error);
      return;
    }

    updateSetting("logoUrlRaw", result.logoUrl);
    setSaved(true);
    router.refresh();
    window.setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-[var(--gold)]" />
          </div>
          <div>
            <h2 className="font-bold text-white">Informations du club</h2>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              Enregistrées en base — visibles sur la fiche club
            </p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <InputField
            label="Nom du club"
            icon={Building2}
            value={settings.clubName}
            onChange={(v) => updateSetting("clubName", v)}
          />
          <InputField
            label="Ville"
            icon={MapPin}
            value={settings.city}
            onChange={(v) => updateSetting("city", v)}
          />
          <InputField
            label="Adresse"
            icon={MapPin}
            value={settings.address}
            onChange={(v) => updateSetting("address", v)}
          />
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Terrains couverts"
              icon={Building2}
              min={0}
              max={99}
              value={settings.indoorCourtsCount}
              onChange={(v) => updateSetting("indoorCourtsCount", v)}
            />
            <NumberField
              label="Terrains extérieurs"
              icon={Building2}
              min={0}
              max={99}
              value={settings.outdoorCourtsCount}
              onChange={(v) => updateSetting("outdoorCourtsCount", v)}
            />
          </div>
          <InputField
            label="Nom du responsable"
            icon={User}
            value={settings.contactName}
            onChange={(v) => updateSetting("contactName", v)}
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Téléphone"
              icon={Phone}
              inputMode="tel"
              autoComplete="tel"
              value={settings.phone}
              onChange={(v) => updateSetting("phone", v)}
            />
            <InputField
              label="Email"
              icon={Mail}
              type="email"
              autoComplete="email"
              value={settings.email}
              onChange={(v) => updateSetting("email", v)}
            />
          </div>
          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
              Logo du club
            </p>
            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={handleLogoFileChange}
            />
            <button
              type="button"
              disabled={uploadingLogo}
              onClick={() => logoFileInputRef.current?.click()}
              className={cn(
                "tap-target flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--gold)]/40 bg-[var(--gold)]/5 px-4 py-3 text-sm font-bold text-[var(--gold)] transition-colors",
                uploadingLogo
                  ? "opacity-70 cursor-wait"
                  : "hover:bg-[var(--gold)]/10 active:bg-[var(--gold)]/15",
              )}
            >
              {uploadingLogo ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Téléversement…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Téléverser un logo
                </>
              )}
            </button>
            <p className="text-[10px] text-[var(--foreground-muted)] leading-relaxed">
              PNG, JPEG, WebP ou GIF — max. 2 Mo. Ratio conseillé&nbsp;: carré ou 16:9.
            </p>
            {logoUploadError ? (
              <p className="text-xs text-[var(--danger)]">{logoUploadError}</p>
            ) : null}
            {settings.logoUrlRaw.trim() ? (
              <div className="relative aspect-video max-w-sm overflow-hidden rounded-xl border border-[var(--border)] bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.logoUrlRaw.trim()}
                  alt="Aperçu logo"
                  className="h-full w-full object-cover opacity-90"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : null}
            <details className="rounded-xl border border-[var(--border)] bg-[var(--background)]/50">
              <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-[var(--foreground-muted)]">
                Ou coller une URL externe (avancé)
              </summary>
              <div className="space-y-2 border-t border-[var(--border)] p-4">
                <InputField
                  label="URL du logo (https)"
                  icon={ImageIcon}
                  type="url"
                  placeholder="https://…/logo.png"
                  value={settings.logoUrlRaw}
                  onChange={(v) => updateSetting("logoUrlRaw", v)}
                />
              </div>
            </details>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center">
            <Dumbbell className="h-4 w-4 text-[var(--gold)]" />
          </div>
          <div>
            <h2 className="font-bold text-white">Location de raquettes</h2>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              Enregistrée en base — option proposée aux joueurs à la réservation
            </p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <ToggleField
            label="Proposer la location de raquettes"
            description="Les joueurs pourront ajouter des raquettes en plus du créneau terrain"
            checked={settings.racketRentalEnabled}
            onChange={(v) => updateSetting("racketRentalEnabled", v)}
          />
          {settings.racketRentalEnabled ? (
            <InputField
              label="Prix par raquette (DT)"
              icon={Coins}
              type="text"
              inputMode="decimal"
              value={settings.racketRentalPriceRaw}
              onChange={(v) => updateSetting("racketRentalPriceRaw", v)}
            />
          ) : null}
        </div>
      </section>

      {/* Booking Policy */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-[var(--gold)]" />
          </div>
          <div>
            <h2 className="font-bold text-white">Politique de paiement</h2>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              Enregistrée en base — règles de paiement sur place
            </p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <ToggleField
            label="Autoriser paiement sur place"
            description="Permettre aux joueurs de confiance de payer à l'arrivée"
            checked={settings.allowPayOnSite}
            onChange={(v) => updateSetting("allowPayOnSite", v)}
          />

          {settings.allowPayOnSite && (
            <div className="pl-4 border-l-2 border-[var(--gold)]/20 space-y-4">
              <SliderField
                label="Score de confiance minimum"
                description="Seuls les joueurs avec ce score ou plus peuvent payer sur place"
                value={settings.minTrustForPayOnSite}
                min={0}
                max={100}
                onChange={(v) => updateSetting("minTrustForPayOnSite", v)}
              />

              <div className="p-3 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20 flex items-start gap-3">
                <Info className="h-4 w-4 text-[var(--gold)] mt-0.5" />
                <div className="text-xs text-[var(--foreground-muted)]">
                  <p>
                    Avec un score minimum de{" "}
                    <strong className="text-[var(--gold)]">{settings.minTrustForPayOnSite}</strong> :
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    <li>• Les joueurs &quot;Healthy&quot; (≥70) peuvent payer sur place</li>
                    <li>
                      • Les joueurs &quot;Warning&quot; (45-69){" "}
                      {settings.minTrustForPayOnSite <= 45 ? "peuvent" : "doivent payer en ligne"}
                    </li>
                    <li>• Les joueurs &quot;Restricted&quot; doivent toujours payer en ligne</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <ToggleField
            label="Exiger vérification téléphone"
            description="Le joueur doit avoir vérifié son numéro pour réserver"
            checked={settings.requirePhoneVerification}
            onChange={(v) => updateSetting("requirePhoneVerification", v)}
          />

          <ToggleField
            label="Exiger profil complet"
            description="Nom, ville et photo requis pour réserver"
            checked={settings.requireProfileComplete}
            onChange={(v) => updateSetting("requireProfileComplete", v)}
          />
        </div>
      </section>

      {/* Cancellation Policy */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-[var(--warning)]" />
          </div>
          <div>
            <h2 className="font-bold text-white">Politique d&apos;annulation</h2>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              Enregistrée en base — délai d&apos;annulation gratuite
            </p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <SliderField
            label="Annulation gratuite jusqu'à"
            description="Heures avant le créneau pour annuler sans pénalité"
            value={settings.freeCancellationHours}
            min={1}
            max={48}
            unit="h"
            onChange={(v) => updateSetting("freeCancellationHours", v)}
          />

          <ToggleField
            label="Pénalité annulation tardive"
            description="Appliquer une pénalité trust pour les annulations tardives"
            checked={settings.lateCancelPenalty}
            onChange={(v) => updateSetting("lateCancelPenalty", v)}
          />
        </div>
      </section>

      {/* No-show Policy */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[var(--danger)]/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />
          </div>
          <div>
            <h2 className="font-bold text-white">Politique no-show</h2>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              Enregistrée en base — pénalités financières et score de confiance
            </p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Pénalité financière (dette club)</p>
            <p className="text-xs text-[var(--foreground-muted)]">
              Montant dû par le joueur absent avant de pouvoir réserver à nouveau dans votre club
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["full_share", "Montant total de la place"],
                  ["percent", "Pourcentage de la place"],
                  ["fixed", "Montant fixe (DT)"],
                  ["none", "Aucune dette financière"],
                ] as const
              ).map(([mode, label]) => (
                <label
                  key={mode}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition-colors",
                    settings.noShowDebtMode === mode
                      ? "border-[var(--gold)] bg-[var(--gold)]/10 text-white"
                      : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--gold)]/40",
                  )}
                >
                  <input
                    type="radio"
                    name="no_show_debt_mode"
                    className="accent-[var(--gold)]"
                    checked={settings.noShowDebtMode === mode}
                    onChange={() => updateSetting("noShowDebtMode", mode)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {settings.noShowDebtMode === "percent" ? (
            <SliderField
              label="Pourcentage de la place"
              description="Part du prix de la place facturée en cas d'absence"
              value={settings.noShowDebtPercent}
              min={10}
              max={100}
              unit="%"
              onChange={(v) => updateSetting("noShowDebtPercent", v)}
            />
          ) : null}

          {settings.noShowDebtMode === "fixed" ? (
            <InputField
              label="Montant fixe (DT)"
              icon={Coins}
              type="text"
              inputMode="decimal"
              placeholder="ex. 25"
              value={settings.noShowDebtFixedRaw}
              onChange={(v) => updateSetting("noShowDebtFixedRaw", v)}
            />
          ) : null}

          <SliderField
            label="Pénalité score de confiance"
            description="Points retirés du score trust plateforme pour un no-show"
            value={settings.noShowPenaltyPoints}
            min={0}
            max={30}
            unit=" pts"
            onChange={(v) => updateSetting("noShowPenaltyPoints", v)}
          />

          <SliderField
            label="Période de grâce"
            description="Minutes après l'heure avant de marquer no-show"
            value={settings.noShowGracePeriodMinutes}
            min={5}
            max={30}
            unit=" min"
            onChange={(v) => updateSetting("noShowGracePeriodMinutes", v)}
          />

          <ToggleField
            label="Signalement automatique"
            description="Marquer automatiquement no-show après la période de grâce (bientôt disponible)"
            checked={settings.autoReportNoShow}
            onChange={(v) => updateSetting("autoReportNoShow", v)}
          />
        </div>
      </section>

      <div className="sticky bottom-20 md:bottom-0 bg-[var(--background)] py-4 space-y-2">
        {saveError ? (
          <p className="text-sm text-[var(--danger)] text-center" role="alert">
            {saveError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
            saved
              ? "bg-[var(--success)] text-white"
              : "bg-[var(--gold)] text-black hover:bg-[var(--gold-dark)]",
          )}
        >
          {saving ? (
            <>Enregistrement...</>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Informations et règlement enregistrés
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer les paramètres du club
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function InputField({
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
        <input
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--gold)] transition-colors"
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  icon: Icon,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            if (!Number.isFinite(n)) {
              onChange(0);
              return;
            }
            onChange(Math.min(max, Math.max(min, n)));
          }}
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--gold)] transition-colors"
        />
      </div>
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-1 w-10 h-6 rounded-full transition-colors flex items-center px-0.5",
          checked ? "bg-[var(--gold)]" : "bg-[var(--border)]",
        )}
      >
        <div
          className={cn(
            "w-5 h-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4",
          )}
        />
      </button>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function SliderField({
  label,
  description,
  value,
  min,
  max,
  unit = "",
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{description}</p>
        </div>
        <span className="text-lg font-bold text-[var(--gold)] font-mono">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full bg-[var(--border)] appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--gold)]"
      />
    </div>
  );
}

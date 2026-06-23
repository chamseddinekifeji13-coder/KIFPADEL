"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, CheckCircle2, AlertCircle, Trophy } from "lucide-react";

import type { PhoneVerificationChannel } from "@/lib/phone/verification-channel";
import {
  confirmPhoneNumberAction,
  retryPhoneVerificationRecoveryAction,
  sendPhoneOtpAction,
  verifyPhoneOtpAction,
} from "@/modules/phone-verification/actions";

export type PhoneVerificationLabels = {
  title: string;
  subtitle: string;
  verifiedTitle: string;
  verifiedCelebrationTitle?: string;
  verifiedCelebrationBody?: string;
  redirectingHint?: string;
  phoneLabel: string;
  sendCode: string;
  sending: string;
  resendCode: string;
  changePhone: string;
  retryValidation: string;
  verifyCode: string;
  verifying: string;
  confirmPhone: string;
  confirming: string;
  hint: string;
  codePlaceholder: string;
  emailCodeHint?: string;
};

const DEFAULT_LABELS_FR: PhoneVerificationLabels = {
  title: "Numéro de téléphone",
  subtitle: "Obligatoire avant de réserver un terrain",
  verifiedTitle: "Numéro enregistré",
  phoneLabel: "Numéro de téléphone",
  sendCode: "Recevoir le code",
  sending: "Envoi en cours...",
  resendCode: "Renvoyer le code",
  changePhone: "Modifier le numéro",
  retryValidation: "Finaliser la vérification",
  verifyCode: "Vérifier le code",
  verifying: "Vérification...",
  confirmPhone: "Confirmer mon numéro",
  confirming: "Enregistrement...",
  hint: "Utilisé pour les rappels de réservation et le contact club.",
  codePlaceholder: "Code à 6 chiffres",
};

type PhoneVerificationFormProps = {
  channel?: PhoneVerificationChannel;
  initialPhone?: string;
  initialVerified?: boolean;
  redirectOnSuccess?: string;
  labels?: Partial<PhoneVerificationLabels>;
  onVerified?: (phone: string) => void;
};

export function PhoneVerificationForm({
  channel = "instant",
  initialPhone = "",
  initialVerified = false,
  redirectOnSuccess,
  labels: labelsOverride,
  onVerified,
}: PhoneVerificationFormProps) {
  const router = useRouter();
  const labels = { ...DEFAULT_LABELS_FR, ...labelsOverride };
  const usesOtp = channel === "email" || channel === "whatsapp";

  const [phone, setPhone] = useState(() =>
    initialPhone.replace(/\D/g, "").replace(/^216/, "").slice(-8),
  );
  const [phoneVerified, setPhoneVerified] = useState(initialVerified);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const finishSuccess = (verifiedPhone: string) => {
    setPhoneVerified(true);
    setDevOtpHint(null);
    setLoading(false);
    onVerified?.(verifiedPhone);
    router.refresh();
    if (redirectOnSuccess) {
      window.setTimeout(() => {
        router.push(redirectOnSuccess);
      }, 1800);
    }
  };

  const handleConfirmInstant = async () => {
    if (phone.length < 8) return;
    setLoading(true);
    setPhoneError(null);

    const result = await confirmPhoneNumberAction(phone);
    if (!result.ok) {
      setPhoneError(result.error);
      setLoading(false);
      return;
    }

    finishSuccess(phone);
  };

  const handleSendCode = async () => {
    if (phone.length < 8) return;
    setLoading(true);
    setPhoneError(null);
    setDevOtpHint(null);

    const result = await sendPhoneOtpAction(phone);
    if (!result.ok) {
      setPhoneError(result.error);
      setLoading(false);
      return;
    }

    if (!usesOtp) {
      finishSuccess(phone);
      return;
    }

    setCodeSent(true);
    setVerificationCode("");
    if (result.devHint) {
      setDevOtpHint(result.devHint);
    }
    setLoading(false);
  };

  const handleChangePhone = () => {
    setCodeSent(false);
    setVerificationCode("");
    setPhoneError(null);
    setDevOtpHint(null);
  };

  const handleRetryRecovery = async () => {
    if (phone.length < 8) return;
    setLoading(true);
    setPhoneError(null);

    const result = await retryPhoneVerificationRecoveryAction(phone);
    if (!result.ok) {
      setPhoneError(result.error);
      setLoading(false);
      return;
    }

    finishSuccess(phone);
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) return;
    setLoading(true);
    setPhoneError(null);

    const result = await verifyPhoneOtpAction(phone, verificationCode);
    if (!result.ok) {
      setPhoneError(result.error);
      setLoading(false);
      return;
    }

    finishSuccess(phone);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
          <Phone className="h-5 w-5 text-[var(--gold)]" />
        </div>
        <div>
          <h2 className="font-bold text-white">{labels.title}</h2>
          <p className="text-xs text-[var(--foreground-muted)]">{labels.subtitle}</p>
        </div>
      </div>

      {phoneVerified ? (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--gold)]/30 bg-gradient-to-br from-[var(--gold)]/15 to-[var(--success)]/10 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/20">
                <Trophy className="h-5 w-5 text-[var(--gold)]" />
              </div>
              <div className="space-y-2">
                <p className="font-bold text-white leading-snug">
                  {labels.verifiedCelebrationTitle ?? labels.verifiedTitle}
                </p>
                {labels.verifiedCelebrationBody ? (
                  <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
                    {labels.verifiedCelebrationBody}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
            <div>
              <p className="font-medium text-[var(--success)]">{labels.verifiedTitle}</p>
              <p className="text-xs text-[var(--foreground-muted)]">+216 {phone}</p>
            </div>
          </div>
          {redirectOnSuccess ? (
            <p className="text-xs text-center text-[var(--foreground-muted)] animate-pulse">
              {labels.redirectingHint ?? "Redirection vers votre profil…"}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {phoneError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{phoneError}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
              {labels.phoneLabel}
            </label>
            <div className="flex gap-2">
              <div className="h-12 px-4 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center text-white font-medium">
                +216
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="22 123 456"
                disabled={usesOtp && codeSent}
                className="flex-1 h-12 px-4 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--gold)] transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {!usesOtp ? (
            <button
              type="button"
              onClick={handleConfirmInstant}
              disabled={phone.length < 8 || loading}
              className="w-full h-12 rounded-xl bg-[var(--gold)] text-black font-bold text-sm hover:bg-[var(--gold-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? labels.confirming : labels.confirmPhone}
            </button>
          ) : !codeSent ? (
            <button
              type="button"
              onClick={handleSendCode}
              disabled={phone.length < 8 || loading}
              className="w-full h-12 rounded-xl bg-[var(--gold)] text-black font-bold text-sm hover:bg-[var(--gold-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? labels.sending : labels.sendCode}
            </button>
          ) : (
            <div className="space-y-3">
              {labels.emailCodeHint ? (
                <p className="text-xs text-center text-[var(--foreground-muted)]">{labels.emailCodeHint}</p>
              ) : null}
              {devOtpHint && (
                <p className="text-xs text-center text-[var(--gold)] bg-[var(--gold)]/10 rounded-lg py-2 px-3">
                  Mode dev : code OTP <span className="font-mono font-bold">{devOtpHint}</span>
                </p>
              )}
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={labels.codePlaceholder}
                className="w-full h-12 px-4 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white text-center text-2xl tracking-[0.5em] placeholder:text-[var(--foreground-muted)] placeholder:text-base placeholder:tracking-normal focus:outline-none focus:border-[var(--gold)] transition-colors"
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || loading}
                className="w-full h-12 rounded-xl bg-[var(--success)]/10 text-[var(--success)] font-bold text-sm hover:bg-[var(--success)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? labels.verifying : labels.verifyCode}
              </button>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading}
                  className="w-full text-sm font-bold text-[var(--gold)] hover:underline disabled:opacity-50"
                >
                  {loading ? labels.sending : labels.resendCode}
                </button>
                <button
                  type="button"
                  onClick={handleChangePhone}
                  disabled={loading}
                  className="w-full text-xs text-[var(--foreground-muted)] hover:text-white disabled:opacity-50"
                >
                  {labels.changePhone}
                </button>
              </div>
            </div>
          )}

          {usesOtp && phoneError?.includes("Aucun code actif") ? (
            <button
              type="button"
              onClick={handleRetryRecovery}
              disabled={phone.length < 8 || loading}
              className="w-full h-11 rounded-xl border border-[var(--gold)]/40 text-[var(--gold)] font-bold text-sm hover:bg-[var(--gold)]/10 transition-colors disabled:opacity-50"
            >
              {loading ? labels.verifying : labels.retryValidation}
            </button>
          ) : null}

          <p className="text-xs text-[var(--foreground-muted)] text-center">{labels.hint}</p>
        </div>
      )}
    </div>
  );
}

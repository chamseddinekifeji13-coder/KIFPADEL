"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageUp, Loader2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { uploadPlayerAvatarAction } from "@/modules/players/actions/upload-player-avatar";
import { compressAvatarImage } from "@/lib/storage/compress-avatar-image";
import { SelfieCaptureModal } from "@/components/features/players/selfie-capture-modal";

export type ProfileAvatarUploaderLabels = {
  title: string;
  subtitle: string;
  uploadCta: string;
  selfieCta: string;
  uploading: string;
  hint: string;
  selfieTitle: string;
  selfieCapture: string;
  selfieCancel: string;
  cameraError: string;
};

type ProfileAvatarUploaderProps = {
  locale: string;
  displayName: string;
  avatarUrl: string | null;
  labels: ProfileAvatarUploaderLabels;
};

export function ProfileAvatarUploader({
  locale,
  displayName,
  avatarUrl,
  labels,
}: ProfileAvatarUploaderProps) {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mobileSelfieInputRef = useRef<HTMLInputElement>(null);
  const [currentUrl, setCurrentUrl] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selfieOpen, setSelfieOpen] = useState(false);

  useEffect(() => {
    setCurrentUrl(avatarUrl);
  }, [avatarUrl]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const prepared = await compressAvatarImage(file);
      const fd = new FormData();
      fd.set("locale", locale);
      fd.set("avatar_file", prepared);

      const result = await uploadPlayerAvatarAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setCurrentUrl(result.avatarUrl);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Envoi impossible. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadFile(file);
  };

  const handleSelfieClick = () => {
    const isMobile =
      typeof window !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);

    if (isMobile) {
      mobileSelfieInputRef.current?.click();
      return;
    }

    setSelfieOpen(true);
  };

  const initials =
    displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative">
        <Avatar
          src={currentUrl}
          alt={displayName}
          fallback={initials}
          size="xl"
          className="h-24 w-24 border-2 border-[var(--gold)]/30 bg-[var(--surface-elevated)] text-lg"
        />
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
          </div>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 text-center sm:text-left">
        <div>
          <p className="font-bold text-white">{labels.title}</p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">{labels.subtitle}</p>
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />
        <input
          ref={mobileSelfieInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          onChange={handleFileChange}
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={uploading}
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 text-sm font-bold text-[var(--gold)] hover:bg-[var(--gold)]/20 disabled:opacity-50"
          >
            <ImageUp className="h-4 w-4" />
            {uploading ? labels.uploading : labels.uploadCta}
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={handleSelfieClick}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 text-sm font-bold text-black hover:bg-[var(--gold-dark)] disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            {labels.selfieCta}
          </button>
        </div>

        <p className="text-[10px] text-[var(--foreground-muted)] leading-relaxed">{labels.hint}</p>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>

      <SelfieCaptureModal
        open={selfieOpen}
        labels={{
          title: labels.selfieTitle,
          capture: labels.selfieCapture,
          cancel: labels.selfieCancel,
          cameraError: labels.cameraError,
        }}
        onCancel={() => setSelfieOpen(false)}
        onCapture={async (file) => {
          setSelfieOpen(false);
          await uploadFile(file);
        }}
      />
    </div>
  );
}

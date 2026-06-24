"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { adminInputClassName } from "@/components/features/admin/admin-form-styles";
import { uploadSponsorLogoAction } from "@/modules/sponsors/actions/upload-sponsor-logo";

type SponsorLogoFieldProps = {
  locale: string;
  sponsorId?: string;
  logoUrl: string;
  onLogoUrlChange: (url: string) => void;
  logoFile?: File | null;
  onLogoFileChange?: (file: File | null) => void;
};

export function SponsorLogoField({
  locale,
  sponsorId,
  logoUrl,
  onLogoUrlChange,
  logoFile,
  onLogoFileChange,
}: SponsorLogoFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const previewUrl = localPreview ?? (logoUrl.trim() || null);

  const handleFile = async (file: File) => {
    setError("");
    setLocalPreview(URL.createObjectURL(file));

    if (sponsorId) {
      setUploading(true);
      const fd = new FormData();
      fd.set("locale", locale);
      fd.set("sponsor_id", sponsorId);
      fd.set("logo_file", file);

      const result = await uploadSponsorLogoAction(fd);
      setUploading(false);

      if (!result.ok) {
        setError(result.error);
        setLocalPreview(null);
        return;
      }

      onLogoUrlChange(result.logoUrl);
      setLocalPreview(null);
      return;
    }

    onLogoFileChange?.(file);
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    void handleFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500">Logo</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={onFileChange}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors",
          uploading ? "cursor-wait opacity-70" : "hover:bg-slate-100",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Téléversement…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {sponsorId ? "Changer le logo" : "Téléverser un logo"}
          </>
        )}
      </button>
      <p className="text-[10px] text-slate-400 leading-relaxed">
        PNG, JPEG, WebP ou GIF — max. 2 Mo. Fond transparent conseillé pour l&apos;écran TV.
      </p>
      {!sponsorId && logoFile ? (
        <p className="text-[10px] text-emerald-600 font-medium">
          Fichier prêt : {logoFile.name}
        </p>
      ) : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {previewUrl ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="h-14 w-24 shrink-0 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Aperçu logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          {logoUrl.trim() ? (
            <p className="text-[10px] text-slate-400 break-all line-clamp-2">{logoUrl.trim()}</p>
          ) : null}
        </div>
      ) : null}
      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-slate-500">
          Ou coller une URL externe (avancé)
        </summary>
        <div className="border-t border-slate-100 p-3">
          <div className="relative">
            <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="url"
              name="logo_url"
              value={logoUrl}
              onChange={(e) => onLogoUrlChange(e.target.value)}
              placeholder="https://…/logo.png"
              className={cn(adminInputClassName, "pl-10")}
            />
          </div>
        </div>
      </details>
    </div>
  );
}

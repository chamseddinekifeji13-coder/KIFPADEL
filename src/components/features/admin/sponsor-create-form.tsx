"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminInputClassName } from "@/components/features/admin/admin-form-styles";
import { SponsorLogoField } from "@/components/features/admin/sponsor-logo-field";
import { adminCreateSponsorAction } from "@/modules/sponsors/actions";

type SponsorCreateFormProps = {
  locale: string;
};

export function SponsorCreateForm({ locale }: SponsorCreateFormProps) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = event.currentTarget;
    const fd = new FormData(form);
    fd.set("locale", locale);
    if (logoFile) {
      fd.set("logo_file", logoFile);
    }

    try {
      await adminCreateSponsorAction(fd);
      setLogoUrl("");
      setLogoFile(null);
      form.reset();
      router.refresh();
    } catch {
      setError("Échec de la création. Réessayez.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2 grid gap-1">
        <label htmlFor="sponsor-name" className="text-xs font-bold text-slate-500">
          Nom *
        </label>
        <input
          id="sponsor-name"
          name="name"
          required
          className={adminInputClassName}
        />
      </div>
      <div className="md:col-span-2">
        <SponsorLogoField
          locale={locale}
          logoUrl={logoUrl}
          onLogoUrlChange={setLogoUrl}
          logoFile={logoFile}
          onLogoFileChange={setLogoFile}
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor="sponsor-website" className="text-xs font-bold text-slate-500">
          Site web
        </label>
        <input id="sponsor-website" name="website_url" className={adminInputClassName} />
      </div>
      <div className="grid gap-1">
        <label htmlFor="sponsor-position" className="text-xs font-bold text-slate-500">
          Position (tri)
        </label>
        <input
          id="sponsor-position"
          name="position"
          type="number"
          defaultValue={0}
          className={adminInputClassName}
        />
      </div>
      {error ? (
        <p className="md:col-span-2 text-xs text-rose-600">{error}</p>
      ) : null}
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="h-11 px-6 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Création…" : "Créer"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminInputClassName } from "@/components/features/admin/admin-form-styles";
import { SponsorLogoField } from "@/components/features/admin/sponsor-logo-field";
import { adminUpdateSponsorAction } from "@/modules/sponsors/actions";
import type { SponsorRow } from "@/modules/sponsors/repository";

type SponsorEditFormProps = {
  locale: string;
  sponsor: SponsorRow;
};

export function SponsorEditForm({ locale, sponsor }: SponsorEditFormProps) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(sponsor.logo_url ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = event.currentTarget;
    const fd = new FormData(form);
    fd.set("locale", locale);
    fd.set("id", sponsor.id);
    fd.set("logo_url", logoUrl.trim());

    try {
      await adminUpdateSponsorAction(fd);
      router.refresh();
    } catch {
      setError("Échec de la mise à jour. Réessayez.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="grid gap-1">
        <label htmlFor={`name-${sponsor.id}`} className="text-[10px] font-bold uppercase text-slate-500">
          Nom
        </label>
        <input
          id={`name-${sponsor.id}`}
          name="name"
          defaultValue={sponsor.name}
          required
          className={adminInputClassName}
        />
      </div>
      <SponsorLogoField
        locale={locale}
        sponsorId={sponsor.id}
        logoUrl={logoUrl}
        onLogoUrlChange={setLogoUrl}
      />
      <div className="grid gap-1">
        <label htmlFor={`website-${sponsor.id}`} className="text-[10px] font-bold uppercase text-slate-500">
          Site
        </label>
        <input
          id={`website-${sponsor.id}`}
          name="website_url"
          defaultValue={sponsor.website_url ?? ""}
          className={adminInputClassName}
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor={`pos-${sponsor.id}`} className="text-[10px] font-bold uppercase text-slate-500">
          Position
        </label>
        <input
          id={`pos-${sponsor.id}`}
          name="position"
          type="number"
          defaultValue={sponsor.position}
          className={adminInputClassName}
        />
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-9 px-4 rounded-lg bg-gold text-black text-xs font-bold disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Mettre à jour"}
      </button>
    </form>
  );
}

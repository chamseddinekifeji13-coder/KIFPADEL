"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { createTournamentSoloEntryAction } from "@/modules/tournaments/actions";

type Props = {
  locale: string;
  tournamentId: string;
  canRegister: boolean;
};

export function TournamentSoloRegisterForm({ locale, tournamentId, canRegister }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!canRegister) {
    return null;
  }

  const onRegister = async () => {
    setError("");
    setPending(true);
    const res = await createTournamentSoloEntryAction({ locale, tournamentId });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white">
      <h2 className="text-sm font-bold text-slate-800">Inscription Américano (solo)</h2>
      <p className="text-xs text-slate-500">
        Tu seras associé à différents partenaires à chaque rotation. Le classement se fait sur les
        points marqués.
      </p>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={onRegister}
        className={cn(
          "w-full rounded-xl py-3 text-sm font-bold",
          pending ? "bg-slate-200 text-slate-500" : "bg-sky-600 text-white hover:bg-sky-700",
        )}
      >
        {pending ? "Inscription…" : "M’inscrire"}
      </button>
    </div>
  );
}

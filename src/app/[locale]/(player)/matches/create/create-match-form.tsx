"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { MapPin, Calendar, Trophy, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type Club } from "@/modules/clubs/repository";
import { createOpenMatchAction } from "@/modules/matches/actions";
import { ClubDirectionsButton } from "@/components/features/clubs/club-directions-button";

interface CreateMatchFormProps {
  clubs: Club[];
  locale: string;
}

function toLocalDateInputValue(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Prochain créneau 15 min strictement après maintenant (évite validation « passé »). */
function defaultTimeValue() {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 2);
  let mins = d.getMinutes();
  const step = 15;
  const rounded = Math.ceil(mins / step) * step;
  if (rounded >= 60) {
    d.setHours(d.getHours() + 1);
    d.setMinutes(rounded - 60);
  } else {
    d.setMinutes(rounded);
  }
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function CreateMatchForm({ clubs, locale }: CreateMatchFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClub, setSelectedClub] = useState("");
  const [date, setDate] = useState(() => toLocalDateInputValue());
  const [time, setTime] = useState(() => defaultTimeValue());
  const [formError, setFormError] = useState("");

  const quickTimes = ["09:00", "12:00", "16:00", "18:00", "20:00", "21:30"];
  const minDate = toLocalDateInputValue();
  const selectedClubEntity = clubs.find((c) => c.id === selectedClub);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedClub || !date || !time) {
      setFormError("Merci de remplir le club, la date et l'heure.");
      return;
    }

    const startsAtLocal = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAtLocal.getTime())) {
      setFormError("Date ou heure invalide.");
      return;
    }

    if (startsAtLocal.getTime() < Date.now() - 30_000) {
      setFormError("Choisis un créneau futur.");
      return;
    }

    const selectedClubData = clubs.find((club) => club.id === selectedClub);
    const payload = {
      clubId: selectedClub,
      clubName: selectedClubData?.name ?? "",
      date,
      time,
      startsAt: startsAtLocal.toISOString(),
    };

    setIsSubmitting(true);
    try {
      const result = await createOpenMatchAction({
        locale,
        clubId: selectedClub,
        startsAtIso: startsAtLocal.toISOString(),
      });

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      try {
        sessionStorage.setItem("kifpadel:lastCreatedMatchDraft", JSON.stringify(payload));
      } catch {
        /* navigation privée / quota */
      }

      const query = new URLSearchParams({
        created: "1",
        matchId: result.matchId,
        clubId: payload.clubId,
        date: payload.date,
        time: payload.time,
      });
      router.push(`/${locale}/play-now?${query.toString()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step 1: Club */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
          <MapPin className="h-4 w-4" />
          Étape 1 : Choisir le club
        </div>
        <div className="grid gap-3">
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => setSelectedClub(club.id)}
              className={cn(
                "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                selectedClub === club.id 
                  ? "bg-sky-50 border-sky-600 ring-4 ring-sky-50" 
                  : "bg-white border-slate-100 hover:border-slate-200"
              )}
            >
              <div>
                <p className="font-bold text-slate-900">{club.name}</p>
                <p className="text-xs text-slate-500">{club.city}</p>
              </div>
              {selectedClub === club.id && (
                <div className="h-6 w-6 rounded-full bg-sky-600 flex items-center justify-center text-white">
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </button>
          ))}
        </div>
        {selectedClubEntity ? (
          <div className="pt-2">
            <ClubDirectionsButton
              club={{
                name: selectedClubEntity.name,
                city: selectedClubEntity.city,
                address: selectedClubEntity.address ?? undefined,
              }}
              label="Itinéraire vers ce club"
              className="w-full sm:w-auto border-slate-200"
            />
          </div>
        ) : null}
      </div>

      {/* Step 2: Date & Time */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
          <Calendar className="h-4 w-4" />
          Étape 2 : Date & Heure
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="match-date" className="text-[10px] font-bold text-slate-500 uppercase px-1">Date</label>
            <input 
              id="match-date"
              type="date" 
              required
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="match-time" className="text-[10px] font-bold text-slate-500 uppercase px-1">Heure</label>
            <input 
              id="match-time"
              type="time" 
              required
              step={900}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickTimes.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setTime(slot)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
                time === slot
                  ? "border-sky-600 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              {slot}
            </button>
          ))}
        </div>
        {formError ? (
          <p className="text-xs font-semibold text-rose-600">{formError}</p>
        ) : null}
        <p className="text-[11px] text-slate-500">
          Sélection actuelle: {date || "—"} {time || "—"}
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl",
          isSubmitting ? "bg-slate-100 text-slate-400" : 
          "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200 active:scale-[0.98]"
        )}
      >
        {isSubmitting ? (
          <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-900 animate-spin rounded-full" />
        ) : (
          <>
            Confirmer & Publier le match
            <Trophy className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}

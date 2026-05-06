"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { MapPin, Calendar, Trophy, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type Club } from "@/modules/clubs/repository";

interface CreateMatchFormProps {
  clubs: Club[];
  locale: string;
}

export function CreateMatchForm({ clubs, locale }: CreateMatchFormProps) {
  const router = useRouter();
  const [selectedClub, setSelectedClub] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState(() => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const quickTimes = ["09:00", "12:00", "16:00", "18:00", "20:00", "21:30"];

  const handleSubmit = (e: React.FormEvent) => {
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

    if (startsAtLocal.getTime() <= Date.now()) {
      setFormError("Choisis un créneau futur.");
      return;
    }

    setIsLoading(true);
    const selectedClubData = clubs.find((club) => club.id === selectedClub);
    const payload = {
      clubId: selectedClub,
      clubName: selectedClubData?.name ?? "",
      date,
      time,
      startsAt: startsAtLocal.toISOString(),
    };

    // Keep a trace so the next screen can consume latest match draft.
    sessionStorage.setItem("kifpadel:lastCreatedMatchDraft", JSON.stringify(payload));
    const query = new URLSearchParams({
      created: "1",
      clubId: payload.clubId,
      date: payload.date,
      time: payload.time,
    });
    router.push(`/${locale}/play-now?${query.toString()}`);
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
              min={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
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
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
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
      </div>

      <button
        type="submit"
        disabled={!selectedClub || !date || !time || isLoading}
        className={cn(
          "w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl",
          isLoading ? "bg-slate-100 text-slate-400" : 
          "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200 active:scale-[0.98]"
        )}
      >
        {isLoading ? (
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

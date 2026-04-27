"use client";

import { useState } from "react";
import { TimeSlotGrid } from "@/components/features/bookings/time-slot-grid";
import { type TimeSlot } from "@/modules/bookings/availability-service";
import { ChevronRight } from "lucide-react";

interface TimeContainerProps {
  slots: TimeSlot[];
  date: string;
}

export function TimeContainer({ slots, date }: TimeContainerProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);


  return (
    <div className="space-y-6">
      <TimeSlotGrid
        slots={slots}
        selectedSlot={selectedSlot}
        onSelect={setSelectedSlot}
      />

      {/* Floating Action Button / Summary when selected */}
      {selectedSlot && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 animate-in slide-in-from-bottom-2 duration-300">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Résumé</span>
              <span className="text-sm font-bold text-slate-900">
                {selectedSlot} • {new Date(date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}
              </span>
            </div>
            
            <button
              onClick={() => alert("Réservation en cours (Action bientôt disponible)")}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              Réserver pour 40 DT
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

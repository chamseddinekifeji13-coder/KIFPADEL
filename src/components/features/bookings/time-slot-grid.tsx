import { cn } from "@/lib/utils/cn";
import { type TimeSlot } from "@/modules/bookings/availability-service";

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelect: (time: string) => void;
}

export function TimeSlotGrid({ slots, selectedSlot, onSelect }: TimeSlotGridProps) {
  // Group slots by time of day
  const morning = slots.filter(s => parseInt(s.start.split(":")[0]) < 12);
  const afternoon = slots.filter(s => parseInt(s.start.split(":")[0]) >= 12 && parseInt(s.start.split(":")[0]) < 18);
  const evening = slots.filter(s => parseInt(s.start.split(":")[0]) >= 18);

  const renderGroup = (title: string, groupSlots: TimeSlot[]) => (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {groupSlots.map((slot) => (
          <button
            key={slot.start}
            disabled={!slot.isAvailable}
            onClick={() => onSelect(slot.start)}
            className={cn(
              "py-3 rounded-xl text-sm font-bold border transition-all duration-200",
              slot.isAvailable 
                ? selectedSlot === slot.start
                  ? "bg-sky-600 border-sky-600 text-white shadow-lg shadow-sky-200 scale-[1.02]"
                  : "bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-60"
            )}
          >
            {slot.start}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {morning.length > 0 && renderGroup("Matin", morning)}
      {afternoon.length > 0 && renderGroup("Après-midi", afternoon)}
      {evening.length > 0 && renderGroup("Soir", evening)}
    </div>
  );
}

import { cn } from "@/lib/utils/cn";
import { type TimeSlot } from "@/modules/bookings/availability-service";

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelect: (time: string) => void;
}

export function TimeSlotGrid({ slots, selectedSlot, onSelect }: TimeSlotGridProps) {
  // Group slots by time of day
  const morning = slots.filter(s => parseInt(s.time.split(":")[0]) < 12);
  const afternoon = slots.filter(s => parseInt(s.time.split(":")[0]) >= 12 && parseInt(s.time.split(":")[0]) < 18);
  const evening = slots.filter(s => parseInt(s.time.split(":")[0]) >= 18);

  const renderGroup = (title: string, groupSlots: TimeSlot[]) => (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-widest">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {groupSlots.map((slot) => (
          <button
            key={slot.time}
            disabled={!slot.isAvailable}
            onClick={() => onSelect(slot.time)}
            className={cn(
              "py-3 rounded-xl text-sm font-bold border-2 transition-all duration-200",
              slot.isAvailable 
                ? selectedSlot === slot.time
                  ? "bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]"
                  : "bg-[var(--surface)] border-[var(--border)] text-white hover:border-[var(--foreground-muted)]"
                : "bg-[var(--background)] border-[var(--border)] text-[var(--foreground-muted)] cursor-not-allowed opacity-40"
            )}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {morning.length > 0 && renderGroup("Matin", morning)}
      {afternoon.length > 0 && renderGroup("Après-midi", afternoon)}
      {evening.length > 0 && renderGroup("Soir", evening)}
    </div>
  );
}

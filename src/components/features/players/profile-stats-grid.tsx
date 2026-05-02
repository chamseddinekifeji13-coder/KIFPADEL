type StatItem = {
  label: string;
  value: string;
};

type ProfileStatsGridProps = {
  items: StatItem[];
};

export function ProfileStatsGrid({ items }: ProfileStatsGridProps) {
  return (
    <section className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-center"
        >
          <p className="text-2xl font-black tracking-tight text-white">{item.value}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/50">{item.label}</p>
        </article>
      ))}
    </section>
  );
}

type StatItem = {
  label: string;
  value: string;
};

type ProfileStatsGridProps = {
  items: StatItem[];
};

export function ProfileStatsGrid({ items }: ProfileStatsGridProps) {
  return (
    <section className="grid grid-cols-3 gap-2 px-2">
      {items.map((item) => (
        <article
          key={item.label}
          className="flex flex-col items-center justify-center py-4"
        >
          <p className="text-2xl font-black tracking-tight text-white">{item.value}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-foreground-muted text-center leading-tight">
            {item.label}
          </p>
        </article>
      ))}
    </section>
  );
}

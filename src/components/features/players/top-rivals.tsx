type RivalItem = {
  name: string;
  wins: number;
  losses: number;
  encounters?: number;
};

type TopRivalsProps = {
  rivals: RivalItem[];
};

export function TopRivals({ rivals }: TopRivalsProps) {
  return (
    <section className="space-y-6 flex flex-col items-center w-full">
      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Top Rivals</h2>

      {rivals.length === 0 ? (
        <p className="text-[10px] uppercase tracking-widest text-foreground-muted italic">
          En attente de matchs...
        </p>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full">
          {rivals.map((rival, index) => (
            <article
              key={`${rival.name}-${index}`}
              className="flex items-center gap-2 group cursor-default"
            >
              <span className="text-sm font-bold text-white group-hover:text-gold transition-colors">
                {rival.name}
              </span>
              <span className="text-sm font-black text-gold">
                ({rival.encounters ?? 0} matchs)
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

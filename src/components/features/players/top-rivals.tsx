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
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-amber-200">Top Rivals</h2>
      </div>

      {rivals.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <p className="text-sm text-white/70">Aucun rival enregistré pour le moment.</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/40">
            Les prochains matchs alimenteront cette section.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rivals.map((rival, index) => (
            <article
              key={`${rival.name}-${index}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-white">{rival.name}</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/45">
                  Head to head · {rival.encounters ?? rival.wins + rival.losses} matchs
                </p>
              </div>
              <p className="text-sm font-bold text-amber-200">
                {rival.wins} - {rival.losses}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

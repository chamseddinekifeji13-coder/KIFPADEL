"use client";

interface TopRivalsProps {
  rivals: Array<{
    name: string;
    matchesVs: number;
    wins: number;
    losses: number;
    eloVs: number;
  }>;
}

export function TopRivals({ rivals }: TopRivalsProps) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
      <h3 className="text-xs font-bold text-[var(--gold)] uppercase tracking-widest mb-4">
        Top Rivaux
      </h3>
      <div className="space-y-3">
        {rivals.map((rival, idx) => (
          <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{rival.name}</p>
              <p className="text-xs text-[var(--foreground-muted)]">
                {rival.wins}V - {rival.losses}D
              </p>
            </div>
            <div className="text-right ml-4">
              <p className="text-lg font-black text-[var(--gold)]">{rival.matchesVs}</p>
              <p className="text-[10px] text-[var(--foreground-muted)] uppercase">Matchs</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

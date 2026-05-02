type PlayerProfileCardProps = {
  playerName: string;
  eloRank: number;
};

export function PlayerProfileCard({ playerName, eloRank }: PlayerProfileCardProps) {
  return (
    <section className="space-y-5 text-center">
      <div className="space-y-1">
        <p className="text-xs font-bold tracking-[0.35em] text-amber-300/90">KIFPADEL</p>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">Player Performance Card</p>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          {playerName}
        </h1>
        <p className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1 text-xs font-bold tracking-[0.2em] text-amber-200">
          ELO RANK: {String(eloRank).padStart(4, "0")}
        </p>
      </div>
    </section>
  );
}

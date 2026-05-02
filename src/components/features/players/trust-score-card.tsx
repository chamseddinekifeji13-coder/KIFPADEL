type TrustScoreCardProps = {
  trustScore: number;
  reliabilityStatus: string;
};

export function TrustScoreCard({ trustScore, reliabilityStatus }: TrustScoreCardProps) {
  const normalized = Math.max(0, Math.min(100, trustScore));

  return (
    <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-[0.18em] text-amber-200">TRUST SCORE</p>
        <p className="text-xs uppercase tracking-[0.15em] text-white/65">{reliabilityStatus}</p>
      </div>
      <p className="mt-2 text-2xl font-black text-white">{normalized}/100</p>
    </section>
  );
}

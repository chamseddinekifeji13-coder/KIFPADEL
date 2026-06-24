export default function MatchDetailsLoading() {
  return (
    <div className="flex-1 max-w-lg mx-auto p-4 space-y-6 animate-pulse" aria-busy="true" aria-label="Chargement du match">
      <div className="h-4 w-36 rounded bg-white/10" />
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-white/10" />
        <div className="h-4 w-56 rounded bg-white/10" />
        <div className="h-3 w-32 rounded bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 rounded-2xl bg-white/5" />
        <div className="h-28 rounded-2xl bg-white/5" />
      </div>
      <div className="h-48 rounded-2xl bg-white/5" />
    </div>
  );
}

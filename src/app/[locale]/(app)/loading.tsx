export default function AppLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-1 animate-pulse" aria-busy="true" aria-label="Chargement">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white/10" />
          <div className="space-y-2">
            <div className="h-2 w-16 rounded bg-white/10" />
            <div className="h-5 w-28 rounded bg-white/10" />
          </div>
        </div>
        <div className="h-12 w-12 rounded-full bg-white/10" />
      </div>
      <div className="h-48 rounded-[2rem] bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-2xl bg-white/5" />
        <div className="h-28 rounded-2xl bg-white/5" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 rounded-[2rem] bg-white/5" />
        <div className="h-32 rounded-[2rem] bg-white/5" />
      </div>
    </div>
  );
}

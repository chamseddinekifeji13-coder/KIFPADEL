import { AuthStateBadge } from "@/components/features/auth-state-badge";
import { LocaleSwitcher } from "@/components/features/locale-switcher";
import { MainNav } from "@/components/features/main-nav";

type AppShellProps = Readonly<{
  locale: string;
  appName: string;
  tagline: string;
  navLabels: {
    home: string;
    play: string;
    find: string;
    book: string;
    dashboard: string;
  };
  authLabels: {
    guest: string;
    signIn: string;
    signedInAs: string;
    signOut: string;
  };
  children: React.ReactNode;
}>;

export function AppShell({
  locale,
  appName,
  tagline,
  navLabels,
  authLabels,
  children,
}: AppShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-4 md:max-w-4xl">
      <header className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-sky-700">{appName}</p>
            <p className="text-xs text-slate-600">{tagline}</p>
          </div>
          <div className="flex items-center gap-3">
            <AuthStateBadge locale={locale} labels={authLabels} />
            <LocaleSwitcher currentLocale={locale} />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3 pb-1">{children}</main>

      <MainNav locale={locale} labels={navLabels} />
    </div>
  );
}

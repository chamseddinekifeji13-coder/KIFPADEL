import { MainNav } from "@/components/features/main-nav";
import { LocaleSwitcher } from "@/components/features/locale-switcher";

type AppShellProps = Readonly<{
  locale: string;
  appName: string;
  tagline: string;
  navLabels: {
    home: string;
    play: string;
    find: string;
    book: string;
    profile: string;
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
  navLabels,
  children,
}: AppShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl lg:max-w-7xl min-h-dvh flex-col bg-background">
      <div className="sticky top-0 z-50 flex justify-end px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] max-md:backdrop-blur-none md:backdrop-blur-md">
        <LocaleSwitcher currentLocale={locale} />
      </div>

      <main className="flex-1 flex flex-col p-4 pb-[calc(8.75rem+env(safe-area-inset-bottom,0px))] max-md:pb-[calc(9.25rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>

      {/* Modern Floating Bottom Navigation */}
      <MainNav locale={locale} labels={navLabels} />
    </div>
  );
}

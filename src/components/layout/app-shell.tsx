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
  navLabels,
  children,
}: AppShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg min-h-screen flex-col bg-background border-x border-gold/30 shadow-gold/20">
      <div className="sticky top-0 z-50 flex justify-end bg-background/90 px-4 py-4 backdrop-blur border-b border-gold/20">
        <LocaleSwitcher currentLocale={locale} />
      </div>

      {/* 
          Main Content Area 
          We use a larger bottom padding to accommodate the floating nav 
      */}
      <main className="flex-1 flex flex-col items-center text-center p-4 pb-32 animate-in fade-in duration-700 [&_h1]:text-center [&_h2]:text-center [&_h3]:text-center">
        <div className="w-full space-y-8 flex flex-col items-center">
          {children}
        </div>
      </main>

      {/* Modern Floating Bottom Navigation */}
      <MainNav locale={locale} labels={navLabels} />
    </div>
  );
}

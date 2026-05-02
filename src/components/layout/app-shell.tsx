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
  navLabels,
  children,
}: AppShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg min-h-screen flex-col bg-background selection:bg-gold/20 italic-selection text-foreground">
      {/* 
          Main Content Area 
          We use a larger bottom padding to accommodate the floating nav 
      */}
      <main className="flex-1 flex flex-col p-4 pb-32 animate-in fade-in duration-700">
        {children}
      </main>

      {/* Modern Floating Bottom Navigation */}
      <MainNav locale={locale} labels={navLabels} />
    </div>
  );
}

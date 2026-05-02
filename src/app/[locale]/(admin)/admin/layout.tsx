import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/admin`);
  }

  // Check if user is platform admin
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");

  if (!isAdmin) {
    // If not admin, redirect to home or show error
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="font-black tracking-tighter text-xl">
            KIF<span className="text-gold">PADEL</span> <span className="text-xs uppercase bg-gold text-black px-2 py-0.5 rounded ml-2">Admin</span>
          </h1>
          <nav className="flex gap-6 text-sm font-bold">
            <a href={`/${locale}/admin/clubs`} className="hover:text-gold transition-colors">Clubs</a>
            <a href={`/${locale}/admin/players`} className="hover:text-gold transition-colors">Joueurs</a>
            <a href={`/${locale}/admin/sponsors`} className="hover:text-gold transition-colors">Sponsors</a>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}

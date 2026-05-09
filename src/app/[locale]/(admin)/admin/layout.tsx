import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/modules/auth/actions/sign-out";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const dictionary = await getDictionary(locale);
  const a = dictionary.admin;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/admin`);
  }

  const { data: isSa, error: rpcError } = await supabase.rpc("is_super_admin");

  if (rpcError || isSa !== true) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-3">
          <h1 className="font-black tracking-tighter text-xl">
            KIF<span className="text-gold">PADEL</span>{" "}
            <span className="text-xs uppercase bg-gold text-black px-2 py-0.5 rounded ml-2">{a.badge}</span>
          </h1>
          <nav className="flex flex-wrap gap-4 md:gap-6 text-sm font-bold items-center">
            <a href={`/${locale}/admin`} className="hover:text-gold transition-colors">
              {a.navDashboard}
            </a>
            <a href={`/${locale}/admin/clubs`} className="hover:text-gold transition-colors">
              {a.navClubs}
            </a>
            <a href={`/${locale}/admin/players`} className="hover:text-gold transition-colors">
              {a.navPlayers}
            </a>
            <a href={`/${locale}/admin/incidents`} className="hover:text-gold transition-colors">
              {a.navIncidents}
            </a>
            <a href={`/${locale}/admin/tournaments`} className="hover:text-gold transition-colors">
              {a.navTournaments}
            </a>
            <a href={`/${locale}/admin/sponsors`} className="hover:text-gold transition-colors">
              {a.navSponsors}
            </a>
            <a href={`/${locale}/admin/audit-log`} className="hover:text-gold transition-colors">
              {a.navAuditLog}
            </a>
            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="hover:text-gold transition-colors">
                {a.signOut}
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

function parseSuperAdminCookie(raw: string | undefined) {
  if (!raw) return null;
  const [userId, signature] = raw.split(".");
  if (!userId || !signature) return null;
  return { userId, signature };
}

function isValidSuperAdminCookie(raw: string | undefined, userId: string) {
  const secret = process.env.SUPER_ADMIN_ONBOARDING_KEY?.trim();
  if (!secret) return false;

  const parsed = parseSuperAdminCookie(raw);
  if (!parsed || parsed.userId !== userId) return false;

  const expected = createHmac("sha256", secret).update(userId).digest("hex");
  const a = Buffer.from(parsed.signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const cookieStore = await cookies();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/admin`);
  }

  // Check if user is platform admin
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");

  let hasGlobalSuperAdminRole = false;
  if (!isAdmin) {
    const byId = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .maybeSingle();

    if (byId.data?.global_role === "super_admin") {
      hasGlobalSuperAdminRole = true;
    } else {
      const byUserId = await supabase
        .from("profiles")
        .select("global_role")
        .eq("user_id", user.id)
        .maybeSingle();
      hasGlobalSuperAdminRole = byUserId.data?.global_role === "super_admin";
    }
  }

  const hasSignedSuperAdminCookie = isValidSuperAdminCookie(
    cookieStore.get("kif_super_admin")?.value,
    user.id,
  );

  if (!isAdmin && !hasGlobalSuperAdminRole && !hasSignedSuperAdminCookie) {
    redirect(`/${locale}/onboarding/super-admin`);
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

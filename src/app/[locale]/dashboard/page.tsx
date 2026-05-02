import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { requireUser } from "@/modules/auth/guards/require-user";

type DashboardPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  await requireUser({ locale, redirectPath: "profile" });
  redirect(`/${locale}/profile`);
}

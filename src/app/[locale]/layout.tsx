import { notFound } from "next/navigation";
import { LOCALES, isLocale } from "@/i18n/config";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <>{children}</>;
}

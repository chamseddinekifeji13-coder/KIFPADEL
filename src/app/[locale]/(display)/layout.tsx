import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";

type Props = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export default async function DisplayLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white antialiased">
      {children}
    </div>
  );
}

import Link from "next/link";

type IntentCardProps = {
  href: string;
  title: string;
  description: string;
};

export function IntentCard({ href, title, description }: IntentCardProps) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-(--surface) p-4 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow"
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-xs text-slate-600">{description}</p>
    </Link>
  );
}

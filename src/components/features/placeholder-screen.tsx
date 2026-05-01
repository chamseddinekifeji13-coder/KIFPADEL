import { Construction } from "lucide-react";

type PlaceholderScreenProps = {
  title: string;
  subtitle: string;
};

export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  return (
    <section className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center mb-4">
        <Construction className="h-6 w-6 text-[var(--gold)]" />
      </div>
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">{subtitle}</p>
    </section>
  );
}

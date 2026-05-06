import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type IntentCardProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  variant?: "primary" | "secondary" | "accent";
};

export function IntentCard({ href, title, description, icon: Icon, variant = "primary" }: IntentCardProps) {
  const variants = {
    primary: "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--gold)]/30",
    secondary: "bg-[var(--gold)]/10 border-[var(--gold)]/20 hover:bg-[var(--gold)]/20",
    accent: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
  };

  const iconColors = {
    primary: "bg-[var(--gold)]/10 text-[var(--gold)]",
    secondary: "bg-[var(--gold)] text-black",
    accent: "bg-emerald-500/20 text-emerald-400"
  };

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border p-5 transition-all duration-300",
        variants[variant]
      )}
    >
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 duration-300", iconColors[variant])}>
        <Icon className="h-6 w-6" />
      </div>
      
      <div className="flex-1 space-y-1">
        <h3 className="font-bold tracking-tight text-white">
          {title}
        </h3>
        <p className="text-xs leading-relaxed text-[var(--foreground-muted)]">
          {description}
        </p>
      </div>

      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--surface-elevated)] group-hover:bg-[var(--gold)]/10 transition-all">
        <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)] group-hover:text-[var(--gold)] transition-colors group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

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
    secondary: "bg-[var(--gold)] border-[var(--gold)] text-black hover:bg-[var(--gold-dark)]",
    accent: "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--gold)]/5"
  };

  const iconColors = {
    primary: "bg-[var(--gold)]/10 text-[var(--gold)]",
    secondary: "bg-black/10 text-black",
    accent: "bg-[var(--gold)]/10 text-[var(--gold)]"
  };

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col items-center text-center gap-4 rounded-[2rem] border p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--gold)]/10 hover:-translate-y-1 active:scale-[0.98]",
        variants[variant]
      )}
    >
      <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl transition-all group-hover:scale-110 duration-500", iconColors[variant])}>
        <Icon className="h-8 w-8" />
      </div>
      
      <div className="space-y-2">
        <h3 className={cn("text-lg font-black uppercase tracking-tight", variant === "secondary" ? "text-black" : "text-white")}>
          {title}
        </h3>
        <p className={cn("text-sm leading-relaxed max-w-[200px] mx-auto font-medium", variant === "secondary" ? "text-black/70" : "text-[var(--foreground-muted)]")}>
          {description}
        </p>
      </div>

      <div className={cn("mt-2 h-10 w-10 flex items-center justify-center rounded-full transition-all", variant === "secondary" ? "bg-black/10 group-hover:bg-black/20" : "bg-[var(--gold)]/10 group-hover:bg-[var(--gold)] group-hover:text-black text-[var(--gold)]")}>
        <ChevronRight className={cn("h-5 w-5 transition-transform group-hover:translate-x-0.5", variant === "secondary" ? "text-black" : "text-[var(--gold)] group-hover:text-black")} />
      </div>
    </Link>
  );
}

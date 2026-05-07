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
    primary: "bg-surface-elevated hover:bg-surface hover:shadow-gold-strong border-white/5",
    secondary: "bg-gold text-black hover:bg-gold-light shadow-gold",
    accent: "bg-surface-elevated hover:bg-gold/10"
  };

  const iconColors = {
    primary: "bg-gold/10 text-gold",
    secondary: "bg-black/10 text-black",
    accent: "bg-gold/10 text-gold"
  };

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-6 rounded-[2rem] border p-6 transition-all duration-500 hover:shadow-gold-strong hover:-translate-y-1 active:scale-[0.98]",
        variants[variant]
      )}
    >
      <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl transition-all group-hover:scale-110 duration-500", iconColors[variant])}>
        <Icon className="h-8 w-8" />
      </div>
      
      <div className="flex-1 space-y-1 text-left">
        <h3 className={cn("text-lg font-black uppercase tracking-tight", variant === "secondary" ? "text-black" : "text-white group-hover:text-gold transition-colors")}>
          {title}
        </h3>
        <p className={cn("text-xs leading-relaxed font-medium line-clamp-2", variant === "secondary" ? "text-black/70" : "text-muted group-hover:text-white/80 transition-colors")}>
          {description}
        </p>
      </div>

      <div className={cn("mt-2 h-10 w-10 flex items-center justify-center rounded-full transition-all", variant === "secondary" ? "bg-black/10 group-hover:bg-black/20" : "bg-[var(--gold)]/10 group-hover:bg-[var(--gold)] group-hover:text-black text-[var(--gold)]")}>
        <ChevronRight className={cn("h-5 w-5 transition-transform group-hover:translate-x-0.5", variant === "secondary" ? "text-black" : "text-[var(--gold)] group-hover:text-black")} />
      </div>
    </Link>
  );
}

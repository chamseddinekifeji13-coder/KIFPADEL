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
    primary: "bg-surface border-gold/10 hover:border-gold/30 shadow-sm",
    secondary: "bg-gold border-gold text-black hover:bg-gold-light",
    accent: "bg-surface content-white border-gold/10 hover:bg-gold/5"
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
        "group relative flex items-center gap-4 rounded-3xl border p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-gold/10 hover:-translate-y-1 active:scale-[0.98]",
        variants[variant]
      )}
    >
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 duration-300", iconColors[variant])}>
        <Icon className="h-6 w-6" />
      </div>
      
      <div className="flex-1 space-y-1">
        <h3 className={cn("font-bold tracking-tight", variant === "secondary" ? "text-black" : "text-white")}>
          {title}
        </h3>
        <p className={cn("text-xs leading-relaxed opacity-70", variant === "secondary" ? "text-black/70" : "text-white/60")}>
          {description}
        </p>
      </div>

      <div className={cn("h-8 w-8 flex items-center justify-center rounded-full transition-all", variant === "secondary" ? "bg-black/10 group-hover:bg-black/20" : "bg-gold/10 group-hover:bg-gold group-hover:text-black text-gold")}>
        <ChevronRight className={cn("h-4 w-4 transition-transform group-hover:translate-x-0.5", variant === "secondary" ? "text-black" : "text-gold group-hover:text-black")} />
      </div>
    </Link>
  );
}

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
    primary: "bg-white border-slate-100 hover:border-sky-200 shadow-sm",
    secondary: "bg-slate-900 border-slate-800 text-white hover:bg-slate-800",
    accent: "bg-emerald-50 content-emerald-900 border-emerald-100 hover:bg-emerald-100"
  };

  const iconColors = {
    primary: "bg-sky-50 text-sky-600",
    secondary: "bg-white/10 text-white",
    accent: "bg-white text-emerald-600"
  };

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-4 rounded-3xl border p-5 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/5",
        variants[variant]
      )}
    >
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 duration-300", iconColors[variant])}>
        <Icon className="h-6 w-6" />
      </div>
      
      <div className="flex-1 space-y-1">
        <h3 className={cn("font-bold tracking-tight", variant === "secondary" ? "text-white" : "text-slate-900")}>
          {title}
        </h3>
        <p className={cn("text-xs leading-relaxed opacity-70", variant === "secondary" ? "text-slate-300" : "text-slate-500")}>
          {description}
        </p>
      </div>

      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-50 group-hover:bg-white group-hover:shadow-sm transition-all">
        <ChevronRight className={cn("h-4 w-4 transition-transform group-hover:translate-x-0.5", variant === "secondary" ? "text-slate-900" : "text-slate-400")} />
      </div>
    </Link>
  );
}

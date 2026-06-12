import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all duration-300 border",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-elevated text-white",
        secondary: "border-white/10 bg-white/5 text-foreground-muted",
        destructive: "border-danger/20 bg-danger/10 text-danger",
        outline: "border-border text-foreground-muted",
        success: "border-success/20 bg-success/10 text-success",
        // Catégories P (Tunisie)
        p25: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        p50: "bg-teal-500/10 border-teal-500/30 text-teal-300",
        p100: "bg-sky-500/10 border-sky-500/30 text-sky-300",
        p250: "bg-violet-500/10 border-violet-500/30 text-violet-300",
        p500: "bg-gold/10 border-gold/30 text-gold shadow-gold",
        p1000: "bg-rose-500/10 border-rose-400/30 text-rose-300",
        // Legacy (affichage rétrocompat.)
        bronze: "bg-[#cd7f32]/10 border-[#cd7f32]/30 text-[#cd7f32]",
        silver: "bg-slate-400/10 border-slate-400/30 text-slate-300",
        gold: "bg-gold/10 border-gold/30 text-gold shadow-gold",
        platinum: "bg-sky-400/10 border-sky-400/30 text-sky-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

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
        // Padel Specific Leagues - Premium Styles
        bronze: "bg-[#cd7f32]/10 border-[#cd7f32]/30 text-[#cd7f32] shadow-[0_0_10px_-3px_rgba(205,127,50,0.3)]",
        silver: "bg-slate-400/10 border-slate-400/30 text-slate-300 shadow-[0_0_10px_-3px_rgba(148,163,184,0.3)]",
        gold: "bg-gold/10 border-gold/30 text-gold shadow-gold",
        platinum: "bg-sky-400/10 border-sky-400/30 text-sky-300 shadow-[0_0_10px_-3px_rgba(56,189,248,0.3)]",
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

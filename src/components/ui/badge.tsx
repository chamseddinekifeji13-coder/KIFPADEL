import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 border",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-900 text-slate-50",
        secondary: "border-transparent bg-slate-100 text-slate-900",
        destructive: "border-transparent bg-rose-500 text-white shadow-sm shadow-rose-200",
        outline: "text-slate-950 border-slate-200",
        success: "border-transparent bg-emerald-500 text-white shadow-sm shadow-emerald-200",
        // Padel Specific Leagues
        bronze: "bg-orange-50 border-orange-200 text-orange-700",
        silver: "bg-slate-50 border-slate-200 text-slate-700",
        gold: "bg-amber-50 border-amber-300 text-amber-700 shadow-sm shadow-amber-200/50",
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

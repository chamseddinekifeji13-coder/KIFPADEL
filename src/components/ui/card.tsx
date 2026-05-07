import { cn } from "@/lib/ui/cn";

type CardProps = Readonly<{
  children: React.ReactNode;
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/5 bg-surface p-6 shadow-premium transition-all duration-500 hover:border-gold/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

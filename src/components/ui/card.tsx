import { cn } from "@/lib/ui/cn";

type CardProps = Readonly<{
  children: React.ReactNode;
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gold/25 bg-surface shadow-premium transition-all duration-300 hover:border-gold/50 hover:shadow-gold",
        className,
      )}
    >
      {children}
    </div>
  );
}

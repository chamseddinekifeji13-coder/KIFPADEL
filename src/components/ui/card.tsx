import { cn } from "@/lib/ui/cn";

type CardProps = Readonly<{
  children: React.ReactNode;
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-premium transition-all duration-300",
        className,
      )}
    >
      {children}
    </div>
  );
}

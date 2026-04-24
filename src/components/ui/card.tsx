import { cn } from "@/lib/ui/cn";

type CardProps = Readonly<{
  children: React.ReactNode;
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <section className={cn("rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100", className)}>
      {children}
    </section>
  );
}

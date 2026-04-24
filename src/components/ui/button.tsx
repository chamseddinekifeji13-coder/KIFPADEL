import { cn } from "@/lib/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = Readonly<{
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: ButtonVariant;
  className?: string;
}>;

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-600 text-white shadow-sm hover:bg-sky-700 active:bg-sky-800",
  secondary:
    "bg-slate-100 text-slate-800 shadow-sm hover:bg-slate-200 active:bg-slate-300",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200",
};

export function Button({
  children,
  type = "button",
  variant = "primary",
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

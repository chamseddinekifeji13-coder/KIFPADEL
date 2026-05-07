import { cn } from "@/lib/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "glass" | "outline";

type ButtonProps = Readonly<{
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: ButtonVariant;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}>;

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gold text-black shadow-gold hover:bg-gold-light active:scale-95",
  secondary:
    "bg-surface-elevated text-white border border-gold/30 hover:bg-surface hover:border-gold/50 active:scale-95",
  outline:
    "bg-transparent text-gold border border-gold/50 hover:bg-gold/10 hover:shadow-gold active:scale-95",
  ghost: 
    "bg-transparent text-foreground-muted hover:text-white hover:bg-white/5",
  glass:
    "glass-gold text-gold hover:bg-gold hover:text-black active:scale-95",
};

export function Button({
  children,
  type = "button",
  variant = "primary",
  className,
  onClick,
  disabled,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-bold uppercase tracking-wide transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

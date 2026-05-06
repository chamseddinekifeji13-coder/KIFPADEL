import { cn } from "@/lib/ui/cn";

type TextInputProps = Readonly<{
  id: string;
  name: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  className?: string;
}>;

export function TextInput({
  id,
  name,
  type = "text",
  placeholder,
  className,
}: TextInputProps) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm text-white placeholder:text-foreground-muted outline-none transition-all focus:border-gold/50 focus:ring-1 focus:ring-gold/50",
        className,
      )}
    />
  );
}

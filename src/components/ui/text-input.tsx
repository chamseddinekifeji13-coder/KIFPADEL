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
        "h-12 w-full rounded-2xl border border-white/5 bg-surface-elevated px-4 text-sm text-white placeholder:text-foreground-muted outline-none transition-all focus:border-gold/30 focus:shadow-gold",
        className,
      )}
    />
  );
}

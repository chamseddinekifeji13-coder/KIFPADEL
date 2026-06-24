import { cn } from "@/lib/ui/cn";

type TextInputProps = Readonly<{
  id: string;
  name: string;
  type?: "text" | "email" | "password" | "tel";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  className?: string;
}>;

export function TextInput({
  id,
  name,
  type = "text",
  inputMode,
  placeholder,
  required,
  minLength,
  maxLength,
  className,
}: TextInputProps) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      inputMode={inputMode}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      maxLength={maxLength}
      className={cn(
        "h-12 w-full rounded-2xl border border-white/5 bg-surface-elevated px-4 text-base md:text-sm text-white placeholder:text-foreground-muted outline-none transition-all focus:border-gold/30 focus:shadow-gold",
        className,
      )}
    />
  );
}

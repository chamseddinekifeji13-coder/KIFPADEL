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
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2",
        className,
      )}
    />
  );
}

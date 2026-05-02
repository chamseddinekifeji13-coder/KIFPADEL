import { cn } from "@/lib/ui/cn";
import { type InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  name: string;
}

export function TextInput({
  id,
  name,
  className,
  ...props
}: TextInputProps) {
  return (
    <input
      id={id}
      name={name}
      className={cn(
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}

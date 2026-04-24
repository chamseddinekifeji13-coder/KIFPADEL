import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type SectionTitleProps = Readonly<{
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}>;

export function SectionTitle({
  title,
  subtitle,
  icon,
  className,
  titleClassName,
  subtitleClassName,
}: SectionTitleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          {icon}
        </div>
      )}
      <div className="space-y-0.5">
        <h2 className={cn("text-lg font-bold text-slate-900", titleClassName)}>
          {title}
        </h2>
        {subtitle && (
          <p className={cn("text-sm text-slate-500 font-medium", subtitleClassName)}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

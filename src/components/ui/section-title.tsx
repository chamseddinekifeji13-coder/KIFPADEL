import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type HeadingLevel = "h1" | "h2" | "h3" | "h4";

type SectionTitleProps = Readonly<{
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  as?: HeadingLevel;
}>;

export function SectionTitle({
  title,
  subtitle,
  icon,
  className,
  titleClassName,
  subtitleClassName,
  as: Heading = "h2",
}: SectionTitleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          {icon}
        </div>
      )}
      <div className="space-y-0.5">
        <Heading className={cn("text-lg font-bold text-slate-900", titleClassName)}>
          {title}
        </Heading>
        {subtitle && (
          <p className={cn("text-sm text-slate-500 font-medium", subtitleClassName)}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

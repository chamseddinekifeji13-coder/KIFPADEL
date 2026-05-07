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
    <div className={cn("flex items-center gap-3", className)}>
      {icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10 text-gold shadow-sm ring-1 ring-gold/20">
          {icon}
        </div>
      )}
      <div className="space-y-0.5">
        <Heading className={cn("text-sm font-black uppercase tracking-[0.15em] text-white", titleClassName)}>
          {title}
        </Heading>
        {subtitle && (
          <p className={cn("text-[10px] text-foreground-muted font-bold uppercase tracking-widest", subtitleClassName)}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

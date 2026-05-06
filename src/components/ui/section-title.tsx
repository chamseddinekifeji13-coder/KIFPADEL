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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold border border-gold/20 shadow-gold">
          {icon}
        </div>
      )}
      <div className="space-y-0.5">
        <Heading className={cn("text-lg font-black text-white uppercase tracking-tight", titleClassName)}>
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

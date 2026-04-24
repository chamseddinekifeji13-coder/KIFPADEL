type SectionTitleProps = Readonly<{
  title: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}>;

export function SectionTitle({
  title,
  subtitle,
  titleClassName,
  subtitleClassName,
}: SectionTitleProps) {
  return (
    <header className="space-y-1">
      <h1 className={titleClassName ?? "text-xl font-semibold text-slate-900"}>{title}</h1>
      {subtitle ? (
        <p className={subtitleClassName ?? "text-sm text-slate-600"}>{subtitle}</p>
      ) : null}
    </header>
  );
}

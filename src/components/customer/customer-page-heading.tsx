interface CustomerPageHeadingProps {
  title: string;
  description?: string;
  centered?: boolean;
  fullWidth?: boolean;
}

export function CustomerPageHeading({
  title,
  description,
  centered = false,
  fullWidth = false,
}: CustomerPageHeadingProps) {
  return (
    <header className={centered ? "mx-auto max-w-2xl text-center" : fullWidth ? "w-full" : "max-w-2xl"}>
      <h1 className="font-display text-4xl leading-tight text-brand sm:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-5 text-base leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}

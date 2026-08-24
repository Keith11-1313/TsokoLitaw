interface CustomerPageHeadingProps {
  title: string;
  description?: string;
  centered?: boolean;
}

export function CustomerPageHeading({
  title,
  description,
  centered = false,
}: CustomerPageHeadingProps) {
  return (
    <header className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <h1 className="font-script text-[3.25rem] leading-none text-brand sm:text-[3.75rem]">
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

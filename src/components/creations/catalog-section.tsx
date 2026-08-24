import {
  CreationCard,
  type CreationItem,
} from "@/components/creations/creation-card";

interface CatalogSectionProps {
  heading: string;
  subtitle: string;
  items: readonly CreationItem[];
  headingLevel?: "h1" | "h2";
}

export function CatalogSection({
  heading,
  subtitle,
  items,
  headingLevel = "h2",
}: CatalogSectionProps) {
  const Heading = headingLevel;
  const headingId = `${heading.toLowerCase().replaceAll(" ", "-")}-heading`;

  return (
    <section aria-labelledby={headingId}>
      <Heading
        id={headingId}
        className="font-script text-[3rem] leading-none text-brand sm:text-[3.25rem]"
      >
        {heading}
      </Heading>
      <p className="mt-5 text-sm uppercase text-subtle-foreground">
        {subtitle}
      </p>

      <div className="mt-[1.8125rem] grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <CreationCard key={item.name} item={item} />
        ))}
      </div>
    </section>
  );
}

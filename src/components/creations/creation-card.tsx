import {
  CatalogImagePlaceholder,
  type CatalogImageTone,
} from "@/components/creations/catalog-image-placeholder";

export interface CreationItem {
  name: string;
  price: string;
  description: string;
  imageTone: CatalogImageTone;
}

interface CreationCardProps {
  item: CreationItem;
}

export function CreationCard({ item }: CreationCardProps) {
  return (
    <article className="rounded-card border border-border bg-surface p-[1.1875rem] text-foreground xl:min-h-[24.25rem]">
      <CatalogImagePlaceholder label={item.name} tone={item.imageTone} />
      <div className="mt-3.5 flex items-start justify-between gap-4">
        <h3 className="font-display text-xl leading-tight">{item.name}</h3>
        <p className="shrink-0 text-base font-bold text-subtle-foreground">
          {item.price}
        </p>
      </div>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">
        {item.description}
      </p>
    </article>
  );
}

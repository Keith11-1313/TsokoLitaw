import Image from "next/image";
import Link from "next/link";
import { CreditCard, MapPin, PackageOpen } from "lucide-react";
import { SiteContainer } from "@/components/layout/site-container";
import { secondaryButtonClassName } from "@/components/ui/button";
import { getPublicCommerceCatalog } from "@/lib/server-commerce";
import { formatPhp } from "@/lib/commerce";

const orderSteps = [
  {
    title: "Build your box",
    description: "Choose 4, 6, or 8 pieces, then pick one coating or make your own mix.",
    icon: PackageOpen,
  },
  {
    title: "Order online",
    description: "Complete checkout on the website so your box and pickup details are recorded.",
    icon: CreditCard,
  },
  {
    title: "Pick it up on campus",
    description:
      "Select an available schedule and collect your TsokoLitaw fresh at UCC Congressional.",
    icon: MapPin,
  },
] as const;

export function WhyTsokoLitawSection() {
  return (
    <section
      className="bg-surface py-14 sm:py-20 lg:py-24"
      aria-labelledby="why-tsokolitaw-heading"
    >
      <SiteContainer>
        <div className="grid items-center gap-9 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-square overflow-hidden rounded-card border border-border bg-surface shadow-sm lg:order-2">
            <Image
              src="/images/home/hero-c.webp"
              alt="Broken milk chocolate bars on brown paper"
              fill
              loading="eager"
              sizes="(min-width: 1024px) 42vw, calc(100vw - 2rem)"
              className="object-cover"
            />
          </div>

          <div className="max-w-xl lg:order-1">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-subtle-foreground">
              About us
            </p>
            <h2
              id="why-tsokolitaw-heading"
              className="mt-3 font-display text-4xl leading-tight text-brand sm:text-5xl"
            >
              When plain palitaw isn&apos;t enough.
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              We started with a simple idea: plain palitaw could be more exciting. So we kept the
              soft and chewy texture people already know, added a chocolate center, and gave it
              different coatings to choose from.
            </p>
            <p className="mt-4 text-lg leading-7 text-muted-foreground">
              Pick your box: 4 pcs for ₱40 | 6 pcs for ₱55 | 8 pcs for ₱75
            </p>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}

export function CoatingShowcaseFallback() {
  return (
    <section className="py-14 sm:py-20 lg:py-24" aria-labelledby="coatings-heading">
      <SiteContainer>
        <div className="h-80 animate-pulse rounded-card border border-border bg-surface-muted" />
      </SiteContainer>
    </section>
  );
}

async function loadHomeCatalog() {
  try {
    return await getPublicCommerceCatalog();
  } catch {
    return null;
  }
}

export async function HomeCoatingShowcase() {
  const catalog = await loadHomeCatalog();

  if (catalog) {
    return (
      <section className="py-14 sm:py-20 lg:py-24" aria-labelledby="coatings-heading">
        <SiteContainer>
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-subtle-foreground">
              Make every box yours
            </p>
            <h2 id="coatings-heading" className="mt-3 font-display text-4xl text-brand sm:text-5xl">
              Different ways to enjoy your TsokoLitaw
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Keep every piece the same or combine coatings in one box. The chocolate-filled center
              stays at the heart of every choice.
            </p>
          </div>

          <ul
            className="mt-9 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4"
            aria-label="Available coatings"
          >
            {catalog.coatings.map((coating) => (
              <li
                key={coating.id}
                className="overflow-hidden rounded-card border border-border bg-background shadow-sm"
              >
                <div className="relative aspect-square bg-surface-muted">
                  <Image
                    src={coating.imageSrc}
                    alt={`${coating.name} coated TsokoLitaw`}
                    fill
                    sizes="(min-width: 768px) 22vw, 45vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <h3 className="font-display text-lg text-brand sm:text-xl">{coating.name}</h3>
                    <span className="text-xs italic text-brand/60">
                     {formatPhp(coating.pricePerPiece)} / piece
                    </span>
                  </div>
                  <p className="mt-2 hidden text-sm leading-6 text-muted-foreground sm:block">
                    {coating.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex justify-center">
            <Link href="/our-creations" className={secondaryButtonClassName}>
              Explore all coatings
            </Link>
          </div>
        </SiteContainer>
      </section>
    );
  }

  return (
    <section className="py-14 sm:py-20" aria-labelledby="coatings-unavailable-heading">
      <SiteContainer>
        <div className="rounded-card border border-border bg-background p-6 text-center sm:p-9">
          <h2 id="coatings-unavailable-heading" className="font-display text-3xl text-brand">
            Our coatings are being refreshed
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            The current selection could not be loaded. Please try Our Creations again shortly.
          </p>
        </div>
      </SiteContainer>
    </section>
  );
}

export function HowToOrderSection() {
  return (
    <section className="bg-surface py-14 sm:py-20 lg:py-24" aria-labelledby="how-to-order-heading">
      <SiteContainer>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-subtle-foreground">
            From screen to pickup
          </p>
          <h2
            id="how-to-order-heading"
            className="mt-3 font-display text-4xl text-brand sm:text-5xl"
          >
            How to get your TsokoLitaw
          </h2>
        </div>

        <ol className="mt-9 grid gap-4 md:grid-cols-3 md:gap-6">
          {orderSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="rounded-card border border-border bg-surface p-6 shadow-sm sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-full bg-brand text-surface">
                    <Icon aria-hidden="true" size={22} />
                  </span>
                  <span className="font-display text-3xl text-subtle-foreground" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl text-brand">{step.title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </SiteContainer>
    </section>
  );
}

export function SeaSaltSection() {
  return (
    <section className="py-14 sm:py-20 lg:py-24" aria-labelledby="sea-salt-heading">
      <SiteContainer>
        <div className="grid items-center gap-9 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-square overflow-hidden rounded-card border border-border bg-surface-muted shadow-sm">
            <Image
              src="/images/home/hero-ss.webp"
              alt="Creamy sea-salt sauce lifted from a wooden bowl"
              fill
              sizes="(min-width: 1024px) 42vw, calc(100vw - 2rem)"
              className="object-cover"
            />
          </div>

          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-subtle-foreground">
              Sweet meets salty
            </p>
            <h2 id="sea-salt-heading" className="mt-3 font-display text-4xl text-brand sm:text-5xl">
              Chocolate hits better with sea-salt cream
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Rich chocolate is good on its own, but the sea-salt cream gives it that extra balance.
              It adds a smooth, lightly salty finish that makes each bite less heavy and more
              satisfying.
            </p>
            <p className="mt-4 text-lg leading-7 text-muted-foreground">
              Every box comes with 1 complimentary sea-salt cream dip. Want more? Add an extra one
              for ₱15.
            </p>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}

export function HomeCallToAction() {
  return (
    <section className="py-14 sm:py-20 lg:py-24" aria-labelledby="home-cta-heading">
      <SiteContainer>
        <div className="overflow-hidden rounded-card bg-brand px-6 py-12 text-center text-surface shadow-sm sm:px-10 sm:py-16">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-surface/75">
            Fresh for campus pickup
          </p>
          <h2
            id="home-cta-heading"
            className="mx-auto mt-3 max-w-3xl font-display text-4xl leading-tight sm:text-5xl"
          >
            Ready for the chocolate surprise?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-surface/85">
            Build your box, choose your coatings, and reserve an available pickup schedule.
          </p>
          <div className="mt-8">
            <Link
              href="/our-creations"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-6 py-3 text-sm font-bold text-brand transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
            >
              Build your box
            </Link>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}

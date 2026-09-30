import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import emptyBoxImage from "../../public/images/404.webp";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-items-center bg-background px-6 py-10"
      tabIndex={-1}
    >
      <section className="flex w-full max-w-lg flex-col items-center text-center">
        <Image
          src={emptyBoxImage}
          alt="An open, empty TsokoLitaw box"
          className="h-auto w-56 sm:w-72"
          priority
          sizes="(min-width: 640px) 18rem, 14rem"
        />
        <h1 className="mt-5 font-display text-3xl text-foreground sm:text-4xl">
          You found the empty box.
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
          Unfortunately, the page you wanted isn’t inside.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className={cn(primaryButtonClassName)}>
            Return home
          </Link>
          <Link href="/orders" className={cn(secondaryButtonClassName)}>
            <ArrowLeft aria-hidden="true" size={17} />
            View orders
          </Link>
        </div>
      </section>
    </main>
  );
}

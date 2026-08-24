import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

export type CatalogImageTone =
  | "chocolate"
  | "matcha"
  | "strawberry"
  | "caramel"
  | "caramel-jar"
  | "chocolate-chips"
  | "cocoa"
  | "melted-chocolate"
  | "cocoa-coating"
  | "milk"
  | "palitaw"
  | "nuts"
  | "plain"
  | "sesame"
  | "cookies-cream";

const toneStyles: Record<
  CatalogImageTone,
  { background: string; accent: string; detail: string }
> = {
  chocolate: {
    background: "from-[#c7ad91] via-[#8d6848] to-[#49301d]",
    accent: "bg-[#f4e3c7]",
    detail: "bg-[#4b2614]",
  },
  matcha: {
    background: "from-[#ebe2cd] via-[#d1c59d] to-[#73814a]",
    accent: "bg-[#78904d]",
    detail: "bg-[#f0ead8]",
  },
  strawberry: {
    background: "from-[#efe1d2] via-[#c98275] to-[#73382f]",
    accent: "bg-[#9e4650]",
    detail: "bg-[#4b241d]",
  },
  caramel: {
    background: "from-[#dfc5a2] via-[#b8793f] to-[#70411f]",
    accent: "bg-[#e7b770]",
    detail: "bg-[#925321]",
  },
  "caramel-jar": {
    background: "from-[#f2f2ef] via-[#ded5c6] to-[#b79569]",
    accent: "bg-[#bc762e]",
    detail: "bg-[#f0c982]",
  },
  "chocolate-chips": {
    background: "from-[#d9c8b6] via-[#8c6141] to-[#3f2518]",
    accent: "bg-[#4c2c20]",
    detail: "bg-[#76503b]",
  },
  cocoa: {
    background: "from-[#e6dac8] via-[#ae8a65] to-[#604129]",
    accent: "bg-[#6d321d]",
    detail: "bg-[#8b4b2e]",
  },
  "melted-chocolate": {
    background: "from-[#c8a881] via-[#79513a] to-[#42261a]",
    accent: "bg-[#5a2d20]",
    detail: "bg-[#9a6042]",
  },
  "cocoa-coating": { background: "from-[#e4d2bd] via-[#a57654] to-[#51311f]", accent: "bg-[#7a472d]", detail: "bg-[#432317]" },
  milk: { background: "from-[#fff9ed] via-[#ead8b9] to-[#b99b73]", accent: "bg-[#f4e4c5]", detail: "bg-[#dfc69f]" },
  palitaw: { background: "from-[#fffaf0] via-[#e5d7bf] to-[#9c7850]", accent: "bg-[#f4ead7]", detail: "bg-[#b78b55]" },
  nuts: { background: "from-[#eadbc7] via-[#b88c60] to-[#66442a]", accent: "bg-[#b57d48]", detail: "bg-[#704727]" },
  plain: { background: "from-[#fffdf7] via-[#eadfce] to-[#b9a58c]", accent: "bg-[#f7f0e4]", detail: "bg-[#e4d5c0]" },
  sesame: { background: "from-[#f6ead7] via-[#c7a477] to-[#715035]", accent: "bg-[#c59b62]", detail: "bg-[#725035]" },
  "cookies-cream": { background: "from-[#f5f1e9] via-[#bbb0a3] to-[#51483f]", accent: "bg-[#eee7dc]", detail: "bg-[#423830]" },
};

interface CatalogImagePlaceholderProps {
  label: string;
  tone: CatalogImageTone;
  className?: string;
}

export function CatalogImagePlaceholder({
  label,
  tone,
  className,
}: CatalogImagePlaceholderProps) {
  const styles = toneStyles[tone];
  const isAddOn = [
    "caramel-jar",
    "chocolate-chips",
    "cocoa",
    "melted-chocolate",
  ].includes(tone);

  return (
    <div
      role="img"
      aria-label={`${label} product image placeholder`}
      className={cn(
        "relative aspect-square overflow-hidden rounded-image bg-gradient-to-br",
        styles.background,
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.4),transparent_38%)]" />

      {isAddOn ? (
        <>
          <div className="absolute inset-x-[20%] bottom-[12%] top-[24%] rounded-[44%_44%_30%_30%] bg-white/65 shadow-2xl shadow-black/25" />
          <div
            className={cn(
              "absolute inset-x-[24%] bottom-[18%] top-[34%] rounded-[40%_40%_28%_28%]",
              styles.accent,
            )}
          />
          <div
            className={cn(
              "absolute left-[34%] top-[22%] h-[8%] w-[32%] rounded-full shadow-lg",
              styles.detail,
            )}
          />
        </>
      ) : (
        <>
          <div className="absolute inset-x-[10%] bottom-[12%] h-[42%] rounded-[50%] bg-[#f4eee2]/85 shadow-2xl shadow-black/25" />
          <div
            className={cn(
              "absolute bottom-[27%] left-[18%] size-[35%] rounded-full shadow-xl shadow-black/25",
              styles.accent,
            )}
          />
          <div
            className={cn(
              "absolute bottom-[31%] right-[16%] size-[32%] rounded-full shadow-xl shadow-black/25",
              styles.detail,
            )}
          />
          <div className="absolute bottom-[28%] left-[43%] size-[30%] rounded-full bg-white/35 shadow-lg" />
        </>
      )}

      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wide text-brand shadow-sm">
        <ImageOff aria-hidden="true" size={12} />
        Placeholder
      </span>
    </div>
  );
}

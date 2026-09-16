import { cn } from "@/lib/cn";

export function FormStatusHint({ message, className }: { message: string; className?: string }) {
  return message ? (
    <p className={cn("sr-only", className)} aria-live="polite">
      {message}
    </p>
  ) : null;
}

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const baseButtonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

export const primaryButtonClassName = cn(
  baseButtonClassName,
  "bg-brand text-surface hover:bg-brand-hover",
);

export const secondaryButtonClassName = cn(
  baseButtonClassName,
  "border border-brand bg-transparent text-brand hover:bg-surface-muted",
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(primaryButtonClassName, className)}
      type={type}
      {...props}
    />
  );
}

export function SecondaryButton({
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(secondaryButtonClassName, className)}
      type={type}
      {...props}
    />
  );
}

"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

interface QuantityInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
  className?: string;
}

export function QuantityInput({ label, value, onChange, min, max, disabled, className }: QuantityInputProps) {
  const id = useId();

  return (
    <label className={cn("block min-w-0 space-y-2", className)} htmlFor={id}>
      <span className="block text-sm font-bold text-foreground">{label}</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isInteger(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
        }}
        className="min-h-12 w-full rounded-control border border-transparent bg-surface-control px-4 text-sm text-foreground outline-none transition focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

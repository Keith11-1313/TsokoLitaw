"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption { value: string; label: string; disabled?: boolean }

interface CustomSelectProps {
  label: string;
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function CustomSelect({ label, options, value, onChange, disabled, error, className }: CustomSelectProps) {
  const id = useId();

  return (
    <label className={cn("block min-w-0 space-y-2", className)} htmlFor={id}>
      <span className="block text-sm font-bold text-foreground">{label}</span>
      <span className="relative block">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-h-12 w-full appearance-none rounded-control border border-transparent bg-surface-control px-4 pr-11 text-sm text-foreground outline-none transition focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger-foreground"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" size={18} />
      </span>
      {error ? <span id={`${id}-error`} className="block text-xs font-bold text-danger-foreground">{error}</span> : null}
    </label>
  );
}

export function UncontrolledCustomSelect({ label, options, defaultValue, disabled, className }: { label: string; options: readonly SelectOption[]; defaultValue?: string; disabled?: boolean; className?: string }) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  return <CustomSelect label={label} options={options} value={value} onChange={setValue} disabled={disabled} className={className} />;
}

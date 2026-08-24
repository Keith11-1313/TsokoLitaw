"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options[selectedIndex];

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function move(direction: 1 | -1) {
    let next = activeIndex;
    for (let index = 0; index < options.length; index += 1) {
      next = (next + direction + options.length) % options.length;
      if (!options[next]?.disabled) break;
    }
    setActiveIndex(next);
  }

  return (
    <div ref={rootRef} className={cn("relative space-y-2", className)}>
      <span id={`${id}-label`} className="block text-sm font-bold text-foreground">{label}</span>
      <button ref={buttonRef} type="button" disabled={disabled} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-listbox`} data-invalid={Boolean(error) || undefined} onClick={() => { setActiveIndex(selectedIndex); setOpen((current) => !current); }} onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (!open) setOpen(true); else move(event.key === "ArrowDown" ? 1 : -1); }
        if ((event.key === "Enter" || event.key === " ") && open) { event.preventDefault(); choose(activeIndex); }
        if (event.key === "Escape") { setOpen(false); }
      }} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-control border border-transparent bg-surface-control px-4 text-left text-sm text-foreground outline-none transition focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid=true]:border-danger-foreground">
        <span id={`${id}-value`} className="truncate">{selected?.label}</span><ChevronDown aria-hidden="true" className={cn("shrink-0 transition-transform", open && "rotate-180")} size={18} />
      </button>
      {open ? <ul id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`} aria-activedescendant={`${id}-option-${activeIndex}`} className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-control border border-border bg-surface p-1 shadow-xl">
        {options.map((option, index) => <li id={`${id}-option-${index}`} key={option.value} role="option" aria-selected={option.value === value} aria-disabled={option.disabled} onPointerMove={() => setActiveIndex(index)} onClick={() => choose(index)} className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm", index === activeIndex && "bg-surface-muted", option.disabled && "cursor-not-allowed opacity-45")}><span>{option.label}</span>{option.value === value ? <Check aria-hidden="true" size={16} /> : null}</li>)}
      </ul> : null}
      {error ? <p className="text-xs font-bold text-danger-foreground">{error}</p> : null}
    </div>
  );
}

export function UncontrolledCustomSelect({ label, options, defaultValue, disabled, className }: { label: string; options: readonly SelectOption[]; defaultValue?: string; disabled?: boolean; className?: string }) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  return <CustomSelect label={label} options={options} value={value} onChange={setValue} disabled={disabled} className={className} />;
}

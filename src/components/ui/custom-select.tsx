"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption { value: string; label: string; disabled?: boolean }

interface CustomSelectProps {
  label: string;
  options: readonly SelectOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

export function CustomSelect({ label, options, name, value, defaultValue, onChange, placeholder = "Select an option", required, disabled, error, hint, className }: CustomSelectProps) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const selectedValue = controlled ? value : internalValue;
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const firstEnabled = useMemo(() => Math.max(0, options.findIndex((option) => !option.disabled)), [options]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : firstEnabled);
  const [touched, setTouched] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const typeaheadRef = useRef("");
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownError = error || (touched && required && !selectedValue ? `${label} is required.` : "");

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (open && !rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setTouched(true);
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => () => {
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
  }, []);

  function moveActive(direction: 1 | -1) {
    if (!options.length) return;
    let next = activeIndex;
    for (let index = 0; index < options.length; index += 1) {
      next = (next + direction + options.length) % options.length;
      if (!options[next]?.disabled) {
        setActiveIndex(next);
        const activeOption = document.getElementById(`${id}-option-${next}`);
        if (typeof activeOption?.scrollIntoView === "function") activeOption.scrollIntoView({ block: "nearest" });
        return;
      }
    }
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    if (!controlled) setInternalValue(option.value);
    onChange?.(option.value);
    setActiveIndex(index);
    setTouched(true);
    setOpen(false);
    queueMicrotask(() => buttonRef.current?.focus());
    setTimeout(() => selectRef.current?.dispatchEvent(new Event("change", { bubbles: true })), 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const indexes = options.map((_, index) => index).filter((index) => !options[index]?.disabled);
      setActiveIndex(event.key === "Home" ? (indexes[0] ?? 0) : (indexes.at(-1) ?? 0));
      setOpen(true);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else setOpen(true);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (event.key.length === 1 && /\S/.test(event.key)) {
      typeaheadRef.current += event.key.toLocaleLowerCase();
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
      typeaheadTimer.current = setTimeout(() => { typeaheadRef.current = ""; }, 500);
      const match = options.findIndex((option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(typeaheadRef.current));
      if (match >= 0) {
        setActiveIndex(match);
        setOpen(true);
      }
    }
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-0 space-y-2", className)}>
      <label id={`${id}-label`} className="block text-sm font-bold text-foreground">{label}</label>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        aria-invalid={Boolean(shownError) || undefined}
        aria-describedby={shownError ? `${id}-error` : hint ? `${id}-hint` : undefined}
        disabled={disabled}
        onBlur={() => { if (!open) setTouched(true); }}
        onClick={() => {
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled);
          setOpen((current) => !current);
        }}
        onKeyDown={handleKeyDown}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-control border border-transparent bg-surface-control px-4 text-left text-sm text-foreground outline-none transition focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger-foreground"
      >
        <span className={cn("truncate", !selectedOption && "text-foreground-muted")}>{selectedOption?.label ?? placeholder}</span>
        <ChevronDown aria-hidden="true" className={cn("shrink-0 transition-transform", open && "rotate-180")} size={18} />
      </button>
      {open ? (
        <ul id={listboxId} role="listbox" aria-labelledby={`${id}-label`} className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-control border border-border-subtle bg-surface-raised p-1 shadow-lg">
          {options.map((option, index) => (
            <li
              id={`${id}-option-${index}`}
              key={option.value}
              role="option"
              aria-selected={selectedValue === option.value}
              aria-disabled={option.disabled || undefined}
              onPointerDown={(event) => event.preventDefault()}
              onPointerMove={() => { if (!option.disabled) setActiveIndex(index); }}
              onClick={() => choose(index)}
              className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-control px-3 py-2 text-sm outline-none", activeIndex === index && "bg-surface-muted", selectedValue === option.value && "font-bold text-brand", option.disabled && "cursor-not-allowed opacity-45")}
            >
              <span>{option.label}</span>
              {selectedValue === option.value ? <Check aria-hidden="true" size={17} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <select
        ref={selectRef}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        name={name}
        required={required}
        disabled={disabled}
        value={selectedValue}
        onChange={() => undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
      {hint && !shownError ? <p id={`${id}-hint`} className="text-xs text-foreground-muted">{hint}</p> : null}
      {shownError ? <p id={`${id}-error`} className="text-xs font-bold text-danger-foreground">{shownError}</p> : null}
    </div>
  );
}

export function UncontrolledCustomSelect(props: Omit<CustomSelectProps, "value" | "onChange">) {
  return <CustomSelect {...props} />;
}

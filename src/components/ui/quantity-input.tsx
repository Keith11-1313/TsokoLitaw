"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { normalizeSteppedValue, numberError } from "@/lib/form-validation";

interface NumberStepperProps {
  label: string;
  name?: string;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

export function NumberStepper({ label, name, value, defaultValue, onChange, min, max, step = 1, required, disabled, error, hint, className }: NumberStepperProps) {
  const id = useId();
  const controlled = value !== undefined;
  const [rawValue, setRawValue] = useState(String(value ?? defaultValue ?? min));
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // External cart/configuration changes must be reflected without remounting the control.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (controlled) setRawValue(String(value));
  }, [controlled, value]);

  const parsed = rawValue.trim() === "" ? Number.NaN : Number(rawValue);
  const ownError = useMemo(() => {
    if (!required && rawValue.trim() === "") return "";
    if (required && rawValue.trim() === "") return `${label} is required.`;
    return numberError(rawValue, label, min, max, step) ?? "";
  }, [label, max, min, rawValue, required, step]);
  const shownError = error || (touched ? ownError : "");
  const canDecrease = !disabled && Number.isFinite(parsed) && parsed - step >= min;
  const canIncrease = !disabled && Number.isFinite(parsed) && parsed + step <= max;

  function commit(next: number) {
    const normalized = normalizeSteppedValue(next, min, max, step);
    setRawValue(String(normalized));
    onChange?.(normalized);
    setTimeout(() => {
      inputRef.current?.setCustomValidity("");
      inputRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    }, 0);
  }

  function updateRaw(next: string) {
    setRawValue(next);
    const validationError = numberError(next, label, min, max, step);
    if (next.trim() !== "" && !validationError) onChange?.(Number(next));
  }

  return (
    <div className={cn("block min-w-0 space-y-2", className)}>
      <label className="block text-sm font-bold text-foreground" htmlFor={id}>{label}</label>
      <div className={cn("grid min-h-12 grid-cols-[3rem_minmax(3rem,1fr)_3rem] overflow-hidden rounded-control border bg-surface-control transition focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/20", shownError ? "border-danger-foreground" : "border-transparent", disabled && "opacity-50")}>
        <button type="button" aria-label={`Decrease ${label}`} disabled={!canDecrease} onClick={() => commit(parsed - step)} className="grid min-h-12 place-items-center border-r border-border-subtle p-0 text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-35">
          <Minus aria-hidden="true" className="block" size={18} />
        </button>
        <input
          id={id}
          ref={inputRef}
          name={name}
          type="text"
          role="spinbutton"
          inputMode={step < 1 ? "decimal" : "numeric"}
          required={required}
          disabled={disabled}
          value={rawValue}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={Number.isFinite(parsed) ? parsed : undefined}
          aria-invalid={Boolean(shownError) || undefined}
          aria-describedby={shownError ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onBlur={(event) => {
            setTouched(true);
            event.currentTarget.setCustomValidity(ownError);
          }}
          onChange={(event) => {
            const next = event.target.value;
            const nextError = next.trim() === ""
              ? required ? `${label} is required.` : ""
              : numberError(next, label, min, max, step);
            event.currentTarget.setCustomValidity(nextError);
            updateRaw(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" && canIncrease) {
              event.preventDefault();
              commit(parsed + step);
            } else if (event.key === "ArrowDown" && canDecrease) {
              event.preventDefault();
              commit(parsed - step);
            }
          }}
          className="min-w-0 bg-transparent px-2 text-center text-sm text-foreground outline-none disabled:cursor-not-allowed"
        />
        <button type="button" aria-label={`Increase ${label}`} disabled={!canIncrease} onClick={() => commit(parsed + step)} className="grid min-h-12 place-items-center border-l border-border-subtle p-0 text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-35">
          <Plus aria-hidden="true" className="block" size={18} />
        </button>
      </div>
      {hint && !shownError ? <p id={`${id}-hint`} className="text-xs text-foreground-muted">{hint}</p> : null}
      {shownError ? <p id={`${id}-error`} className="text-xs font-bold text-danger-foreground">{shownError}</p> : null}
    </div>
  );
}

interface QuantityInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
  className?: string;
}

export function QuantityInput(props: QuantityInputProps) {
  return <NumberStepper {...props} step={1} required />;
}

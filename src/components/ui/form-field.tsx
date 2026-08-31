"use client";

import {
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const controlClassName =
  "w-full rounded-control border border-transparent bg-surface-control px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-focus focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger-foreground aria-invalid:ring-2 aria-invalid:ring-danger-foreground/15";

export const inputClassName = controlClassName;

interface FieldPresentationProps {
  id: string;
  label: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  controlClassName?: string;
}

type InputFieldProps = FieldPresentationProps & {
  as?: "input";
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "id" | "className" | "required"
  >;
};

type TextareaFieldProps = FieldPresentationProps & {
  as: "textarea";
  textareaProps?: Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "id" | "className" | "required"
  >;
};

export type FormFieldProps =
  | InputFieldProps
  | TextareaFieldProps;

export function FormField(props: FormFieldProps) {
  const {
    id,
    label,
    hint,
    error,
    required,
    className,
    controlClassName: customControlClassName,
  } = props;
  const hintId = hint ? `${id}-hint` : undefined;
  const [touchedError, setTouchedError] = useState("");
  const shownError = error || touchedError;
  const errorId = shownError ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const sharedControlProps = {
    id,
    required,
    "aria-describedby": describedBy,
    "aria-invalid": Boolean(shownError) || undefined,
  } as const;

  function showNativeError(target: HTMLInputElement | HTMLTextAreaElement) {
    setTouchedError(target.validationMessage);
  }

  let fieldControl;

  if (props.as === "textarea") {
    fieldControl = (
      <textarea
        {...props.textareaProps}
        {...sharedControlProps}
        onBlur={(event: FocusEvent<HTMLTextAreaElement>) => {
          showNativeError(event.currentTarget);
          props.textareaProps?.onBlur?.(event);
        }}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
          const target = event.currentTarget;
          if (touchedError) queueMicrotask(() => showNativeError(target));
          props.textareaProps?.onChange?.(event);
        }}
        className={cn(controlClassName, "min-h-28 resize-y", customControlClassName)}
      />
    );
  } else {
    fieldControl = (
      <input
        {...props.inputProps}
        {...sharedControlProps}
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          showNativeError(event.currentTarget);
          props.inputProps?.onBlur?.(event);
        }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const target = event.currentTarget;
          if (touchedError) queueMicrotask(() => showNativeError(target));
          props.inputProps?.onChange?.(event);
        }}
        className={cn(controlClassName, customControlClassName)}
      />
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-bold text-foreground" htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-1 text-danger-foreground" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {fieldControl}
      {hint ? (
        <p className="text-xs text-muted-foreground" id={hintId}>
          {hint}
        </p>
      ) : null}
      {shownError ? (
        <p className="text-xs font-bold text-danger-foreground" id={errorId}>
          {shownError}
        </p>
      ) : null}
    </div>
  );
}

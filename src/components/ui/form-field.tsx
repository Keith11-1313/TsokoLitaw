import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const controlClassName =
  "w-full rounded-control border border-transparent bg-surface-control px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-focus focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger-foreground aria-invalid:ring-2 aria-invalid:ring-danger-foreground/15";

interface FieldPresentationProps {
  id: string;
  label: string;
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

type SelectFieldProps = FieldPresentationProps & {
  as: "select";
  children: ReactNode;
  selectProps?: Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    "id" | "className" | "required"
  >;
};

export type FormFieldProps =
  | InputFieldProps
  | TextareaFieldProps
  | SelectFieldProps;

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
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const sharedControlProps = {
    id,
    required,
    "aria-describedby": describedBy,
    "aria-invalid": Boolean(error) || undefined,
  } as const;

  let fieldControl;

  if (props.as === "textarea") {
    fieldControl = (
      <textarea
        {...props.textareaProps}
        {...sharedControlProps}
        className={cn(controlClassName, "min-h-28 resize-y", customControlClassName)}
      />
    );
  } else if (props.as === "select") {
    fieldControl = (
      <div className="relative">
        <select
          {...props.selectProps}
          {...sharedControlProps}
          className={cn(
            controlClassName,
            "appearance-none pr-11",
            customControlClassName,
          )}
        >
          {props.children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand"
          size={17}
          strokeWidth={2}
        />
      </div>
    );
  } else {
    fieldControl = (
      <input
        {...props.inputProps}
        {...sharedControlProps}
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
      {error ? (
        <p className="text-xs font-bold text-danger-foreground" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

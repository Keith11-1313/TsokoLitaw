"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function snapshot(form: HTMLFormElement) {
  const values: string[] = [];
  new FormData(form).forEach((value, key) => {
    values.push(value instanceof File
      ? `${key}=file:${value.name}:${value.size}:${value.lastModified}`
      : `${key}=${value}`);
  });
  return values.sort().join("&");
}

export function useFormGate({
  requireDirty,
  extraValid = true,
}: {
  requireDirty: boolean;
  extraValid?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const initialSnapshot = useRef("");
  const initialized = useRef(false);
  const [isValid, setIsValid] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const refresh = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    setIsValid(form.checkValidity() && extraValid);
    setIsDirty(snapshot(form) !== initialSnapshot.current);
  }, [extraValid]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (!initialized.current) {
      initialSnapshot.current = snapshot(form);
      initialized.current = true;
    }
    refresh();
  }, [refresh]);

  return {
    formRef,
    refresh,
    formProps: { onInput: refresh, onChange: refresh },
    isValid,
    isDirty,
    canSubmit: isValid && (!requireDirty || isDirty),
    statusMessage: !isValid
      ? "Complete the required fields and correct the highlighted values."
      : requireDirty && !isDirty
        ? "Change at least one value before saving."
        : "",
  };
}

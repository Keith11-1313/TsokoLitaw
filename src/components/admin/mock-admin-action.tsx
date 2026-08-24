"use client";

import { CheckCircle2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

export function MockAdminAction({ label, title, fieldLabel = "Name", placeholder = "Enter a mock value", secondary = false }: { label: string; title: string; fieldLabel?: string; placeholder?: string; secondary?: boolean }) {
  const [open, setOpen] = useState(false); const [saved, setSaved] = useState(false);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [open]);
  const Trigger = secondary ? SecondaryButton : PrimaryButton;
  return <><Trigger type="button" onClick={() => { setSaved(false); setOpen(true); }}><Plus size={17} />{label}</Trigger>{open ? <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/35 p-4" onPointerDown={() => setOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="mock-dialog-title" onPointerDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="mock-dialog-title" className="font-display text-2xl">{title}</h2><p className="mt-1 text-xs text-muted-foreground">UI preview only. This will not persist after refresh.</p></div><button type="button" aria-label="Close dialog" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center rounded-full bg-surface-muted"><X size={18} /></button></div>{saved ? <p role="status" className="mt-6 flex items-center gap-2 rounded-control bg-success-background p-4 text-sm font-bold text-success-foreground"><CheckCircle2 size={18} />Mock change saved for this preview.</p> : <form onSubmit={(event) => { event.preventDefault(); setSaved(true); }} className="mt-6 space-y-5"><FormField id={`mock-${label.toLowerCase().replaceAll(" ", "-")}`} label={fieldLabel} required inputProps={{ placeholder }} /><FormField id="mock-notes" label="Notes" as="textarea" textareaProps={{ placeholder: "Optional UI preview notes" }} /><div className="flex justify-end gap-3"><SecondaryButton type="button" onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton type="submit">Save preview</PrimaryButton></div></form>}</section></div> : null}</>;
}

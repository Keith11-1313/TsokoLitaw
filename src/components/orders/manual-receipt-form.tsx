"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitManualReceipt } from "@/app/orders/[orderId]/payment/actions";
import { useFormGate } from "@/hooks/use-form-gate";
import { imageFileError } from "@/lib/form-validation";
import { extractReceiptDetails, getReceiptReadWarning } from "@/lib/receipt-details";
import type { Worker } from "tesseract.js";

export function ManualReceiptForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [details, setDetails] = useState({ reference: "", amount: "", paidAt: "", recipient: "" });
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const readVersion = useRef(0);
  const mounted = useRef(true);
  const { formRef, formProps, canSubmit, refresh } = useFormGate({
    requireDirty: false,
    extraValid: !!file && !imageFileError(file),
  });
  useEffect(() => {
    refresh();
  }, [details, refresh]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void workerRef.current?.terminate();
    };
  }, []);

  async function readReceipt(receipt: File) {
    const version = ++readVersion.current;
    const previousWorker = workerRef.current;
    workerRef.current = null;
    void previousWorker?.terminate();
    setReading(true);
    setMessage("We’re reading your receipt on this device. Upload another image to replace it.");
    let worker: Worker | null = null;
    try {
      const { createWorker, PSM } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        workerPath: "/receipt-ocr/worker.min.js",
        corePath: "/receipt-ocr",
        langPath: "/receipt-ocr",
        workerBlobURL: false,
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: "1",
      });
      if (!mounted.current || readVersion.current !== version) return;
      workerRef.current = worker;
      const result = await worker.recognize(receipt);
      if (workerRef.current !== worker || !mounted.current || readVersion.current !== version)
        return;
      const warning = getReceiptReadWarning(result.data.text);
      setDetails(
        warning
          ? { reference: "", amount: "", paidAt: "", recipient: "" }
          : extractReceiptDetails(result.data.text),
      );
      setMessage(warning || "Your receipt is ready to review. Please correct anything we missed.");
    } catch {
      if (mounted.current && readVersion.current === version)
        setMessage("We couldn’t read this receipt automatically. Please enter its details below.");
    } finally {
      await worker?.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      if (mounted.current && readVersion.current === version) setReading(false);
    }
  }

  return (
    <form
      ref={formRef}
      {...formProps}
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending || reading || submitted || !canSubmit) return;
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            const result = await submitManualReceipt(orderId, form);
            setMessage(result.message);
            if (result.status === "success") {
              setSubmitted(true);
              router.refresh();
            }
          } catch {
            setMessage(
              "We lost the connection. Open your order again to see if we received the receipt. Please do not pay again.",
            );
          }
        });
      }}
    >
      <label className="block text-sm font-bold">
        Completed payment receipt
        <input
          name="receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={pending || submitted}
          className="mt-2 block w-full min-w-0 rounded-control border border-border p-3 text-sm"
          onChange={(event) => {
            const chosen = event.target.files?.[0] ?? null;
            setFile(chosen);
            setDetails({ reference: "", amount: "", paidAt: "", recipient: "" });
            const error = imageFileError(chosen);
            setMessage(error);
            if (chosen && !error) void readReceipt(chosen);
          }}
          onClick={(event) => {
            event.currentTarget.value = "";
            setFile(null);
            setDetails({ reference: "", amount: "", paidAt: "", recipient: "" });
            setMessage("");
          }}
        />
      </label>
      <p className="text-xs leading-5 text-muted-foreground">
        Upload a JPG, PNG or WebP file up to 3 MB. Choose the receipt that shows a successful
        payment, not the screen shown before you sent it. We store the original privately for review
        and start reading it as soon as you upload it. Upload the file again to reread it.
      </p>
      <fieldset disabled={pending || reading || submitted} className="space-y-4">
        <legend className="mb-3 font-bold">Review payment details</legend>
        {(
          [
            ["reference", "Transaction or reference ID", "text"],
            ["amount", "Amount sent in PHP, excluding fees", "number"],
            ["paidAt", "Date and time paid in Philippine time", "datetime-local"],
            ["recipient", "Recipient shown on receipt", "text"],
          ] as const
        ).map(([key, label, type]) => (
          <label key={key} className="block text-sm font-bold">
            {label}
            <input
              name={key}
              type={type}
              required
              value={details[key]}
              min={key === "amount" ? "0.01" : undefined}
              max={key === "amount" ? "99999999.99" : undefined}
              step={key === "amount" ? "0.01" : undefined}
              maxLength={key === "reference" ? 64 : key === "recipient" ? 100 : undefined}
              minLength={key === "reference" ? 6 : key === "recipient" ? 2 : undefined}
              onChange={(event) =>
                setDetails((current) => ({ ...current, [key]: event.target.value }))
              }
              className="mt-2 min-h-12 w-full min-w-0 rounded-control border border-border bg-surface px-3 font-normal"
            />
          </label>
        ))}
        <label className="flex items-start gap-3 text-sm leading-6">
          <input name="confirmed" type="checkbox" required className="mt-1 size-5 shrink-0" />I have
          completed this payment and checked that these details match my receipt.
        </label>
      </fieldset>
      <p role="status" className="text-sm leading-6">
        {message}
      </p>
      <button
        type="submit"
        disabled={!canSubmit || pending || reading || submitted}
        className="min-h-12 w-full rounded-full bg-brand px-5 font-bold text-surface disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit for verification
      </button>
      <p className="text-xs leading-5 text-muted-foreground">
        Sending a receipt does not mark your order as paid. Our team will compare it with the
        incoming transaction before confirming your order.
      </p>
    </form>
  );
}

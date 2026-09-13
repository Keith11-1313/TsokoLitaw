"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, ImageUp } from "lucide-react";
import { submitManualReceipt } from "@/app/orders/[orderId]/payment/actions";
import { useFormGate } from "@/hooks/use-form-gate";
import { imageFileError } from "@/lib/form-validation";
import {
  extractReceiptDetails,
  getReceiptReadWarning,
  isReceiptTimePlausible,
} from "@/lib/receipt-details";
import type { Worker } from "tesseract.js";

type DetailKey = "reference" | "amount" | "paidAt" | "recipient";

export function ManualReceiptForm({
  orderId,
  expectedAmount,
  orderCreatedAt,
}: {
  orderId: string;
  expectedAmount?: number;
  orderCreatedAt?: string;
}) {
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
  const { formRef, formProps, refresh, statusMessage } = useFormGate({
    requireDirty: false,
    extraValid: !!file && !imageFileError(file),
  });
  const detailErrors: Record<DetailKey, string> = {
    reference:
      details.reference && !/^[A-Z0-9\s-]{6,64}$/i.test(details.reference)
        ? "Use the reference shown on the completed receipt."
        : "",
    amount:
      details.amount &&
      expectedAmount !== undefined &&
      Math.abs(Number(details.amount) - expectedAmount) >= 0.005
        ? `The receipt must show exactly ₱${expectedAmount.toFixed(2)}, excluding transfer fees.`
        : "",
    paidAt:
      details.paidAt &&
      orderCreatedAt &&
      !isReceiptTimePlausible(new Date(`${details.paidAt}+08:00`), orderCreatedAt)
        ? "Use the Philippine date and time from the payment made for this order."
        : "",
    recipient:
      details.recipient && details.recipient.trim().length < 2
        ? "Enter the recipient shown on the completed receipt."
        : "",
  };
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
      setMessage(warning);
    } catch {
      if (mounted.current && readVersion.current === version)
        setMessage("We couldn’t read this receipt automatically. Please enter its details below.");
    } finally {
      if (workerRef.current === worker) workerRef.current = null;
      if (mounted.current && readVersion.current === version) setReading(false);
      await worker?.terminate();
    }
  }

  return (
    <form
      ref={formRef}
      {...formProps}
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending || reading || submitted) return;
        const currentForm = event.currentTarget;
        const receiptInput = currentForm.elements.namedItem("receipt");
        const currentFile =
          receiptInput instanceof HTMLInputElement ? receiptInput.files?.[0] : null;
        const fileError = imageFileError(currentFile ?? null);
        const invalidField = Array.from(currentForm.elements).find(
          (element) =>
            element instanceof HTMLInputElement &&
            element !== receiptInput &&
            !element.checkValidity(),
        );
        const customError = Object.values(detailErrors).find(Boolean);
        if (!currentFile || fileError || invalidField || customError) {
          setMessage(
            fileError ||
              customError ||
              statusMessage ||
              "Complete the required fields and correct the highlighted values.",
          );
          if (!currentFile && receiptInput instanceof HTMLInputElement) {
            receiptInput.reportValidity();
          } else if (invalidField instanceof HTMLInputElement) {
            invalidField.reportValidity();
          }
          return;
        }
        const form = new FormData(event.currentTarget);
        form.set("receipt", currentFile);
        setMessage("Submitting your receipt securely. Please keep this page open.");
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
        Upload your payment receipt
        <span className="relative mt-2 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-border bg-surface-muted px-6 py-8 text-center transition-colors hover:border-brand focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/20">
          <ImageUp aria-hidden="true" size={34} className="text-brand" />
          <span className="mt-3 font-bold text-foreground">
            {file ? file.name : "Drag and drop or browse"}
          </span>
          <span className="mt-1 text-xs font-normal text-muted-foreground">
            JPG, PNG or WebP up to 3 MB
          </span>
          <input
            name="receipt"
            type="file"
            aria-label="Upload your payment receipt"
            accept="image/jpeg,image/png,image/webp"
            required
            disabled={pending || submitted}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
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
        </span>
      </label>
      <p className="text-xs leading-5 text-muted-foreground">
        Choose the completed payment receipt, not the screen shown before sending. We store it
        privately and read it on this device. Upload it again to reread it.
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
            <span className="relative mt-2 block">
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
                aria-invalid={Boolean(detailErrors[key]) || undefined}
                aria-describedby={detailErrors[key] ? `${key}-receipt-error` : undefined}
                onChange={(event) =>
                  setDetails((current) => ({ ...current, [key]: event.target.value }))
                }
                className="min-h-12 w-full min-w-0 rounded-control border border-border bg-surface px-3 pr-11 font-normal aria-invalid:border-danger-foreground"
              />
              {details[key] ? (
                detailErrors[key] ? (
                  <CircleAlert
                    aria-hidden="true"
                    size={19}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-danger-foreground"
                  />
                ) : (
                  <CircleCheck
                    aria-hidden="true"
                    size={19}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-success-foreground"
                  />
                )
              ) : null}
            </span>
            {detailErrors[key] ? (
              <span
                id={`${key}-receipt-error`}
                className="mt-1 block text-xs font-normal leading-5 text-danger-foreground"
              >
                {detailErrors[key]}
              </span>
            ) : null}
          </label>
        ))}
        <label className="flex items-start gap-3 text-sm leading-6">
          <input name="confirmed" type="checkbox" required className="mt-1 size-5 shrink-0" />I have
          completed this payment and checked that these details match my receipt.
        </label>
      </fieldset>
      <p role="status" aria-live="polite" className="min-h-6 text-sm leading-6">
        {message}
      </p>
      <button
        type="submit"
        disabled={pending || reading || submitted}
        aria-busy={pending}
        className="min-h-12 w-full rounded-full bg-brand px-5 font-bold text-surface transition-[opacity,transform] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit for verification
      </button>
    </form>
  );
}

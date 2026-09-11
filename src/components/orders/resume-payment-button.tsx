"use client";

import { useState, useTransition } from "react";
import { resumePendingPaymentAction } from "@/app/checkout/actions";

export function ResumePaymentButton({ orderId }: { orderId: string }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function resume() {
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      const result = await resumePendingPaymentAction(orderId);
      if (result.status === "success") {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setMessage(result.message);
    });
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={resume}
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand px-5 text-sm font-bold text-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        Continue PayMongo payment
      </button>
      {message ? (
        <p role="alert" className="mt-3 text-sm leading-6 text-danger-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}

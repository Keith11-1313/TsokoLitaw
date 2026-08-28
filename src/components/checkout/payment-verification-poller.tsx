"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function PaymentVerificationPoller() {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      attempts.current += 1;
      router.refresh();
      if (attempts.current >= 10) window.clearInterval(interval);
    }, 2_000);
    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}

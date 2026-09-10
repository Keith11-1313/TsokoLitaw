"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const HIDE_AFTER_SCROLL_Y = 120;
const DOWNWARD_DISTANCE_TO_HIDE = 56;

export function CustomerHeaderFrame({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  const headerRef = useRef<HTMLElement>(null);
  const previousScrollY = useRef(0);
  const downwardDistance = useRef(0);

  useEffect(() => {
    previousScrollY.current = window.scrollY;

    function handleScroll() {
      const currentScrollY = Math.max(0, window.scrollY);
      const delta = currentScrollY - previousScrollY.current;

      if (currentScrollY <= 24) {
        downwardDistance.current = 0;
        setVisible(true);
      } else if (delta < -2) {
        downwardDistance.current = 0;
        setVisible(true);
      } else if (delta > 0) {
        downwardDistance.current += delta;
        if (
          currentScrollY > HIDE_AFTER_SCROLL_Y &&
          downwardDistance.current >= DOWNWARD_DISTANCE_TO_HIDE
        ) {
          setVisible(false);
          headerRef.current?.querySelector("details[open]")?.removeAttribute("open");
        }
      }

      previousScrollY.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      data-scroll-state={visible ? "visible" : "hidden"}
      className={cn(
        "customer-photo-background sticky top-0 z-40 py-3 transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none",
        !visible && "-translate-y-full",
      )}
    >
      {children}
    </header>
  );
}

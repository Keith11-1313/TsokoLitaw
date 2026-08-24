"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface AuthPreviewContextValue {
  isReady: boolean;
  isSignedIn: boolean;
  signInPreview: () => void;
  signOut: () => void;
}

const AuthPreviewContext = createContext<AuthPreviewContextValue | null>(null);
const STORAGE_KEY = "tsokolitaw-ui-session";

export function AuthPreviewProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(true);

  useEffect(() => {
    const storedState = window.localStorage.getItem(STORAGE_KEY);
    queueMicrotask(() => {
      setIsSignedIn(storedState !== "signed-out");
      setIsReady(true);
    });
  }, []);

  const value = useMemo<AuthPreviewContextValue>(() => ({
    isReady,
    isSignedIn,
    signInPreview: () => {
      window.localStorage.setItem(STORAGE_KEY, "signed-in");
      setIsSignedIn(true);
    },
    signOut: () => {
      window.localStorage.setItem(STORAGE_KEY, "signed-out");
      setIsSignedIn(false);
    },
  }), [isReady, isSignedIn]);

  return <AuthPreviewContext.Provider value={value}>{children}</AuthPreviewContext.Provider>;
}

export function useAuthPreview() {
  const context = useContext(AuthPreviewContext);
  if (!context) throw new Error("useAuthPreview must be used inside AuthPreviewProvider");
  return context;
}

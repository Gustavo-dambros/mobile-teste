"use client";

import * as React from "react";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const PWA_DISMISS_KEY = "pwa-install-dismissed-at";

interface PwaInstallContextValue {
  canInstall: boolean;
  installing: boolean;
  install: () => Promise<void>;
}

const PwaInstallContext = React.createContext<PwaInstallContextValue | null>(
  null
);

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installing, setInstalling] = React.useState(false);

  React.useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      toast.success("App instalado");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = React.useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "dismissed") {
        window.localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
      }
    } finally {
      setDeferred(null);
      setInstalling(false);
    }
  }, [deferred]);

  const value = React.useMemo<PwaInstallContextValue>(
    () => ({ canInstall: !!deferred, installing, install }),
    [deferred, installing, install]
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const ctx = React.useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within a PwaInstallProvider");
  }
  return ctx;
}

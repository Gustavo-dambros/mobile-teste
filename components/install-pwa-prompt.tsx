"use client";

import * as React from "react";
import { DownloadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const SW_URL = "/sw.js";
const DISMISS_KEY = "pwa-install-dismissed-at";
const RESHOW_AFTER_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

function shouldShowAfterDismiss(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return true;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts > RESHOW_AFTER_MS;
}

function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  if (process.env.NODE_ENV !== "production") return;

  navigator.serviceWorker
    .register(SW_URL, { scope: "/" })
    .catch((error) => {
      // ponytail: SW registration failure is non-fatal — app still works as a normal web page.
      console.warn("[pwa] SW registration failed:", error);
    });
}

export function InstallPwaPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);

  React.useEffect(() => {
    registerServiceWorker();

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setDeferred(evt);
      if (shouldShowAfterDismiss()) setVisible(true);
    };

    const onInstalled = () => {
      setDeferred(null);
      setVisible(false);
      toast.success("App instalado");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = React.useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "dismissed") {
        window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
    } finally {
      setDeferred(null);
      setVisible(false);
      setInstalling(false);
    }
  }, [deferred]);

  const handleDismiss = React.useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Instalar aplicativo"
      className={cn(
        "fixed bottom-4 left-1/2 z-50 -translate-x-1/2",
        "flex items-center gap-3 rounded-2xl border bg-card/95 p-2 pl-4 shadow-lg backdrop-blur",
        "max-w-[calc(100vw-2rem)] sm:max-w-sm",
        "animate-in fade-in slide-in-from-bottom-3"
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <DownloadIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">Instalar app</p>
        <p className="truncate text-xs text-muted-foreground">
          Acesse mais rápido e use offline
        </p>
      </div>
      <Button size="sm" onClick={handleInstall} disabled={installing}>
        {installing ? "Instalando..." : "Instalar"}
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={handleDismiss}
        aria-label="Fechar"
      >
        <XIcon />
      </Button>
    </div>
  );
}

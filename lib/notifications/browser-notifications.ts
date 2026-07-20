"use client"

/**
 * Native browser Notification API (not Web Push) — shows an OS-level toast
 * whenever the user is on another tab/app but this tab is still open. Does
 * nothing if the browser is fully closed — that would need a service worker
 * + push subscriptions. Shared across every feature that wants this
 * (calls, chat, tickets, kanban, announcements, access requests, ...) so
 * permission is only ever asked once per session regardless of which
 * feature triggers it first.
 */
export function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission === "default") {
    void Notification.requestPermission()
  }
}

export function notifyBrowser(
  title: string,
  body: string,
  options?: { tag?: string; requireInteraction?: boolean }
) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return
  // Tab already focused and visible — whatever in-app UI triggered this
  // (dialog, toast, badge) is enough, a duplicate OS toast would just be noise.
  if (document.visibilityState === "visible" && document.hasFocus()) return

  const notification = new Notification(title, {
    body,
    icon: "/logo.png",
    tag: options?.tag,
    requireInteraction: options?.requireInteraction ?? false,
  })
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}

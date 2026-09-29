"use client";

import { useEffect, useState } from "react";
import { IconCheck } from "./ui/icons";

const ACCOUNT_DELETION_TOAST_KEY = "healthguard-account-deletion-toast";

export function setAccountDeletionToast(message: string) {
  window.sessionStorage.setItem(ACCOUNT_DELETION_TOAST_KEY, message);
}

export default function SystemToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const pendingMessage = window.sessionStorage.getItem(ACCOUNT_DELETION_TOAST_KEY);
    if (!pendingMessage) return;
    window.sessionStorage.removeItem(ACCOUNT_DELETION_TOAST_KEY);
    window.setTimeout(() => setMessage(pendingMessage), 0);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 8000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6 sm:justify-end" role="status" aria-live="polite">
      <section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#C9DCCB] bg-[linear-gradient(145deg,#FFFFFF_0%,#FBFDF9_62%,#F1F7EF_100%)] shadow-[0_24px_64px_rgba(24,48,31,0.2)] ring-1 ring-white/90 animate-[premium-toast-in_0.3s_ease-out]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C7DDCB] bg-[#EAF4E9] text-[#276242] shadow-sm" aria-hidden="true">
            <IconCheck size={23} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#39734D]">Account closed</p>
            <h2 className="mt-1 font-display text-xl font-semibold leading-tight text-ink">Account deleted</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{message}</p>
            <p className="mt-2 text-xs font-medium text-ink-muted">You are signed out.</p>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-ink-muted transition hover:bg-brand-tint hover:text-brand-dark"
            aria-label="Dismiss account deletion confirmation"
          >
            Dismiss
          </button>
        </div>
        <div className="h-1 bg-[#E1EDE0]" aria-hidden="true">
          <div className="h-full origin-left animate-[toast-progress_8s_linear_forwards] bg-[#43805A]" />
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Toast } from "./ui/primitives";

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
    const timer = window.setTimeout(() => setMessage(pendingMessage), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return message ? <Toast message={message} onDismiss={() => setMessage(null)} /> : null;
}

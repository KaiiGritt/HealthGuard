"use client";

import Link from "next/link";
import { useState } from "react";
import { forgotPassword, resetPassword } from "@/lib/api";
import AuthLayout from "../components/AuthLayout";
import { ErrorAlert, SuccessAlert, authFormStackClass, authInputClass, authSubmitClass } from "../components/ui/primitives";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [stage, setStage] = useState<"request" | "reset">("request");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const result = await forgotPassword(email.trim());
      setMessage(result.message);
      setStage("reset");
    } catch (err) {
      setError(err instanceof Error && err.message.includes("503") ? "Email delivery is not configured. Please contact support." : "Could not send the reset code.");
    } finally { setSubmitting(false); }
  }

  async function reset(event: React.FormEvent) {
    event.preventDefault();
    if (code.trim().length !== 6 || newPassword.length < 8) {
      setError("Enter the 6-digit code and a password of at least 8 characters.");
      return;
    }
    setSubmitting(true); setError(null);
    try {
      await resetPassword(email.trim(), code.trim(), newPassword);
      window.location.href = "/assessment";
    } catch {
      setError("The code is incorrect or expired. Please request a new one.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      step={stage === "request" ? "Step 1 of 2" : "Step 2 of 2"}
      title={stage === "request" ? "Forgot your password?" : "Set a new password"}
      subtitle={stage === "request" ? "We will send a verification code to your email." : `Enter the code sent to ${email}.`}
      footer={<><Link href="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link></>}
    >
      {message && <SuccessAlert>{message}</SuccessAlert>}
      <form onSubmit={stage === "request" ? requestCode : reset} className={`${authFormStackClass} mt-6 rounded-2xl border border-brand/10 bg-gradient-to-b from-white to-surface/80 p-4 shadow-[0_18px_40px_rgba(24,38,25,0.06)] sm:p-5`}>
        <label htmlFor="email" className="text-sm font-semibold text-ink">Email address</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={authInputClass} disabled={stage === "reset"} placeholder="you@example.com" />
        {stage === "reset" && <>
          <label htmlFor="code" className="text-sm font-semibold text-ink">Verification code / Code sa email</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={authInputClass} placeholder="000000" />
          <label htmlFor="new-password" className="text-sm font-semibold text-ink">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={authInputClass} placeholder="At least 8 characters" />
        </>}
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <button type="submit" disabled={submitting} className={authSubmitClass}>{submitting ? "Please wait…" : stage === "request" ? "Send verification code" : "Reset password"}</button>
        {stage === "reset" && <button type="button" onClick={() => { setStage("request"); setMessage(null); setError(null); }} className="text-sm font-semibold text-brand hover:underline">Use a different email</button>}
      </form>
    </AuthLayout>
  );
}

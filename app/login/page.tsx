"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthLayout from "../components/AuthLayout";
import { IconEye, IconEyeOff } from "@/app/components/ui/icons";
import { IconShield } from "@/app/components/ui/icons";
import {
  AuthProField,
  ErrorAlert,
  authFormStackClass,
  authInputClass,
  authSubmitClass,
  cn,
} from "@/app/components/ui/primitives";
import { login } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError("Please enter both your email and password.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.push(next);
      router.refresh();
    } catch {
      setError("Incorrect email or password.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Access your saved assessments, health history, and profile settings."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-brand/15 bg-brand-tint/65 px-3.5 py-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-[0_6px_14px_rgba(47,107,79,0.18)]">
          <IconShield size={17} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-dark">Secure health workspace</p>
          <p className="mt-0.5 text-xs text-ink-muted">Your account keeps assessments private.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={cn(authFormStackClass, "rounded-2xl border border-brand/15 bg-gradient-to-b from-white via-white to-surface/80 p-4 shadow-[0_18px_40px_rgba(24,38,25,0.07)] ring-1 ring-white sm:p-5")}>
        <AuthProField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <AuthProField id="password" label="Password">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(authInputClass, "bg-gradient-to-r from-white to-surface/80 pr-11")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-faint transition hover:text-ink-secondary"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
          </button>
        </AuthProField>

        <div className="-mt-3 text-right">
          <Link href="/forgot-password" className="text-sm font-semibold text-brand hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <button type="submit" disabled={submitting} className={cn(authSubmitClass, "mt-1 shadow-[0_14px_28px_rgba(31,74,54,0.2)]")}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint">
        By signing in, you agree to use HealthGuard as a decision-support tool only — not as a medical diagnosis.
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-pro-shell min-h-screen bg-white" />}>
      <LoginForm />
    </Suspense>
  );
}

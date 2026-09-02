"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { register, verifyEmail } from "@/lib/api";
import { irosinBarangays } from "@/app/constants/irosinBarangays";
import AuthLayout from "../components/AuthLayout";
import { IconEye, IconEyeOff } from "@/app/components/ui/icons";
import {
  AuthProField,
  ErrorAlert,
  authFormStackClass,
  authInputClass,
  authLabelClass,
  authSelectClass,
  authSubmitClass,
  cn,
} from "@/app/components/ui/primitives";

function PremiumDropdown({
  id,
  value,
  placeholder,
  options,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selected = options.find((option) => option.value === value) ?? { label: placeholder, value: "" };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        id={id}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          authSelectClass,
          "flex items-center justify-between px-3.75 text-left",
          !value && "text-ink-faint",
        )}
      >
        <span className="truncate">{selected.label}</span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={cn("h-4 w-4 text-ink-faint transition-transform duration-200", open && "rotate-180")}
        >
          <path d="M5.5 7.5L10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-brand/10 bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBF4_100%)] shadow-[0_22px_50px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
          <div className="border-b border-border/80 bg-surface/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Choose an option
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {options.map((option) => (
              <button
                key={option.value || "empty"}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200",
                  value === option.value
                    ? "bg-brand-tint text-brand-dark shadow-[inset_0_0_0_1px_rgba(47,107,79,0.2)]"
                    : "text-ink-secondary hover:bg-surface hover:text-ink",
                )}
              >
                <span className="font-medium">{option.label}</span>
                {value === option.value && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-foreground">
                    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M5 10.5 8.2 13.7 15 6.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    age: "",
    sex: "",
    barangay: "",
    phone_number: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerificationStage, setIsVerificationStage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const formatPhilippinePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("63")) {
      return `+63 ${digits.slice(2)}`;
    }
    if (digits.startsWith("0")) {
      return digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
    }
    return `+63 ${digits}`;
  };

  const passwordStrength =
    form.password.length >= 12 ? "Strong" : form.password.length >= 8 ? "Good" : form.password.length > 0 ? "Too short" : "";
  const strengthWidth =
    form.password.length === 0 ? "0%" : form.password.length >= 12 ? "100%" : form.password.length >= 8 ? "65%" : "30%";
  const strengthColor =
    form.password.length >= 12 ? "bg-brand" : form.password.length >= 8 ? "bg-health-green" : "bg-warn-amber";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.full_name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!form.barangay) {
      setError("Please select your barangay.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        age: form.age ? Number(form.age) : null,
        sex: form.sex || null,
        barangay: form.barangay.trim() || null,
        phone_number: form.phone_number.trim() || null,
      });
      setIsVerificationStage(true);
      setSubmitting(false);
      setError(null);
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes("409")
          ? "An account with this email already exists."
          : err instanceof Error && err.message.includes("503")
            ? "We could not send a verification email. Please try again later or contact support."
            : "Could not create your account. Please check your details.";
      setError(msg);
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError("Please enter the verification code from your email.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await verifyEmail({ email: form.email.trim(), code: verificationCode.trim() });
      router.push("/assessment");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes("410")
          ? "The verification code has expired. Please register again."
          : "The verification code is incorrect. Please try again.";
      setError(msg);
      setSubmitting(false);
    }
  }

  if (isVerificationStage) {
    return (
      <AuthLayout
        step="Step 2 of 2"
        title="Verify your email"
        subtitle="Enter the 6-digit code we sent to complete your registration."
        footer={
          <>
            Already verified?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <div className="mb-6 rounded-md border border-border bg-surface px-4 py-3 text-sm text-ink-secondary">
          Code sent to <span className="font-medium text-ink">{form.email}</span>
        </div>

        <form onSubmit={handleVerify} className={authFormStackClass}>
          <AuthProField
            id="verification_code"
            label="Verification code"
            hint="(Code sa pagpapatunay)"
            autoComplete="one-time-code"
            required
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          {error && <ErrorAlert>{error}</ErrorAlert>}
          <button type="submit" disabled={submitting} className={authSubmitClass}>
            {submitting ? "Verifying…" : "Complete registration"}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      step="Step 1 of 2"
      title="Create your account"
      subtitle="Register to save assessments and access your health history across visits."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cn(authFormStackClass, "rounded-2xl border border-brand/10 bg-gradient-to-b from-white to-surface/80 p-4 shadow-[0_18px_40px_rgba(24,38,25,0.06)] sm:p-5")}>
        <AuthProField
          id="full_name"
          label="Full name"
          hint="/ Buong pangalan"
          autoComplete="name"
          required
          placeholder="Juan Dela Cruz"
          value={form.full_name}
          onChange={set("full_name")}
        />

        <AuthProField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={form.email}
          onChange={set("email")}
        />

        <AuthProField id="password" label="Password" hint="(min. 8 characters)">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Create a password"
            value={form.password}
            onChange={set("password")}
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

        {passwordStrength && (
          <div className="-mt-2">
            <div className="h-1 overflow-hidden rounded-full bg-border-soft">
              <div className={cn("h-full rounded-full transition-all duration-300", strengthColor)} style={{ width: strengthWidth }} />
            </div>
            <p className="mt-1.5 text-xs text-ink-faint">{passwordStrength}</p>
          </div>
        )}

        <fieldset className="rounded-2xl border border-border bg-white/60 px-4 pb-4 pt-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <legend className="px-1 text-xs font-medium uppercase tracking-wider text-ink-faint">Profile details</legend>

          <div className="mt-3">
            <label htmlFor="phone_number" className={authLabelClass}>
              Phone number
            </label>
            <input
              id="phone_number"
              type="tel"
              placeholder="09XX XXX XXXX"
              value={form.phone_number}
              onChange={(e) => setForm((f) => ({ ...f, phone_number: formatPhilippinePhone(e.target.value) }))}
              className={cn(authInputClass, "mt-1.5")}
            />
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="age" className={authLabelClass}>
                Age
              </label>
              <input
                id="age"
                type="number"
                min={0}
                max={150}
                placeholder="—"
                value={form.age}
                onChange={set("age")}
                className={cn(authInputClass, "mt-1.5")}
              />
            </div>
            <div>
              <label htmlFor="sex" className={authLabelClass}>
                Sex
              </label>
              <div className="mt-1.5">
                <PremiumDropdown
                  id="sex"
                  value={form.sex}
                  placeholder="—"
                  options={[
                    { label: "Female", value: "female" },
                    { label: "Male", value: "male" },
                  ]}
                  onChange={(value) => setForm((current) => ({ ...current, sex: value }))}
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="barangay" className={authLabelClass}>
              Barangay
            </label>
            <div className="mt-1.5">
              <PremiumDropdown
                id="barangay"
                value={form.barangay}
                placeholder="Select barangay"
                options={irosinBarangays.map((barangay) => ({ label: barangay, value: barangay }))}
                onChange={(value) => setForm((current) => ({ ...current, barangay: value }))}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-faint">Used to route urgent cases to the nearest health station.</p>
          </div>
        </fieldset>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <button type="submit" disabled={submitting} className={authSubmitClass}>
          {submitting ? "Creating account…" : "Continue to verification"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-ink-faint">
        Mag-sign up para masave ang iyong mga pagsusuri.
      </p>
    </AuthLayout>
  );
}

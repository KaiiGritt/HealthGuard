"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearPendingGuestPayload, getPendingGuestPayload, register, saveGuestAssessment, verifyEmail } from "@/lib/api";
import { irosinBarangays } from "@/app/constants/irosinBarangays";
import AuthLayout from "../components/AuthLayout";
import PremiumDatePicker from "../components/ui/PremiumDatePicker";
import { IconEye, IconEyeOff, IconShield } from "@/app/components/ui/icons";
import {
  AuthProField,
  ErrorAlert,
  PremiumSelect,
  authFormStackClass,
  authInputClass,
  authLabelClass,
  authSubmitClass,
  cn,
} from "@/app/components/ui/primitives";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    date_of_birth: "",
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
      const local = digits.slice(2, 12);
      return `+63 ${local.slice(0, 3)}${local.length > 3 ? ` ${local.slice(3, 6)}` : ""}${local.length > 6 ? ` ${local.slice(6, 10)}` : ""}`.trim();
    }
    if (digits.startsWith("0")) {
      const local = digits.slice(0, 11);
      return `${local.slice(0, 4)}${local.length > 4 ? ` ${local.slice(4, 7)}` : ""}${local.length > 7 ? ` ${local.slice(7, 11)}` : ""}`;
    }
    return digits.slice(0, 11);
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const birth = new Date(`${dateOfBirth}T00:00:00`);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
    return age;
  };

  const passwordChecks = [
    { label: "8+ characters", valid: form.password.length >= 8 },
    { label: "Uppercase and lowercase", valid: /[a-z]/.test(form.password) && /[A-Z]/.test(form.password) },
    { label: "At least one number", valid: /\d/.test(form.password) },
    { label: "Special character", valid: /[^A-Za-z0-9]/.test(form.password) },
  ];
  const passwordScore = passwordChecks.filter((check) => check.valid).length;
  const passwordStrength =
    form.password.length === 0 ? "" : passwordScore <= 1 ? "Weak" : passwordScore === 2 ? "Fair" : passwordScore === 3 ? "Good" : "Strong";
  const strengthColor = passwordScore <= 1 ? "bg-warn-amber" : passwordScore === 2 ? "bg-health-green/70" : "bg-brand";

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
    if (passwordScore < passwordChecks.length) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.");
      return;
    }
    if (!form.barangay) {
      setError("Please select your barangay.");
      return;
    }
    const age = calculateAge(form.date_of_birth);
    if (!form.date_of_birth || age === null || age < 0 || age > 120) {
      setError("Please enter a valid date of birth for an age from 0 to 120.");
      return;
    }
    if (!form.phone_number.trim()) {
      setError("Please enter your Philippine mobile number.");
      return;
    }
    if (!/^(09\d{2} \d{3} \d{4}|\+63 \d{3} \d{3} \d{4})$/.test(form.phone_number)) {
      setError("Use a Philippine mobile number like 0994 620 6773 or +63 994 620 6773.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        date_of_birth: form.date_of_birth,
        sex: form.sex || null,
        barangay: form.barangay.trim() || null,
        phone_number: form.phone_number.trim(),
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
      const pending = getPendingGuestPayload();
      if (pending) {
        const saved = await saveGuestAssessment(pending);
        clearPendingGuestPayload();
        router.push(`/result/${saved.id}`);
      } else {
        router.push("/assessment");
      }
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
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-brand/15 bg-brand-tint/65 px-3.5 py-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-[0_6px_14px_rgba(47,107,79,0.18)]">
          <IconShield size={17} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-dark">Private health profile</p>
          <p className="mt-0.5 text-xs text-ink-muted">Your details help guide safer assessments.</p>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit} className={cn(authFormStackClass, "rounded-2xl border border-brand/15 bg-gradient-to-b from-white via-white to-surface/80 p-4 shadow-[0_18px_40px_rgba(24,38,25,0.07)] ring-1 ring-white sm:p-5")}>
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

        {form.password && (
          <div className="-mt-2 rounded-xl border border-border-soft bg-surface/70 px-3.5 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink-secondary">Password strength</span>
              <span className={cn("font-semibold", passwordScore >= 3 ? "text-brand-dark" : "text-warn-amber")}>{passwordStrength}</span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5" aria-label={`Password strength: ${passwordStrength}`}>
              {passwordChecks.map((check, index) => (
                <span key={check.label} className={cn("h-1.5 rounded-full transition-all duration-300", index < passwordScore ? strengthColor : "bg-border-soft")} />
              ))}
            </div>
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {passwordChecks.map((check) => (
                <p key={check.label} className={cn("flex items-center gap-1.5 text-[11px]", check.valid ? "text-brand-dark" : "text-ink-faint")}>
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[10px]", check.valid ? "bg-brand-tint text-brand-dark" : "bg-border-soft text-ink-faint")} aria-hidden="true">{check.valid ? "✓" : "·"}</span>
                  {check.label}
                </p>
              ))}
            </div>
          </div>
        )}

          <fieldset className="rounded-2xl border border-brand/15 bg-brand-tint/35 px-4 pb-4 pt-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <legend className="px-1 text-xs font-medium uppercase tracking-wider text-ink-faint">Profile details</legend>

          <div className="mt-3">
            <label htmlFor="phone_number" className={authLabelClass}>
              Phone number
            </label>
            <input
              id="phone_number"
              type="tel"
              required
              placeholder="09XX XXX XXXX"
              value={form.phone_number}
              onChange={(e) => setForm((f) => ({ ...f, phone_number: formatPhilippinePhone(e.target.value) }))}
              className={cn(authInputClass, "mt-1.5")}
            />
          </div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="date_of_birth" className={authLabelClass}>Date of birth</label>
                <div className="mt-1.5"><PremiumDatePicker id="date_of_birth" label="Date of birth" required value={form.date_of_birth} onChange={(value) => setForm((current) => ({ ...current, date_of_birth: value }))} /></div>
              </div>
            <div>
              <label htmlFor="sex" className={authLabelClass}>
                Sex
              </label>
              <div className="relative mt-1.5">
                <PremiumSelect value={form.sex} onChange={(value) => setForm((current) => ({ ...current, sex: value }))} ariaLabel="Sex" options={[{ value: "", label: "—" }, { value: "female", label: "Female" }, { value: "male", label: "Male" }]} />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="barangay" className={authLabelClass}>
              Barangay
            </label>
            <div className="relative mt-1.5">
              <PremiumSelect value={form.barangay} onChange={(value) => setForm((current) => ({ ...current, barangay: value }))} ariaLabel="Barangay" className="w-full" options={[{ value: "", label: "Select barangay" }, ...irosinBarangays.map((barangay) => ({ value: barangay, label: barangay }))]} />
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

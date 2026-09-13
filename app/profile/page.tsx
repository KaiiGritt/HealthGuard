"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { IconCamera, IconCheck, IconEye, IconEyeOff, IconFolder, IconLock, IconPlus, IconProfile } from "@/app/components/ui/icons";
import {
  ErrorAlert,
  formStackClass,
  inputClass,
  labelClass,
  labelHintClass,
  PageMain,
  PremiumSelect,
  PrimaryLink,
  selectClass,
  submitButtonClass,
  SuccessAlert,
  Toast,
} from "@/app/components/ui/primitives";
import { irosinBarangays } from "@/app/constants/irosinBarangays";
import { useInterfaceLanguage } from "@/app/components/LanguageProvider";
import { setAccountDeletionToast } from "@/app/components/SystemToast";
import { changePassword, deleteAccount, getMe, getProfileAudit, updateProfile, type ProfileAuditEntry, type User } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import PremiumDatePicker from "../components/ui/PremiumDatePicker";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatPhilippinePhone(value: string) {
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
}

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age;
}

const AUDIT_FIELD_LABELS: Record<string, string> = {
  full_name: "Name",
  date_of_birth: "Date of birth",
  sex: "Sex",
  barangay: "Barangay",
  phone_number: "Mobile number",
  language_preference: "Language",
  notification_preferences: "Notifications",
};

function formatAuditValue(value: unknown, field?: string): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return value ? "enabled" : "disabled";
  if (field === "sex" && typeof value === "string") return value.charAt(0).toUpperCase() + value.slice(1);
  if (field === "language_preference" && typeof value === "string") {
    return value === "fil" ? "Filipino" : value === "both" ? "English + Filipino" : "English";
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.join(", ");
    const preferences = value as Record<string, unknown>;
    if (field === "notification_preferences") {
      return ["email", "sms", "push"]
        .filter((key) => key in preferences)
        .map((key) => `${key.toUpperCase()} ${preferences[key] ? "enabled" : "disabled"}`)
        .join(" · ");
    }
    return Object.entries(preferences).map(([key, item]) => `${key}: ${formatAuditValue(item)}`).join(", ");
  }
  return String(value);
}

function formatAuditEntry(entry: ProfileAuditEntry) {
  const actionLabel = entry.action === "profile_update" ? "Profile details updated" : entry.action === "password_changed" ? "Password updated" : entry.action === "account_deactivated" ? "Account deactivated" : entry.action.replace(/_/g, " ");

  try {
    const parsed = JSON.parse(entry.details);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const lines = Object.entries(parsed).map(([key, value]) => {
        if (value && typeof value === "object" && "from" in value && "to" in value) {
          const change = value as { from?: unknown; to?: unknown };
          const label = AUDIT_FIELD_LABELS[key] ?? key.replace(/_/g, " ");
          const from = formatAuditValue(change.from, key);
          const to = formatAuditValue(change.to, key);
          return `${label}: ${from} → ${to}`;
        }
        const label = AUDIT_FIELD_LABELS[key] ?? key.replace(/_/g, " ");
        return `${label}: ${formatAuditValue(value, key)}`;
      });
      return { actionLabel, lines: lines.length > 0 ? lines : [entry.details] };
    }
  } catch {
    // Fall back to the raw detail text if it is not JSON.
  }

  return { actionLabel, lines: [entry.details] };
}

const LANGUAGE_LABELS = {
  en: "English",
  fil: "Filipino",
  both: "English + Filipino",
} as const;

export default function ProfilePage() {
  const { language, setLanguage } = useInterfaceLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ full_name: "", date_of_birth: "", sex: "", barangay: "", phone_number: "", language_preference: "en" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, next: false, confirm: false });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [auditLog, setAuditLog] = useState<ProfileAuditEntry[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const current = await getMe();
        if (!current) {
          setUser(null);
          setLoading(false);
          return;
        }
        const photoStorageKey = `healthguard-profile-photo-${current.id}`;
        const storedPhoto = typeof window !== "undefined" ? window.localStorage.getItem(photoStorageKey) : null;
        const preferredLanguage = "en" as const;
        setUser(current);
        setLanguage(preferredLanguage);
        setPhotoUrl(storedPhoto ?? null);
        setForm({
          full_name: current.full_name ?? "",
          date_of_birth: current.date_of_birth?.slice(0, 10) ?? "",
          sex: current.sex ?? "",
          barangay: current.barangay ?? "",
          phone_number: formatPhilippinePhone(current.phone_number ?? ""),
          language_preference: preferredLanguage,
        });
        if (typeof window !== "undefined") {
          window.localStorage.setItem("healthguard-language", preferredLanguage);
        }
        const entries = await getProfileAudit();
        setAuditLog(entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    if (!form.full_name.trim()) {
      setError("Please enter your full name.");
      setSaving(false);
      return;
    }
    if (!form.date_of_birth) {
      setError("Please enter your date of birth.");
      setSaving(false);
      return;
    }
    const today = new Date();
    const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (form.date_of_birth >= todayValue) {
      setError("Your date of birth must be before today. Please choose an earlier date.");
      setSaving(false);
      return;
    }
    if (!form.sex) {
      setError("Please select your sex.");
      setSaving(false);
      return;
    }
    if (!form.barangay) {
      setError("Please select your barangay.");
      setSaving(false);
      return;
    }
    if (!form.phone_number.trim()) {
      setError("Please enter your Philippine mobile number.");
      setSaving(false);
      return;
    }
    const age = calculateAge(form.date_of_birth);
    if (form.date_of_birth && (age === null || age < 0 || age > 120)) {
      setError("Date of birth must produce an age from 0 to 120.");
      setSaving(false);
      return;
    }
    if (!/^(09\d{2} \d{3} \d{4}|\+63 \d{3} \d{3} \d{4})$/.test(form.phone_number)) {
      setError("Use a Philippine mobile number like 0994 620 6773 or +63 994 620 6773.");
      setSaving(false);
      return;
    }
    try {
      const updated = await updateProfile({
        full_name: form.full_name.trim() || undefined,
        date_of_birth: form.date_of_birth || null,
        sex: form.sex || null,
        barangay: form.barangay.trim() || null,
        phone_number: form.phone_number.trim() || null,
        language_preference: form.language_preference || "en",

      });
      setUser(updated);
      const nextLanguage = "en" as const;
      setLanguage(nextLanguage);
      setForm((prev) => ({ ...prev, language_preference: nextLanguage }));

      const nextAudit = await getProfileAudit();
      setAuditLog(nextAudit);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("healthguard-language", nextLanguage);
      }
      setMessage("Profile updated. / Na-update na.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(event: FormEvent) {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordForm.next.length < 8) {
      setPasswordError("Use at least 8 characters for a stronger password.");
      return;
    }
    setChangingPassword(true);
    try {
      const result = await changePassword(passwordForm.current, passwordForm.next);
      setPasswordMessage(result.message);
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPasswordError(err instanceof Error && err.message.includes("Current password") ? "Current password is incorrect." : "Could not change your password.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user || deletingAccount) return;
    const confirmed = window.confirm("Delete your account and personal data permanently? This cannot be undone.");
    if (!confirmed) return;

    setDeletingAccount(true);
    setError(null);
    try {
      await deleteAccount();
      window.localStorage.removeItem(`healthguard-profile-photo-${user.id}`);
      setAccountDeletionToast("Your account and personal data have been deleted.");
      window.location.assign("/");
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Unable to delete your account.", tone: "error" });
      setDeletingAccount(false);
    }
  }

  function scorePassword(value: string) {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  }

  const passwordStrength = scorePassword(passwordForm.next);
  const passwordStrengthLabel = passwordStrength <= 1 ? "Weak" : passwordStrength === 2 ? "Fair" : passwordStrength === 3 ? "Good" : "Strong";
  const passwordStrengthColor = passwordStrength <= 1 ? "bg-red-200" : passwordStrength === 2 ? "bg-yellow-200" : passwordStrength === 3 ? "bg-brand/30" : "bg-green-200";

  function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setToast({ message: "Please choose an image file.", tone: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: "Please choose an image smaller than 5 MB.", tone: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const nextUrl = typeof reader.result === "string" ? reader.result : null;
      setPhotoUrl(nextUrl);
      if (typeof window !== "undefined" && nextUrl) {
        window.localStorage.setItem(`healthguard-profile-photo-${user.id}`, nextUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  const labels = {
    heading: language === "fil" ? "Personal details" : language === "both" ? "Personal details / Mga detalye" : "Personal details",
    description: language === "fil" ? "Update the information attached to your assessments." : language === "both" ? "Update the information attached to your assessments. / I-update ang impormasyon sa iyong pagsusuri." : "Update the information attached to your assessments.",
    fullName: language === "fil" ? "Buong pangalan" : language === "both" ? "Full name / Buong pangalan" : "Full name",
    dateOfBirth: language === "fil" ? "Petsa ng kapanganakan" : language === "both" ? "Date of birth / Petsa ng kapanganakan" : "Date of birth",
    sex: language === "fil" ? "Kasarian" : language === "both" ? "Sex / Kasarian" : "Sex",
    barangay: language === "fil" ? "Barangay" : language === "both" ? "Barangay / Barangay" : "Barangay",
    phone: language === "fil" ? "Numero ng telepono" : language === "both" ? "Phone number / Numero ng telepono" : "Phone number",
    interface: language === "fil" ? "Wika" : language === "both" ? "Interface language / Wika" : "Interface language",
    save: language === "fil" ? "I-save ang profile" : language === "both" ? "Save profile / I-save" : "Save profile",
    saveState: language === "fil" ? "Sine-save…" : language === "both" ? "Saving… / Sine-save…" : "Saving…",
    changePassword: language === "fil" ? "Palitan ang password" : language === "both" ? "Change password / Palitan ang password" : "Change password",
    passwordHint: language === "fil" ? "I-update ang iyong password nang ligtas." : language === "both" ? "Update your sign-in password securely. / I-update ang iyong password nang ligtas." : "Update your sign-in password securely.",
  } as const;

  if (loading) {
    return (
      <div className="premium-page min-h-screen">
        <PageHeader />
        <PageMain>
          <section className="premium-skeleton relative overflow-hidden rounded-[30px] p-6 sm:p-9">
            <div className="grid gap-8 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-10">
              <div className="h-16 w-16 flex-none rounded-2xl bg-white/45" />
              
              <div className="min-w-0 space-y-3">
                <div className="h-4 w-32 rounded bg-white/45" />
                <div className="h-10 w-64 rounded bg-white/45" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-white/45" />
                  <div className="h-3 w-5/6 rounded bg-white/45" />
                </div>
              </div>

              <div className="h-20 w-48 rounded-2xl bg-white/45" />
            </div>
          </section>

          <div className="mt-8 space-y-8">
            {[1, 2, 3].map((idx) => (
              <section key={idx} className="rounded-[24px] border border-border-soft bg-card p-6 shadow-[0_12px_28px_rgba(24,38,25,0.04)] sm:p-8">
                <div className="premium-skeleton mb-6 h-6 w-40 rounded" />
                <div className="space-y-4">
                  {[1, 2, 3].map((jdx) => (
                    <div key={jdx}>
                      <div className="premium-skeleton mb-2 h-4 w-24 rounded" />
                      <div className="premium-skeleton h-11 w-full rounded-xl" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </PageMain>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="premium-page min-h-screen">
        <PageHeader />
        <PageMain>
          <div className="rounded-2xl border border-border-soft bg-card p-10">
            <h1 className="font-display text-2xl text-ink">Profile</h1>
            <p className="mt-3 text-ink-secondary">Please log in to view or update your profile.</p>
            <PrimaryLink href="/login" className="mt-6">Go to login</PrimaryLink>
          </div>
        </PageMain>
      </div>
    );
  }

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en", { month: "short", year: "numeric" })
    : "—";
  const recordNo = `${(user.barangay || "HG").slice(0, 4).toUpperCase()}-${String(user.id ?? "0000").padStart(4, "0")}`;

  const reasons = [
    {
      label: "Age & sex",
      copy: "Narrow the checklist to the right symptoms for that patient.",
    },
    {
      label: "Barangay",
      copy: "Routes a red-flag case to the correct health station automatically.",
    },
    {
      label: "Full name",
      copy: "Keeps an assessment traceable if a case needs follow-up.",
    },
  ];

  return (
    <div className="premium-page min-h-screen">
      <PageHeader />
      <PageMain>
        {/* Record card */}
        <section className="motion-safe:animate-[recordReveal_0.6s_ease-out] relative overflow-hidden rounded-[30px] border border-[#D1D9CF] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.28),_transparent_30%),linear-gradient(135deg,#183D2D_0%,#1F4A36_42%,#2E6A52_100%)] text-brand-foreground shadow-[0_28px_60px_rgba(23,63,45,0.18)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-[#F4D58D]" />
          <div className="grid gap-8 p-6 sm:p-9 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-10 lg:p-10">
            <div className="relative flex w-fit flex-none">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-white/35 bg-white/10 font-display text-3xl font-semibold shadow-[0_16px_34px_rgba(8,35,22,0.22)] ring-4 ring-white/10 transition duration-200 hover:scale-[1.03] hover:ring-white/25 sm:h-28 sm:w-28"
                aria-label="Upload profile photo"
              >
                {photoUrl ? (
                  <Image src={photoUrl} alt="Profile preview" fill sizes="112px" className="object-cover" />
                ) : (
                  <span>{initials(user.full_name)}</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-[#10271d]/55 text-[10px] font-mono uppercase tracking-[0.12em] text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  Change photo
                </span>
              </button>
              <span className="pointer-events-none absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#1F4A36] bg-[#F4D58D] text-[#183D2D] shadow-[0_8px_18px_rgba(8,35,22,0.2)]">
                <IconCamera size={16} />
              </span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

            <div className="min-w-0">
              <h1 className="mt-1 truncate font-display text-3xl font-semibold sm:text-4xl">
                {user.full_name}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-foreground/80">
                These details travel with every assessment you run, so a case can be traced back
                to the right patient and barangay.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-white/20 pt-6 text-sm md:grid-cols-1 md:border-t-0 md:border-l md:pl-8 md:pt-0">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-brand-foreground/60">Role</p>
                <p className="mt-1 font-semibold capitalize text-white">{user.role}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-brand-foreground/60">Record no.</p>
                <p className="mt-1 font-mono text-xs font-semibold tracking-tight text-white">{recordNo}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-brand-foreground/60">Joined</p>
                <p className="mt-1 font-semibold text-white">{joinedDate}</p>
              </div>
            </div>
          </div>
        </section>

        <style jsx>{`
          @keyframes recordReveal {
            from {
              opacity: 0;
              transform: translateY(6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {/* Profile form */}
            <div className="relative overflow-hidden rounded-[24px] border border-[#D5E0D3] bg-[linear-gradient(145deg,#FFFFFF_0%,#FBFCF9_54%,#F2F7EF_100%)] p-5 shadow-[0_22px_48px_rgba(15,23,42,0.07)] ring-1 ring-white/80 sm:p-7 lg:p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
              <div className="flex items-start gap-3 border-b border-[#E1E9DF] pb-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand/15 bg-brand-tint text-brand shadow-[0_6px_16px_rgba(47,107,79,0.1)]">
                  <IconProfile size={21} />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">Identity record</p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-ink">{labels.heading}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{labels.description}</p>
                </div>
              </div>

              <form noValidate onSubmit={handleSubmit} className={`mt-7 ${formStackClass}`}>
                <div>
                  <label className={`mb-1.5 flex items-baseline gap-2 ${labelClass}`}>
                    {labels.fullName} <span className={labelHintClass}>{language === "en" ? "/ Buong pangalan" : language === "fil" ? "/ Buong pangalan" : "/ Buong pangalan"}</span>
                  </label>
                    <input
                    value={form.full_name}
                    onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="date_of_birth" className={`mb-1.5 flex items-baseline gap-2 ${labelClass}`}>{labels.dateOfBirth}</label>
                    <PremiumDatePicker id="date_of_birth" label={labels.dateOfBirth} required value={form.date_of_birth} onChange={(value) => setForm((prev) => ({ ...prev, date_of_birth: value }))} />
                    <p className="mt-1.5 text-xs text-ink-faint">Age is calculated automatically: {calculateAge(form.date_of_birth) ?? "—"}.</p>
                  </div>
                  <div>
                    <label className={`mb-1.5 flex items-baseline gap-2 ${labelClass}`}>
                      {labels.sex} <span className={labelHintClass}>{language === "en" ? "/ Kasarian" : language === "fil" ? "/ Kasarian" : "/ Kasarian"}</span>
                    </label>
                    <PremiumSelect
                      value={form.sex}
                      onChange={(value) => setForm((prev) => ({ ...prev, sex: value }))}
                      ariaLabel={labels.sex}
                      className="w-full"
                      options={[{ value: "", label: "Select" }, { value: "female", label: "Female" }, { value: "male", label: "Male" }]}
                    />
                  </div>
                </div>
                <div>
                  <label className={`mb-1.5 flex items-baseline gap-2 ${labelClass}`}>
                    {labels.barangay} <span className={labelHintClass}>/ Barangay</span>
                  </label>
                  <PremiumSelect
                    value={form.barangay}
                    onChange={(value) => setForm((prev) => ({ ...prev, barangay: value }))}
                    ariaLabel={labels.barangay}
                    className="w-full"
                    options={[{ value: "", label: "Select barangay" }, ...irosinBarangays.map((barangay) => ({ value: barangay, label: barangay }))]}
                  />
                  <p className="mt-1.5 text-xs text-ink-faint">Routes urgent (red) cases to the nearest health station.</p>
                </div>

                <div>
                  <label className={`mb-1.5 flex items-baseline gap-2 ${labelClass}`}>
                    {labels.phone} <span className={labelHintClass}>/ Numero ng telepono</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone_number}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone_number: formatPhilippinePhone(event.target.value) }))}
                    className={inputClass}
                    placeholder="09XX XXX XXXX"
                  />
                </div>

                <div>
                  <label className={`mb-1.5 flex items-baseline gap-2 ${labelClass}`}>
                    {labels.interface} <span className={labelHintClass}>/ Wika</span>
                  </label>
                  <PremiumSelect
                    value={form.language_preference}
                    onChange={(value) => setForm((prev) => ({ ...prev, language_preference: value }))}
                    ariaLabel={labels.interface}
                    className="w-full"
                    options={[{ value: "en", label: LANGUAGE_LABELS.en }, { value: "fil", label: LANGUAGE_LABELS.fil }, { value: "both", label: LANGUAGE_LABELS.both }]}
                  />
                </div>

                {message && <SuccessAlert>{message}</SuccessAlert>}
                {error && <ErrorAlert>{error}</ErrorAlert>}
                <button type="submit" disabled={saving} className={`${submitButtonClass} gap-2 shadow-[0_14px_26px_rgba(47,107,79,0.2)]`}>
                  {saving ? labels.saveState : <><IconCheck size={17} />{labels.save}</>}
                </button>
              </form>
            </div>

            {/* Password */}
            <div className="relative overflow-hidden rounded-[24px] border border-[#DDE7DB] bg-[radial-gradient(circle_at_top_right,_rgba(244,213,141,0.14),_transparent_28%),linear-gradient(180deg,#FFFFFF_0%,#F7FAF4_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-7 lg:p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand/15 bg-brand-tint text-brand-dark shadow-sm">
                  <IconLock size={20} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">{labels.changePassword}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{labels.passwordHint}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-brand/15 bg-brand-tint/50 px-3.5 py-2.5 text-xs text-brand-dark">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                Use a unique password you do not use on another account.
              </div>
              <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
                <label className="block space-y-1.5">
                  <span className={labelClass}>Current password</span>
                  <div className="relative">
                    <input type={visiblePasswords.current ? "text" : "password"} required autoComplete="current-password" placeholder="Enter your current password" value={passwordForm.current} onChange={(event) => setPasswordForm((prev) => ({ ...prev, current: event.target.value }))} className={`${inputClass} pr-12`} />
                    <button type="button" onClick={() => setVisiblePasswords((prev) => ({ ...prev, current: !prev.current }))} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-faint transition hover:text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15" aria-label={visiblePasswords.current ? "Hide current password" : "Show current password"}>{visiblePasswords.current ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button>
                  </div>
                </label>
                <label className="block space-y-1.5">
                  <span className={labelClass}>New password</span>
                  <div className="relative">
                    <input type={visiblePasswords.next ? "text" : "password"} required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={passwordForm.next} onChange={(event) => setPasswordForm((prev) => ({ ...prev, next: event.target.value }))} className={`${inputClass} pr-12`} />
                    <button type="button" onClick={() => setVisiblePasswords((prev) => ({ ...prev, next: !prev.next }))} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-faint transition hover:text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15" aria-label={visiblePasswords.next ? "Hide new password" : "Show new password"}>{visiblePasswords.next ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button>
                  </div>
                </label>
                {passwordForm.next ? (
                  <div className="rounded-xl border border-border-soft bg-white/70 px-3.5 py-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-ink-secondary">Password strength</span>
                      <span className="font-semibold text-brand-dark">{passwordStrengthLabel}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5" aria-label={`Password strength: ${passwordStrengthLabel}`}>
                      {[1, 2, 3, 4].map((level) => <span key={level} className={`h-1.5 rounded-full ${level <= passwordStrength ? passwordStrengthColor : "bg-border"}`} />)}
                    </div>
                  </div>
                ) : null}
                <label className="block space-y-1.5">
                  <span className={labelClass}>Confirm new password</span>
                  <div className="relative">
                    <input type={visiblePasswords.confirm ? "text" : "password"} required minLength={8} autoComplete="new-password" placeholder="Re-enter your new password" value={passwordForm.confirm} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))} className={`${inputClass} pr-12`} />
                    <button type="button" onClick={() => setVisiblePasswords((prev) => ({ ...prev, confirm: !prev.confirm }))} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-faint transition hover:text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15" aria-label={visiblePasswords.confirm ? "Hide new password confirmation" : "Show new password confirmation"}>{visiblePasswords.confirm ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button>
                  </div>
                </label>
                {passwordMessage && <SuccessAlert>{passwordMessage}</SuccessAlert>}
                {passwordError && <ErrorAlert>{passwordError}</ErrorAlert>}
                <button type="submit" disabled={changingPassword} className={`${submitButtonClass} mt-2 shadow-[0_12px_24px_rgba(47,107,79,0.18)]`}>{changingPassword ? "Updating…" : "Change password"}</button>
              </form>
            </div>

            <div className="relative overflow-hidden rounded-[24px] border border-red-200 bg-[linear-gradient(180deg,#FFFDFC_0%,#FFF7F5_100%)] p-5 shadow-[0_18px_40px_rgba(120,35,28,0.05)] sm:p-7 lg:p-8">
              <h2 className="font-display text-lg font-semibold text-red-900">Delete account</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-red-900/70">
                Permanently delete your account and personal profile data. Your completed assessments will be detached from your account and cannot be restored.
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="mt-5 min-h-11 rounded-xl border border-red-300 bg-white px-4 font-semibold text-red-800 transition hover:border-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingAccount ? "Deleting account..." : "Delete my account"}
              </button>
            </div>
          </div>

          <aside className="space-y-6">
            {/* Quick actions */}
            <div className="relative overflow-hidden rounded-[24px] border border-[#DDE7DB] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAF4_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
              <h2 className="font-display text-lg font-semibold text-ink">Quick actions</h2>
              <div className="mt-4 space-y-2">
                <Link
                  href="/assessment"
                  className="group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink transition hover:bg-brand-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand transition group-hover:bg-brand group-hover:text-brand-foreground">
                    <IconPlus size={18} />
                  </span>
                  <span className="flex-1">
                    <span className="block">Start assessment</span>
                    <span className="block text-xs text-ink-faint">Bago na pagsusuri</span>
                  </span>
                </Link>
                <Link
                  href="/history"
                  className="group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink transition hover:bg-brand-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand transition group-hover:bg-brand group-hover:text-brand-foreground">
                    <IconFolder size={18} />
                  </span>
                  <span className="flex-1">
                    <span className="block">View history</span>
                    <span className="block text-xs text-ink-faint">Mga naunang tala</span>
                  </span>
                </Link>
              </div>
            </div>

            {/* Activity log */}
            <div className="relative overflow-hidden rounded-[24px] border border-[#DDE7DB] bg-[radial-gradient(circle_at_top_right,_rgba(244,213,141,0.14),_transparent_30%),linear-gradient(180deg,#FFFFFF_0%,#F7FAF4_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">Account timeline</p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-ink">Recent activity</h2>
                </div>
                {auditLog.length > 0 && <span className="rounded-full border border-brand/15 bg-brand-tint px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-dark">{auditLog.length} {auditLog.length === 1 ? "update" : "updates"}</span>}
              </div>
              <ul className="mt-5 space-y-3">
                {auditLog.length === 0 ? (
                  <li className="rounded-2xl border border-dashed border-border-soft bg-white/60 px-4 py-5 text-center text-sm text-ink-secondary">Your profile timeline is clear.</li>
                ) : (
                  auditLog.slice(0, 5).map((entry) => {
                    const formatted = formatAuditEntry(entry);
                    return (
                      <li key={entry.id} className="relative rounded-2xl border border-[#E2E9DE] bg-white/75 p-3.5 shadow-[0_6px_16px_rgba(24,38,25,0.03)] transition hover:border-brand/25 hover:bg-white">
                        <div className="flex items-start gap-3">
                          <span className="mt-1.5 flex h-2.5 w-2.5 shrink-0 rounded-full bg-brand ring-4 ring-brand/10" aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-ink">{formatted.actionLabel}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                              {new Date(entry.created_at).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <div className="ml-5 mt-3 space-y-1.5 break-words border-l border-brand/15 pl-3 text-xs leading-relaxed text-ink-secondary">
                          {formatted.lines.map((line) => (
                            <p key={`${entry.id}-${line}`}>{line}</p>
                          ))}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            {/* Session summary */}
            <div className="relative overflow-hidden rounded-[24px] border border-[#DDE7DB] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAF4_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
              <h2 className="font-display text-lg font-semibold text-ink">Session</h2>
              <div className="mt-4 rounded-lg border border-brand/30 bg-brand-tint p-4">
                <p className="text-sm font-medium text-ink">Current device</p>
                <p className="mt-1 text-xs text-ink-secondary">Web browser session • active</p>
              </div>
              <p className="mt-4 text-xs text-ink-secondary">Last sync: {new Date().toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
            </div>

            {/* Why this matters */}
            <div className="relative overflow-hidden rounded-[24px] border border-[#DDE7DB] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAF4_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
              <h2 className="font-display text-lg font-semibold text-ink">Why this matters</h2>
              <ul className="mt-4 space-y-4">
                {reasons.map((reason) => (
                  <li key={reason.label} className="border-l-2 border-brand/40 pl-4">
                    <p className="text-sm font-medium text-ink">{reason.label}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">{reason.copy}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </PageMain>
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}
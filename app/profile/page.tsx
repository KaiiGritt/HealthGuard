"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { IconFolder, IconPlus } from "@/app/components/ui/icons";
import {
  ErrorAlert,
  GreenAside,
  formStackClass,
  HeroBanner,
  inputClass,
  labelClass,
  labelHintClass,
  PageMain,
  PrimaryLink,
  RecordCard,
  selectClass,
  SuccessAlert,
  submitButtonClass,
} from "@/app/components/ui/primitives";
import { irosinBarangays } from "@/app/constants/irosinBarangays";
import { changePassword, getMe, updateProfile, type User } from "@/lib/api";
import PageHeader from "../components/PageHeader";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ full_name: "", age: "", sex: "", barangay: "" });
  const [textScale, setTextScale] = useState<0.92 | 1 | 1.18>(1.18);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const current = await getMe();
        if (!current) {
          setUser(null);
          setLoading(false);
          return;
        }
        setUser(current);
        setForm({
          full_name: current.full_name ?? "",
          age: current.age?.toString() ?? "",
          sex: current.sex ?? "",
          barangay: current.barangay ?? "",
        });
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
    try {
      const updated = await updateProfile({
        full_name: form.full_name.trim() || undefined,
        age: form.age ? Number(form.age) : null,
        sex: form.sex || null,
        barangay: form.barangay.trim() || null,
      });
      setUser(updated);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <PageHeader />
        <PageMain>
          <div className="rounded-xl border border-border-soft bg-card p-8 text-center text-ink-secondary">
            Loading your profile…
          </div>
        </PageMain>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <PageHeader />
        <PageMain>
          <div className="rounded-xl border border-border-soft bg-card p-8">
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

  return (
    <div className="min-h-screen bg-surface-alt" style={{ fontSize: `${textScale}em` }}>
      <PageHeader />
      <PageMain>
        <div className="mb-4 flex justify-end">
          <div className="flex overflow-hidden rounded-full border border-border font-mono text-xs">
            {([0.92, 1, 1.18] as const).map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setTextScale(s)}
                className={`px-3 py-2 ${textScale === s ? "bg-brand text-brand-foreground" : "bg-card text-ink-secondary hover:bg-brand-tint"}`}
              >
                {["A−", "A", "A+"][i]}
              </button>
            ))}
          </div>
        </div>

        <HeroBanner
          eyebrow="Account · Health worker profile"
          title={user.full_name}
          subtitle="These details are attached to every assessment you run, so patient records and follow-up stay accurate."
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <RecordCard tab="Health record">
            <div className="flex items-start justify-between gap-4 border-b border-dashed border-border pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-brand-dark font-display text-xl font-semibold text-brand-foreground">
                  {initials(user.full_name)}
                </div>
                <div>
                  <div className="font-display text-lg font-semibold text-ink">{user.full_name}</div>
                  <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-faint">
                    {user.role} account
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-[11px] text-ink-faint">
                REC. NO.
                <div className="text-xs font-medium text-ink-secondary">{recordNo}</div>
                joined {joinedDate}
              </div>
            </div>

            <form onSubmit={handleSubmit} className={`mt-6 ${formStackClass}`}>
              <div>
                <label className={`mb-1.5 flex items-baseline gap-2 ${labelClass}`}>
                  Full name <span className={labelHintClass}>/ Buong pangalan</span>
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
                  <label className={`mb-1.5 flex items-baseline gap-2 ${labelClass}`}>
                    Age <span className={labelHintClass}>/ Edad</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={form.age}
                    onChange={(event) => setForm((prev) => ({ ...prev, age: event.target.value }))}
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-xs text-ink-faint">Used to match the right symptom checklist.</p>
                </div>
                <div>
                  <label className={`mb-1.5 flex items-baseline gap-2 ${labelClass}`}>
                    Sex <span className={labelHintClass}>/ Kasarian</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.sex}
                      onChange={(event) => setForm((prev) => ({ ...prev, sex: event.target.value }))}
                      className={selectClass}
                    >
                      <option value="">Select</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-faint">
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                        <path d="M5.5 7.5L10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className={`mb-1.5 flex items-baseline gap-2 ${labelClass}`}>
                  Barangay <span className={labelHintClass}>/ Barangay</span>
                </label>
                <div className="relative">
                  <select
                    value={form.barangay}
                    onChange={(event) => setForm((prev) => ({ ...prev, barangay: event.target.value }))}
                    className={selectClass}
                  >
                    <option value="">Select barangay</option>
                    {irosinBarangays.map((barangay) => (
                      <option key={barangay} value={barangay}>{barangay}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-faint">
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                      <path d="M5.5 7.5L10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-ink-faint">Routes urgent (red) cases to the nearest health station.</p>
              </div>
              {message && <SuccessAlert>{message}</SuccessAlert>}
              {error && <ErrorAlert>{error}</ErrorAlert>}
              <button type="submit" disabled={saving} className={submitButtonClass}>
                {saving ? "Saving…" : "Save profile / I-save"}
              </button>
            </form>
          </RecordCard>

          <aside className="space-y-4">
            <div className="rounded-xl border border-border-soft bg-card p-5">
              <h2 className="font-display text-lg text-ink">Quick actions</h2>
              <div className="mt-3 space-y-2.5">
                <Link
                  href="/assessment"
                  className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3 text-sm font-medium text-ink transition hover:border-brand"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand">
                    <IconPlus size={18} />
                  </span>
                  <span>
                    <span className="block">Start a new assessment</span>
                    <span className="block text-xs font-normal text-ink-faint">Bago na pagsusuri</span>
                  </span>
                </Link>
                <Link
                  href="/history"
                  className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3 text-sm font-medium text-ink transition hover:border-brand"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand">
                    <IconFolder size={18} />
                  </span>
                  <span>
                    <span className="block">View recent history</span>
                    <span className="block text-xs font-normal text-ink-faint">Mga naunang tala</span>
                  </span>
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-border-soft bg-card p-5">
              <h2 className="font-display text-lg text-ink">Change password</h2>
              <p className="mt-1 text-sm text-ink-muted">Update your sign-in password securely.</p>
              <form onSubmit={handlePasswordChange} className="mt-4 space-y-3">
                <input type="password" required autoComplete="current-password" placeholder="Current password" value={passwordForm.current} onChange={(event) => setPasswordForm((prev) => ({ ...prev, current: event.target.value }))} className={inputClass} />
                <input type="password" required minLength={8} autoComplete="new-password" placeholder="New password (8+ characters)" value={passwordForm.next} onChange={(event) => setPasswordForm((prev) => ({ ...prev, next: event.target.value }))} className={inputClass} />
                <input type="password" required minLength={8} autoComplete="new-password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))} className={inputClass} />
                {passwordMessage && <SuccessAlert>{passwordMessage}</SuccessAlert>}
                {passwordError && <ErrorAlert>{passwordError}</ErrorAlert>}
                <button type="submit" disabled={changingPassword} className={submitButtonClass}>{changingPassword ? "Updating…" : "Change password"}</button>
              </form>
            </div>

            <GreenAside title="Why this matters">
              <ul className="mt-3 space-y-3 text-sm leading-6 text-brand-foreground/90">
                {[
                  "Age and sex narrow the checklist to the right symptoms for that patient.",
                  "Your barangay routes red-flag cases to the correct health station automatically.",
                  "A correct name keeps assessments traceable if a case needs follow-up.",
                ].map((item, index) => (
                  <li key={item} className="flex gap-2.5 border-t border-brand-foreground/15 pt-3 first:border-none first:pt-0">
                    <span className="font-mono text-[11px] text-brand-muted">{String(index + 1).padStart(2, "0")}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </GreenAside>
          </aside>
        </div>
      </PageMain>
    </div>
  );
}

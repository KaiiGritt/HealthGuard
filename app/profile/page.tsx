"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { IconFolder, IconPlus } from "@/app/components/ui/icons";
import {
  ErrorAlert,
  formStackClass,
  inputClass,
  labelClass,
  labelHintClass,
  PageMain,
  PrimaryLink,
  selectClass,
  submitButtonClass,
  SuccessAlert,
} from "@/app/components/ui/primitives";
import { irosinBarangays } from "@/app/constants/irosinBarangays";
import { changePassword, getMe, getProfileAudit, updateProfile, type NotificationPreferences, type ProfileAuditEntry, type User } from "@/lib/api";
import PageHeader from "../components/PageHeader";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ full_name: "", age: "", sex: "", barangay: "", language_preference: "en" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({ email: true, sms: false, push: true });
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
        const storedLanguage = typeof window !== "undefined" ? window.localStorage.getItem("healthguard-language") : null;
        const storedPhoto = typeof window !== "undefined" ? window.localStorage.getItem("healthguard-profile-photo") : null;
        const nextPrefs = current.notification_preferences ?? { email: true, sms: false, push: true };
        setUser(current);
        setNotificationPrefs(nextPrefs);
        setPhotoUrl(storedPhoto ?? null);
        setForm({
          full_name: current.full_name ?? "",
          age: current.age?.toString() ?? "",
          sex: current.sex ?? "",
          barangay: current.barangay ?? "",
          language_preference: current.language_preference ?? storedLanguage ?? "en",
        });
        if (typeof window !== "undefined") {
          window.localStorage.setItem("healthguard-language", current.language_preference ?? storedLanguage ?? "en");
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
    try {
      const updated = await updateProfile({
        full_name: form.full_name.trim() || undefined,
        age: form.age ? Number(form.age) : null,
        sex: form.sex || null,
        barangay: form.barangay.trim() || null,
        language_preference: form.language_preference || "en",
        notification_preferences: notificationPrefs,
      });
      setUser(updated);
      setNotificationPrefs(updated.notification_preferences ?? notificationPrefs);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("healthguard-language", updated.language_preference ?? form.language_preference);
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
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextUrl = typeof reader.result === "string" ? reader.result : null;
      setPhotoUrl(nextUrl);
      if (typeof window !== "undefined" && nextUrl) {
        window.localStorage.setItem("healthguard-profile-photo", nextUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleNotificationChange(key: keyof NotificationPreferences) {
    setNotificationPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <PageHeader />
        <PageMain>
          <div className="rounded-2xl border border-border-soft bg-card p-10 text-center text-ink-secondary">
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
    <div className="min-h-screen bg-surface-alt">
      <PageHeader />
      <PageMain>
        {/* Record card */}
        <section className="motion-safe:animate-[recordReveal_0.6s_ease-out] relative overflow-hidden rounded-2xl bg-brand text-brand-foreground">
          <div className="grid gap-8 p-8 sm:p-10 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-10">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-xl bg-brand-foreground/15 font-display text-2xl font-semibold ring-1 ring-inset ring-brand-foreground/25 transition hover:scale-[1.02]"
              aria-label="Upload profile photo"
            >
              {photoUrl ? (
                <Image src={photoUrl} alt="Profile preview" width={64} height={64} className="h-full w-full object-cover" />
              ) : (
                <span>{initials(user.full_name)}</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/20 text-[10px] font-mono uppercase tracking-[0.12em] text-white opacity-0 transition group-hover:opacity-100">
                Photo
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

            <div className="min-w-0">
              <p className="text-sm text-brand-foreground/70">Health worker record</p>
              <h1 className="mt-1 truncate font-display text-3xl font-semibold sm:text-4xl">
                {user.full_name}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-foreground/80">
                These details travel with every assessment you run, so a case can be traced back
                to the right patient and barangay.
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-x-6 gap-y-4 border-t border-brand-foreground/20 pt-6 text-sm md:grid-cols-1 md:border-t-0 md:border-l md:pl-8 md:pt-0">
              <div>
                <dt className="text-brand-foreground/60">Role</dt>
                <dd className="mt-0.5 font-medium">{user.role}</dd>
              </div>
              <div>
                <dt className="text-brand-foreground/60">Record no.</dt>
                <dd className="mt-0.5 font-mono font-medium tracking-tight">{recordNo}</dd>
              </div>
              <div>
                <dt className="text-brand-foreground/60">Joined</dt>
                <dd className="mt-0.5 font-medium">{joinedDate}</dd>
              </div>
            </dl>
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
            <div className="rounded-2xl border border-border-soft bg-card p-8">
              <h2 className="font-display text-lg font-semibold text-ink">Personal details</h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Update the information attached to your assessments.
              </p>

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

                <div>
                  <label className={`mb-1.5 flex items-baseline gap-2 ${labelClass}`}>
                    Interface language <span className={labelHintClass}>/ Wika</span>
                  </label>
                  <select
                    value={form.language_preference}
                    onChange={(event) => setForm((prev) => ({ ...prev, language_preference: event.target.value }))}
                    className={selectClass}
                  >
                    <option value="en">English</option>
                    <option value="fil">Filipino</option>
                    <option value="both">English + Filipino</option>
                  </select>
                </div>

                <div className="rounded-xl border border-border-soft bg-surface-alt p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">Notifications</p>
                      <p className="text-xs text-ink-secondary">Choose the updates you want to receive.</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {Object.entries(notificationPrefs).map(([key, value]) => (
                      <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink">
                        <span className="capitalize">{key}</span>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => handleNotificationChange(key as keyof NotificationPreferences)}
                          className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {message && <SuccessAlert>{message}</SuccessAlert>}
                {error && <ErrorAlert>{error}</ErrorAlert>}
                <button type="submit" disabled={saving} className={submitButtonClass}>
                  {saving ? "Saving…" : "Save profile / I-save"}
                </button>
              </form>
            </div>

            {/* Password */}
            <div className="rounded-2xl border border-border-soft bg-card p-8">
              <h2 className="font-display text-lg font-semibold text-ink">Change password</h2>
              <p className="mt-1 text-sm text-ink-secondary">Update your sign-in password securely.</p>
              <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
                <input type="password" required autoComplete="current-password" placeholder="Current password" value={passwordForm.current} onChange={(event) => setPasswordForm((prev) => ({ ...prev, current: event.target.value }))} className={inputClass} />
                <input type="password" required minLength={8} autoComplete="new-password" placeholder="New password (8+ characters)" value={passwordForm.next} onChange={(event) => setPasswordForm((prev) => ({ ...prev, next: event.target.value }))} className={inputClass} />
                {passwordForm.next ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-ink-secondary">
                      <span>Password strength</span>
                      <span>{passwordStrengthLabel}</span>
                    </div>
                    <div className="h-2 rounded-full bg-border">
                      <div className={`h-2 rounded-full ${passwordStrengthColor}`} style={{ width: `${(passwordStrength / 4) * 100}%` }} />
                    </div>
                  </div>
                ) : null}
                <input type="password" required minLength={8} autoComplete="new-password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))} className={inputClass} />
                {passwordMessage && <SuccessAlert>{passwordMessage}</SuccessAlert>}
                {passwordError && <ErrorAlert>{passwordError}</ErrorAlert>}
                <button type="submit" disabled={changingPassword} className={submitButtonClass}>{changingPassword ? "Updating…" : "Change password"}</button>
              </form>
            </div>
          </div>

          <aside className="space-y-6">
            {/* Quick actions */}
            <div className="rounded-2xl border border-border-soft bg-card p-6">
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
            <div className="rounded-2xl border border-border-soft bg-card p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Recent activity</h2>
              <ul className="mt-4 space-y-3">
                {auditLog.length === 0 ? (
                  <li className="text-sm text-ink-secondary">No recent profile changes.</li>
                ) : (
                  auditLog.slice(0, 5).map((entry) => (
                    <li key={entry.id} className="rounded-lg border border-border-soft bg-surface-alt p-3">
                      <p className="text-sm font-medium text-ink">{entry.action.replace("_", " ")}</p>
                      <p className="mt-1 break-words text-xs text-ink-secondary">{entry.details}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                        {new Date(entry.created_at).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Session summary */}
            <div className="rounded-2xl border border-border-soft bg-card p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Session</h2>
              <div className="mt-4 rounded-lg border border-brand/30 bg-brand-tint p-4">
                <p className="text-sm font-medium text-ink">Current device</p>
                <p className="mt-1 text-xs text-ink-secondary">Web browser session • active</p>
              </div>
              <p className="mt-4 text-xs text-ink-secondary">Last sync: {new Date().toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
            </div>

            {/* Why this matters */}
            <div className="rounded-2xl border border-border-soft bg-card p-6">
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
    </div>
  );
}
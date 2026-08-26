// Typed client for the FastAPI backend, proxied via /backend/* (see next.config.ts).
// Types mirror the Pydantic schemas in backend/app/schemas.py.

export type RiskLevel = "GREEN" | "YELLOW" | "RED";

export interface DetectedSymptom {
  medical_term: string;
  matched_text: string;
  language: string;
  category: string;
  severity_weight: number;
}

export interface TriggeredRule {
  name: string;
  description: string;
}

export interface AnalyzeResult {
  id: number;
  risk_level: RiskLevel;
  detected_symptoms: DetectedSymptom[];
  triggered_rules: TriggeredRule[];
  reason: string;
  recommendation: string;
  message: string;
  score: number;
  input_text: string;
  method: string;
  created_at: string;
  disclaimer: string;
}

export interface AssessmentOut {
  id: number;
  input_text: string;
  method: string;
  detected_symptoms: string[];
  risk_level: RiskLevel;
  reason: string;
  recommendation: string;
  created_at: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  hint: string;
}

export interface DashboardAssessmentItem {
  id: number;
  resident_name: string;
  barangay: string | null;
  risk_level: string;
  note: string;
  created_at: string;
}

export interface TriageBreakdownItem {
  level: string;
  value: number;
}

export interface WeeklyTrendItem {
  label: string;
  date: string;
  count: number;
}

export interface BarangayStatItem {
  barangay: string;
  total: number;
  urgent: number;
  follow_up: number;
}

export interface SymptomStatItem {
  symptom: string;
  count: number;
}

export interface MethodBreakdownItem {
  method: string;
  label: string;
  count: number;
}

export interface DashboardInsightItem {
  title: string;
  detail: string;
  tone: "neutral" | "positive" | "watch" | "urgent";
}

export interface DashboardReferenceItem {
  title: string;
  detail: string;
  status: string;
}

export interface DashboardSummary {
  summary_cards: DashboardMetric[];
  recent_assessments: DashboardAssessmentItem[];
  triage_breakdown: TriageBreakdownItem[];
  weekly_trend: WeeklyTrendItem[];
  barangay_stats: BarangayStatItem[];
  top_symptoms: SymptomStatItem[];
  method_breakdown: MethodBreakdownItem[];
  insights: DashboardInsightItem[];
  reference_guides: DashboardReferenceItem[];
  generated_at: string;
}

export interface AdminActivityItem {
  title: string;
  detail: string;
}

export interface AdminToolItem {
  title: string;
  body: string;
}

export interface AdminSummary {
  summary_cards: DashboardMetric[];
  recent_activity: AdminActivityItem[];
  admin_tools: AdminToolItem[];
}

export interface AdminModuleUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  barangay: string | null;
  created_at: string;
}

export interface AdminModuleLexiconEntry {
  id: number;
  local_term: string;
  language: string;
  medical_term: string;
  severity_weight: number;
  category: string;
}

export interface AdminRuleItem {
  name: string;
  severity: string;
  condition: string;
  action: string;
}

export interface AdminSettingItem {
  key: string;
  label: string;
  value: string;
  status: string;
}

export interface AdminPrivacyItem {
  title: string;
  detail: string;
  status: string;
}

export interface AdminModulesData {
  users: AdminModuleUser[];
  lexicon_entries: AdminModuleLexiconEntry[];
  triage_rules: AdminRuleItem[];
  system_settings: AdminSettingItem[];
  privacy_controls: AdminPrivacyItem[];
}

export interface AnalyzePayload {
  input_text?: string;
  selected_symptoms?: string[];
  method: "text" | "select";
}

export type Role = "resident" | "mho" | "admin";

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  age: number | null;
  sex: string | null;
  barangay: string | null;
  created_at: string;
}

const isServer = typeof window === "undefined";

// Base path. Server components hit the backend directly; the browser uses the proxy.
function baseUrl(): string {
  return isServer ? process.env.BACKEND_ORIGIN ?? "http://localhost:8000" : "/backend";
}

// On the server, the browser cookie isn't automatically attached, so forward it
// from the incoming request via next/headers. No-op (and never bundled) client-side.
async function serverCookieHeader(): Promise<Record<string, string>> {
  if (!isServer) return {};
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    const header = jar.toString();
    return header ? { Cookie: header } : {};
  } catch {
    return {};
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieHeader = await serverCookieHeader();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...cookieHeader, ...(init?.headers ?? {}) },
    // Send the httpOnly cookie with browser requests through the proxy.
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Request to ${path} failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<T>;
}

export function analyze(payload: AnalyzePayload): Promise<AnalyzeResult> {
  return request<AnalyzeResult>("/assessment/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAssessment(id: number | string): Promise<AssessmentOut> {
  return request<AssessmentOut>(`/assessment/${id}`);
}

export function getHistory(): Promise<AssessmentOut[]> {
  return request<AssessmentOut[]>("/assessment/history");
}

export function getSelectableSymptoms(): Promise<string[]> {
  return request<string[]>("/assessment/symptoms");
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const data = await request<DashboardSummary>("/assessment/dashboard/summary");
  return data;
}

export async function getAdminSummary(): Promise<AdminSummary> {
  const data = await request<AdminSummary>("/assessment/admin/summary");
  return data;
}

export async function getAdminModules(): Promise<AdminModulesData> {
  const data = await request<AdminModulesData>("/assessment/admin/modules");
  return data;
}
export function updateUserStatus(userId: number, isActive: boolean): Promise<{ ok: boolean; user_id: number; is_active: boolean }> {
  return request<{ ok: boolean; user_id: number; is_active: boolean }>(`/assessment/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function updateUserRole(userId: number, role: string): Promise<{ ok: boolean; user_id: number; role: string }> {
  return request<{ ok: boolean; user_id: number; role: string }>(`/assessment/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function createLexiconEntry(payload: {
  local_term: string;
  language?: string;
  medical_term: string;
  severity_weight?: number;
  category?: string;
}): Promise<AdminModuleLexiconEntry> {
  return request<AdminModuleLexiconEntry>("/assessment/admin/lexicon", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
// --- Auth ---

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  age?: number | null;
  sex?: string | null;
  barangay?: string | null;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface RegisterResponse {
  email: string;
  message: string;
}

export interface PasswordResetResponse { message: string; }

export function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyEmail(payload: VerifyEmailPayload): Promise<User> {
  return request<User>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(email: string, password: string): Promise<User> {
  return request<User>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function forgotPassword(email: string): Promise<PasswordResetResponse> {
  return request<PasswordResetResponse>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export function resetPassword(email: string, code: string, newPassword: string): Promise<User> {
  return request<User>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

export function updateProfile(payload: Partial<RegisterPayload>): Promise<User> {
  return request<User>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Returns the current user, or null if not authenticated (401).
export async function getMe(): Promise<User | null> {
  try {
    return await request<User>("/auth/me");
  } catch {
    return null;
  }
}

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Home, Shield, TrendingUp, TrendingDown, Wifi, Tv, Smartphone,
  CreditCard, ShoppingBag, ShoppingCart, Car, Train, Zap, Gift,
  Plane, Briefcase, Bot, Activity, PiggyBank, BarChart2, Bitcoin,
  UtensilsCrossed, ArrowLeft, ArrowRight, AlertTriangle, Check,
  RefreshCw, Pencil, Wallet, Plus, Trash2, X, Calendar, Bell, Maximize2, Menu, LayoutDashboard, Receipt, LineChart as LCIcon, History as HIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Expense { label: string; amount: number; category: string; validated: boolean; icon?: string; }
interface BudgetAlloc { courses: number; restaurants: number; services: number; revolut: number; amex: number; cera: number; }
interface Savings {
  target_monthly: number; actual_monthly: number;
  cumulative_target: number; cumulative_actual: number;
  pea: number; traderepublic: number; degiro: number; bitstack: number; swissborg: number;
  swisslife: number; assurance_vie_conservateur: number; uptimi: number; esalia: number; bdl_investment: number;
  etrade: number; shareworks: number;
  livret_a: number; epargne_revolut: number; ldd: number; lel: number;
  per: number; perco: number; irishlife: number; montres_objets_luxe: number; tontine: number;
}
interface Month {
  month_key: string; month_name: string; year: number;
  income_salary: number; income_other: number;
  expenses: Expense[]; budget_allocation: BudgetAlloc;
  budget_validated?: Record<string, boolean>;
  savings: Savings;
  portfolio_values?: Record<string, number>;
  balance_end_of_month: number; notes: string;
}
interface ForecastMonth { month_key: string; month_name: string; income: number; expenses: number; savings_target: number; balance: number; alert_type: string; message?: string; }
interface Alert { month_key: string; month_name: string; projected_balance: number; alert_type: string; message: string; }
interface Forecast { months: ForecastMonth[]; alerts: Alert[]; total_income: number; total_expenses: number; total_savings: number; }

// ── Design ────────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "#f8fafc", surface: "#ffffff", surface2: "#f1f5f9",
  border: "rgba(0,0,0,0.07)", borderLight: "rgba(0,0,0,0.12)",
  primary: "#2563EB", accent: "#F97316",
  success: "#16a34a", danger: "#dc2626", warning: "#d97706",
  text: "#0f172a", muted: "#64748b",
  font: "Outfit,sans-serif", heading: "Outfit,sans-serif",
};
const DARK = {
  bg: "#0f1117", surface: "#1a1c25", surface2: "#232630",
  border: "rgba(255,255,255,0.08)", borderLight: "rgba(255,255,255,0.12)",
  primary: "#60a5fa", accent: "#fb923c",
  success: "#4ade80", danger: "#f87171", warning: "#fbbf24",
  text: "#e8e9ed", muted: "#8b8fa3",
  font: "Outfit,sans-serif", heading: "Outfit,sans-serif",
};
let S = LIGHT;

const ICONS: Record<string, React.ElementType> = {
  Home, Shield, TrendingUp, Wifi, Tv, Smartphone, CreditCard, ShoppingBag,
  ShoppingCart, Car, Train, Zap, Gift, Plane, Briefcase, Bot, Activity,
  PiggyBank, BarChart2, Bitcoin, UtensilsCrossed,
};

const BUDGET_LABELS: Record<string, string> = {
  courses: "Courses", restaurants: "Restaurants", services: "Services",
  revolut: "Revolut", amex: "Amex", cera: "CERA",
};

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("budget_token") : null;
  return token ? { "x-user-token": token, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

// Fullscreen chart modal
function ChartModal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (<div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: S.surface, borderRadius: 16, width: "95vw", maxWidth: 1200, height: "80vh", padding: 24, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 700 }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: S.muted, cursor: "pointer" }}><X size={20} /></button>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  </div>);
}
function ExpandBtn({ onClick }: { onClick: () => void }) {
  const handleClick = (e: React.MouseEvent) => {
    const card = (e.target as HTMLElement).closest(".chart-expand");
    if (card) {
      if (document.fullscreenElement) { document.exitFullscreen(); }
      else { card.requestFullscreen().catch(() => {}); }
    } else { onClick(); }
  };
  return <button onClick={handleClick} title="Agrandir" style={{ position: "absolute", top: 8, right: 8, background: `${S.bg}cc`, border: `1px solid ${S.border}`, color: S.muted, width: 24, height: 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}><Maximize2 size={10} /></button>;
}
function useExpand() {
  const [ex, setEx] = useState(false);
  const st: React.CSSProperties = ex ? { position: "fixed", inset: 16, zIndex: 200, background: "#fff", borderRadius: 16, boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)", padding: 24, overflow: "auto" } : { position: "relative" };
  return { ex, toggle: () => setEx(!ex), st };
}
function getDateFR() {
  return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ── Shared ────────────────────────────────────────────────────────────────────
function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return <div className={className} style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 20, ...style }}>{children}</div>;
}
function SLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ color: S.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0 0 12px", fontFamily: S.font }}>{children}</p>;
}
function EditableAmt({ value, onChange, color, size = "md" }: { value: number; onChange: (n: number) => void; color?: string; size?: "sm" | "md" | "lg"; }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const fs = size === "lg" ? 30 : size === "sm" ? 14 : 20;
  const col = color || S.text;
  function start(e: React.MouseEvent) { e.stopPropagation(); setDraft(value.toFixed(2)); setEditing(true); setTimeout(() => { ref.current?.focus(); ref.current?.select(); }, 30); }
  function commit() { const n = parseFloat(draft); if (!isNaN(n) && n >= 0) onChange(n); setEditing(false); }
  if (editing) return <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} style={{ width: size === "lg" ? 130 : 80, background: S.surface2, border: `1.5px solid ${col}`, borderRadius: 8, padding: "2px 8px", color: S.text, fontFamily: S.heading, fontSize: fs, fontWeight: 700, outline: "none" }} />;
  return (
    <span onClick={start} title="Cliquer pour modifier" className="editable-amt" style={{ cursor: "pointer", fontFamily: S.heading, fontSize: fs, fontWeight: 700, color: col, lineHeight: 1.1, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {fmt(value)}<Pencil className="edit-pencil" size={Math.max(10, fs * 0.42)} style={{ marginBottom: 1 }} />
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BudgetApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [darkMode, setDarkMode] = useState(false);
  const [hints, setHints] = useState<Record<string, boolean>>({});
  const [tourStep, setTourStep] = useState(-1);
  const startTour = () => { if (!localStorage.getItem("budget_tour_done")) setTourStep(0); };
  useEffect(() => { try { const h = JSON.parse(localStorage.getItem("budget_hints") || "{}"); setHints(h); } catch {} }, []);
  const dismissHint = (key: string) => { setHints(prev => { const n = { ...prev, [key]: true }; localStorage.setItem("budget_hints", JSON.stringify(n)); return n; }); };
  S = darkMode ? DARK : LIGHT;
  const [tab, setTab] = useState<"dashboard" | "depenses" | "projection" | "historique" | "salaires" | "economies">("dashboard");
  const [months, setMonths] = useState<Month[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [idx, setIdx] = useState(0);
  const [selectedYear, setSelectedYear] = useState(2026);
  const yearRef = useRef(2026);
  useEffect(() => { yearRef.current = selectedYear; }, [selectedYear]);
  const YEARS = Array.from({ length: 2036 - 2026 + 1 }, (_, i) => 2026 + i);
  const [loading, setLoading] = useState(true);
  const xpSal = useExpand();
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok?: boolean } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{email:string;name:string}|null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPw, setAuthPw] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [obSalary, setObSalary] = useState("");
  const [obSavings, setObSavings] = useState("");
  const [obLoading, setObLoading] = useState(false);
  const [obExpenses, setObExpenses] = useState<{label:string;amount:string;category:string}[]>([]);
  const [obNewLabel, setObNewLabel] = useState("");
  const [obNewAmount, setObNewAmount] = useState("");
  const [showAlerts, setShowAlerts] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("budget_dismissed_alerts") || "[]"); } catch { return []; } });
  const dismissAlert = (id: string) => { setDismissedAlerts(prev => { const n = [...prev, id]; localStorage.setItem("budget_dismissed_alerts", JSON.stringify(n)); return n; }); };
  const [savingsGoals, setSavingsGoals] = useState<{id:string;name:string;target:number;current:number;target_date:string;color:string;validated_months:string[]}[]>([]);
  const [fullChart, setFullChart] = useState<string | null>(null);
  const COMMON_EXPENSES = [{l:"Loyer",c:"fixed"},{l:"Electricite",c:"fixed"},{l:"Internet / Telecom",c:"fixed"},{l:"Assurance",c:"fixed"},{l:"Abonnements (Netflix, Spotify...)",c:"fixed"},{l:"Transports",c:"variable"},{l:"Courses alimentaires",c:"variable"}];

  // Check auth on mount
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("budget_token") : null;
    try { const u = JSON.parse(localStorage.getItem("budget_user") || "null"); if (u) setUser(u); } catch {}
    setAuthToken(t);
    setAuthChecked(true);
  }, []);

  function getAuthHeaders(): Record<string, string> {
    return authToken ? { "x-user-token": authToken, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  }

  async function handleAuth() {
    setAuthLoading(true); setAuthError("");
    try {
      const endpoint = authMode === "register" ? "/api/budget/auth/register" : "/api/budget/auth/login";
      const body = authMode === "register" ? { email: authEmail, password: authPw, name: authName } : { email: authEmail, password: authPw };
      const r = await fetch(endpoint, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success && d.token) {
        localStorage.setItem("budget_token", d.token);
          localStorage.setItem("budget_user", JSON.stringify({ email: d.email || authEmail, name: d.name || authName }));
          setUser({ email: d.email || authEmail, name: d.name || authName });
          fetch("/api/budget/health", { headers: getAuthHeaders() }).catch(() => {}); // warm up backend
        setAuthToken(d.token);
        await loadData();
        if (d.needs_onboarding) setNeedsOnboarding(true); else setTimeout(() => { if (!localStorage.getItem("budget_tour_done") && !needsOnboarding) setTourStep(0); }, 1000);
      } else {
        setAuthError(d.detail || "Erreur de connexion");
      }
    } catch { setAuthError("Erreur de connexion"); }
    setAuthLoading(false);
  }

  function logout() {
    localStorage.removeItem("budget_token");
    setAuthToken(null);
    setMonths([]);
    setForecast(null);
  }

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mr, fr] = await Promise.all([fetch(`/api/budget/months?year=${yearRef.current}`, { headers: getAuthHeaders() }), fetch("/api/budget/forecast", { headers: getAuthHeaders() })]);
      const md = await mr.json(); const fd = await fr.json();
      const mths: Month[] = md.months || [];
      setMonths(mths); setForecast(fd);
      setIdx(i => Math.min(i, mths.length - 1));
      fetch("/api/budget/savings-goals", { headers: getAuthHeaders() }).then(r => r.json()).then(d => setSavingsGoals(d.goals || [])).catch(() => {});
    } catch { showToast("Erreur de chargement", false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [mr, fr] = await Promise.all([fetch(`/api/budget/months?year=${yearRef.current}`, { headers: getAuthHeaders() }), fetch("/api/budget/forecast", { headers: getAuthHeaders() })]);
        const md = await mr.json(); const fd = await fr.json();
        const mths: Month[] = md.months || [];
        setMonths(mths); setForecast(fd);
        fetch("/api/budget/savings-goals", { headers: getAuthHeaders() }).then(r => r.json()).then(d => setSavingsGoals(d.goals || [])).catch(() => {});
        // Only set idx to current month on first load, not year switches
      } catch { showToast("Erreur de chargement", false); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  async function patchExpense(mk: string, label: string, updates: Partial<Expense>) {
    // Optimistic update
    setMonths(prev => prev.map(m2 => m2.month_key === mk ? {...m2, expenses: m2.expenses.map(e => e.label === label ? {...e, ...updates} : e)} : m2));
    setSaving(label);
    try {
      const r = await fetch(`/api/budget/month/${mk}/expense`, { method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify({ label, ...updates }) });
      const d = await r.json();
      if (d.success) {
        setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, expenses: m.expenses.map(e => e.label === label ? { ...e, ...updates } : e) }));
        if (updates.validated !== undefined) showToast(updates.validated ? `${label} validée` : `${label} devalidée`);
        else showToast("Montant mis à jour");
        fetch("/api/budget/forecast", { headers: getAuthHeaders() }).then(r => r.json()).then(setForecast);
      }
    } catch { showToast("Erreur", false); }
    finally { setSaving(null); }
  }

  async function addExpense(mk: string, label: string, amount: number, category: string) {
    setSaving("adding");
    try {
      const r = await fetch(`/api/budget/month/${mk}/expense`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ label, amount, category, propagate: true }),
      });
      const d = await r.json();
      if (d.success) {
        showToast(`${label} ajoutée${d.propagated_to > 1 ? ` (${d.propagated_to} mois)` : ""}`);
        await loadData();
      }
    } catch { showToast("Erreur", false); }
    finally { setSaving(null); }
  }

  async function deleteExpense(mk: string, label: string) {
    setSaving(label);
    try {
      const r = await fetch(`/api/budget/month/${mk}/expense/${encodeURIComponent(label)}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) { setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, expenses: m.expenses.filter(e => e.label !== label) })); showToast(`${label} supprimée`); fetch("/api/budget/forecast", { headers: getAuthHeaders() }).then(r => r.json()).then(setForecast); }
    } catch { showToast("Erreur", false); }
    finally { setSaving(null); }
  }

  async function patchIncome(mk: string, field: "income_salary" | "income_other", value: number) {
    setSaving("income");
    try {
      const body: Record<string, number> = {}; body[field] = value;
      const r = await fetch(`/api/budget/month/${mk}/income`, { method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, [field]: value })); showToast("Revenu mis à jour"); fetch("/api/budget/forecast", { headers: getAuthHeaders() }).then(r => r.json()).then(setForecast); }
    } catch { showToast("Erreur", false); }
    finally { setSaving(null); }
  }

  async function patchSavings(mk: string, updates: Partial<Savings>) {
    try {
      const r = await fetch(`/api/budget/month/${mk}/savings`, { method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify(updates) });
      const d = await r.json();
      if (d.success) { setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, savings: { ...m.savings, ...updates } })); showToast("Épargne mise à jour"); }
    } catch { showToast("Erreur", false); }
  }

  async function patchPortfolioValues(mk: string, updates: Record<string, number>) {
    try {
      const r = await fetch(`/api/budget/month/${mk}/portfolio-values`, { method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify(updates) });
      const d = await r.json();
      if (d.success) { setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, portfolio_values: { ...(m.portfolio_values || {}), ...updates } })); showToast("Valeur portefeuille mise à jour"); }
    } catch { showToast("Erreur", false); }
  }

  async function patchBudgetAlloc(mk: string, updates: { amounts?: Record<string, number>; validated?: Record<string, boolean>; rename?: { old: string; new: string }; delete_key?: string; add_key?: string; add_amount?: number }) {
    try {
      const r = await fetch(`/api/budget/month/${mk}/budget-allocation`, { method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify(updates) });
      const d = await r.json();
      if (d.success) {
        setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, budget_allocation: updates.amounts ? { ...m.budget_allocation, ...updates.amounts } as BudgetAlloc : m.budget_allocation, budget_validated: updates.validated ? { ...(m.budget_validated || {}), ...updates.validated } : m.budget_validated }));
        showToast("Budget mis à jour");
        fetch("/api/budget/forecast", { headers: getAuthHeaders() }).then(r => r.json()).then(setForecast);
      }
    } catch { showToast("Erreur", false); }
  }

  const m = months[idx];
  const totalGoalMonthly = savingsGoals.reduce((s, g) => { const mo = Math.max(1, Math.ceil((new Date(g.target_date + "-01").getTime() - Date.now()) / (30.44*24*60*60*1000))); return s + Math.round((g.target - g.current) / mo); }, 0);
  const goalRealise = m ? savingsGoals.filter(g => (g.validated_months || []).some((vm: any) => (typeof vm === "string" ? vm : vm.mk) === m.month_key)).reduce((s, g) => { const mo = Math.max(1, Math.ceil((new Date(g.target_date + "-01").getTime() - Date.now()) / (30.44*24*60*60*1000))); return s + Math.round((g.target - g.current) / mo); }, 0) : 0;
  const goalCumulRealise = m ? (() => { const yearMks = months.slice(0, idx + 1).map(mo => mo.month_key); return savingsGoals.reduce((total, g) => total + (g.validated_months || []).filter((vm: any) => yearMks.includes(typeof vm === "string" ? vm : vm.mk)).reduce((s: number, vm: any) => s + (typeof vm === "object" && vm !== null && vm.amount ? vm.amount : 0), 0), 0); })() : 0;
  const validatedBudget = m ? Object.entries(m.budget_validated || {}).filter(([, v]) => v).reduce((sum, [k]) => sum + ((m.budget_allocation as unknown as Record<string, number>)[k] || 0), 0) : 0;
  const totalExp = m ? m.expenses.filter(e => e.category !== "investment").reduce((s, e) => s + e.amount, 0) + validatedBudget : 0;
  const netBal = m ? m.income_salary + m.income_other + ((m as unknown as Record<string,number>).income_rente ?? 0) + ((m as unknown as Record<string,number>).income_epargne ?? 0) + ((m as unknown as Record<string,number>).income_actions ?? 0) + ((m as unknown as Record<string,number>).income_virements ?? 0) + ((m as unknown as Record<string,number>).income_solde_ajuste ?? 0) - totalExp - m.expenses.filter((e: Expense) => e.category === "investment").reduce((s: number, e: Expense) => s + e.amount, 0) : 0;
  const validatedCnt = m ? m.expenses.filter(e => e.validated).length + Object.values(m.budget_validated || {}).filter(Boolean).length : 0;
  const totalItems = m ? m.expenses.length + Object.keys(m.budget_allocation).length : 0;

  const TABS = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "depenses", label: "Dépenses", icon: Receipt },
    { id: "projection", label: "Projection", icon: LCIcon },
    { id: "historique", label: "Historique", icon: HIcon },
    { id: "economies", label: "Épargne", icon: PiggyBank },
    { id: "salaires", label: "Salaires", icon: Briefcase },
  ] as const;

  // In-app alerts computation
  const inAppAlerts: { type: string; title: string; detail: string; id: string; actionLabel?: string; actionTab?: string }[] = [];
  if (m) {
    if (netBal < 0) inAppAlerts.push({ type: "danger", id: "bal-neg", title: "Solde negatif ce mois", detail: `${m.month_name} ${m.year} : ${netBal.toFixed(0)} EUR` });
    else if (netBal < 300) inAppAlerts.push({ type: "warning", id: "bal-low", title: "Solde serre ce mois", detail: `${m.month_name} ${m.year} : ${netBal.toFixed(0)} EUR restants` });
    else if (netBal > 1000) inAppAlerts.push({ type: "success", id: "bal-good", title: "Bon mois !", detail: `Il vous reste ${netBal.toFixed(0)} EUR. Continuez !` });
    const unvalidated = m.expenses.filter(e => !e.validated).length;
    if (unvalidated > 0) inAppAlerts.push({ type: "action", id: "unval", title: `${unvalidated} depense${unvalidated > 1 ? "s" : ""} non validee${unvalidated > 1 ? "s" : ""}`, detail: "Validez vos depenses pour un suivi precis.", actionLabel: "Valider", actionTab: "depenses" });
    if (idx > 0 && months[idx-1]) { const prev = months[idx-1]; const prevE = prev.expenses.filter(e => e.category !== "investment").reduce((s,e) => s + e.amount, 0); const curE = m.expenses.filter(e => e.category !== "investment").reduce((s,e) => s + e.amount, 0); const pct = prevE > 0 ? Math.round(((curE - prevE) / prevE) * 100) : 0; if (pct > 15) inAppAlerts.push({ type: "insight", id: `exp-up-${idx}`, title: "Depenses en hausse", detail: `+${pct}% vs ${prev.month_name} (${Math.round(curE)} EUR vs ${Math.round(prevE)} EUR)`, actionLabel: "Details", actionTab: "depenses" }); else if (pct < -15) inAppAlerts.push({ type: "success", id: `exp-down-${idx}`, title: "Depenses en baisse", detail: `${pct}% vs ${prev.month_name}. Bien joue !` }); }
    const investT = m.expenses.filter(e => e.category === "investment").reduce((s,e) => s + e.amount, 0); const avgInv = idx > 0 ? months.slice(0, idx).reduce((s, mo) => s + mo.expenses.filter(e => e.category === "investment").reduce((s2,e) => s2 + e.amount, 0), 0) / idx : 0; if (investT > avgInv * 1.1 && idx > 0) inAppAlerts.push({ type: "success", id: `inv-up-${idx}`, title: "Epargne au-dessus de la moyenne", detail: `${Math.round(investT)} EUR investi (moy: ${Math.round(avgInv)} EUR)`, actionLabel: "Epargne", actionTab: "economies" });
    // Budget envelope alerts (>80% used)
    const ba = m.budget_allocation as unknown as Record<string, number>;
    const bv = (m.budget_validated || {}) as Record<string, boolean>;
    Object.entries(ba).forEach(([k, alloc]) => {
      if (alloc > 0 && bv[k]) {
        inAppAlerts.push({ type: "info", id: `env-${k}`, title: `Enveloppe ${k} validée`, detail: `${alloc.toFixed(0)} EUR` });
      }
    });
  }
  // Forecast alerts
  if (forecast?.alerts) {
    forecast.alerts.forEach((a: { month_name: string; alert_type: string; message: string }) => {
      inAppAlerts.push({ type: a.alert_type === "danger" ? "danger" : "warning", id: `forecast-${a.month_name}`, title: a.month_name, detail: a.message });
    });
  }

  // Auth guard: show login if not authenticated
  if (authChecked && !authToken) return (
    <div style={{ background: S.bg, minHeight: "100vh", display: "flex", fontFamily: S.font }}>
      {/* Left: branding panel (hidden on mobile) */}
      <div style={{ flex: 1, background: `linear-gradient(135deg, ${S.accent}, #f59e0b)`, display: isMobile ? "none" : "flex", flexDirection: "column", justifyContent: "center", padding: "60px 48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <h1 style={{ fontFamily: S.heading, fontSize: 36, fontWeight: 900, color: "#fff", margin: "0 0 12px", lineHeight: 1.1 }}>Prenez le controle de vos finances</h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, margin: "0 0 32px" }}>Suivez vos revenus, depenses et investissements. Visualisez vos projections. Atteignez vos objectifs.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {["Tableau de bord avec 5 KPIs en temps reel", "Projection 12 mois avec alertes", "Portefeuille investissements detaille", "Simulateur fiscal integre"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={12} color="#fff" /></div><span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{f}</span></div>
          ))}
        </div>
      </div>
      {/* Right: login form */}
      <div style={{ flex: 1, maxWidth: isMobile ? "100%" : 480, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "40px 24px" : "40px 48px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: S.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><span style={{ fontFamily: S.heading, fontSize: 20, fontWeight: 800, color: S.text }}>BudgetApp</span></div>
          <h2 style={{ fontFamily: S.heading, fontSize: 24, fontWeight: 800, color: S.text, margin: "0 0 4px" }}>{authMode === "register" ? "Creer un compte" : "Content de vous revoir"}</h2>
          <p style={{ color: S.muted, fontSize: 13, margin: 0 }}>{authMode === "register" ? "Commencez a gerer votre budget en 2 minutes" : "Connectez-vous pour acceder a votre budget"}</p>
        </div>
        {authError && <div style={{ background: `${S.danger}10`, border: `1px solid ${S.danger}40`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: S.danger, fontSize: 13 }}>{authError}</div>}
        {authMode === "register" && (
          <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Nom (optionnel)" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${S.border}`, background: S.surface2, color: S.text, fontSize: 14, fontFamily: S.font, marginBottom: 12, outline: "none" }} />
        )}
        <input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email" type="email" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${S.border}`, background: S.surface2, color: S.text, fontSize: 14, fontFamily: S.font, marginBottom: 12, outline: "none" }} onKeyDown={e => e.key === "Enter" && handleAuth()} />
        <input value={authPw} onChange={e => setAuthPw(e.target.value)} placeholder="Mot de passe" type="password" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${S.border}`, background: S.surface2, color: S.text, fontSize: 14, fontFamily: S.font, marginBottom: 20, outline: "none" }} onKeyDown={e => e.key === "Enter" && handleAuth()} />
        <button onClick={handleAuth} disabled={authLoading} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: S.primary, color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: S.font, opacity: authLoading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {authLoading && <div style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
          {authMode === "register" ? "Creer mon compte" : "Se connecter"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, color: S.muted, fontSize: 13 }}>
          {authMode === "register" ? "Déjà un compte ? " : "Pas encore de compte ? "}
          <button onClick={() => { setAuthMode(authMode === "register" ? "login" : "register"); setAuthError(""); }} style={{ background: "none", border: "none", color: S.primary, fontWeight: 700, fontSize: 13, fontFamily: S.font, textDecoration: "underline" }}>
            {authMode === "register" ? "Se connecter" : "Inscription"}
          </button>
        </p>
      </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (loading) return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: S.font, color: S.text }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}`}</style>
      <div style={{ display: "flex" }}>
        {/* Skeleton sidebar */}
        <div style={{ width: 64, minHeight: "100vh", background: S.surface, borderRight: `1px solid ${S.border}`, padding: "16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(90deg, ${S.surface2} 25%, ${S.border} 50%, ${S.surface2} 75%)`, backgroundSize: "400px 100%", animation: "shimmer 1.5s infinite" }} />
          {[...Array(6)].map((_, i) => <div key={i} style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(90deg, ${S.surface2} 25%, ${S.border} 50%, ${S.surface2} 75%)`, backgroundSize: "400px 100%", animation: `shimmer 1.5s infinite ${i * 0.1}s` }} />)}
        </div>
        <div style={{ flex: 1, padding: 24, maxWidth: 1200, margin: "0 auto" }}>
          {/* Skeleton header */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ width: 180, height: 20, borderRadius: 6, background: `linear-gradient(90deg, ${S.surface2} 25%, ${S.border} 50%, ${S.surface2} 75%)`, backgroundSize: "400px 100%", animation: "shimmer 1.5s infinite" }} />
            <div style={{ width: 140, height: 36, borderRadius: 8, background: `linear-gradient(90deg, ${S.surface2} 25%, ${S.border} 50%, ${S.surface2} 75%)`, backgroundSize: "400px 100%", animation: "shimmer 1.5s infinite 0.2s" }} />
          </div>
          {/* Skeleton KPI strip */}
          <div style={{ display: "flex", gap: 0, borderRadius: 14, border: `1px solid ${S.border}`, overflow: "hidden", marginBottom: 20 }}>
            {[...Array(5)].map((_, i) => <div key={i} style={{ flex: 1, padding: "18px 14px", borderRight: i < 4 ? `1px solid ${S.border}` : "none", textAlign: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, margin: "0 auto 8px", background: `linear-gradient(90deg, ${S.surface2} 25%, ${S.border} 50%, ${S.surface2} 75%)`, backgroundSize: "400px 100%", animation: `shimmer 1.5s infinite ${i * 0.15}s` }} />
              <div style={{ width: 50, height: 10, borderRadius: 4, margin: "0 auto 6px", background: `linear-gradient(90deg, ${S.surface2} 25%, ${S.border} 50%, ${S.surface2} 75%)`, backgroundSize: "400px 100%", animation: `shimmer 1.5s infinite ${i * 0.15 + 0.1}s` }} />
              <div style={{ width: 70, height: 18, borderRadius: 6, margin: "0 auto", background: `linear-gradient(90deg, ${S.surface2} 25%, ${S.border} 50%, ${S.surface2} 75%)`, backgroundSize: "400px 100%", animation: `shimmer 1.5s infinite ${i * 0.15 + 0.2}s` }} />
            </div>)}
          </div>
          {/* Skeleton cards */}
          {[...Array(3)].map((_, i) => <div key={i} style={{ height: 100, borderRadius: 14, border: `1px solid ${S.border}`, marginBottom: 16, background: `linear-gradient(90deg, ${S.surface2} 25%, ${S.border} 50%, ${S.surface2} 75%)`, backgroundSize: "400px 100%", animation: `shimmer 1.5s infinite ${i * 0.2}s` }} />)}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: S.bg, minHeight: "100vh", color: S.text, fontFamily: S.font, "--mob-bg": S.surface, "--mob-border": S.border, "--mob-muted": S.muted, "--mob-accent": S.accent } as React.CSSProperties}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .tab-btn:hover{color:#f1f5f9!important}
        .card-h:hover{border-color:rgba(255,255,255,0.15)!important}
        .card-h{transition:border-color 0.2s}
        .row-h:hover{background:#1e1e1e!important}
        .row-h:hover .del-btn{opacity:1!important}
        .row-h{transition:background 0.15s}
        .del-btn{opacity:0;transition:opacity 0.15s}
        .val-btn:hover{opacity:0.85!important;transform:scale(1.05)}
        .val-btn:active{transform:scale(0.92)}
        .val-btn{transition:all 0.15s cubic-bezier(0.4,0,0.2,1)}
        input:focus{outline:none!important}
        select{cursor:pointer}
        button{cursor:pointer;transition:transform 0.1s}
        /* ===== MOBILE RESPONSIVE ===== */
        @media(max-width:768px){
          .desktop-sidebar{display:none!important}
          .main-content{margin-left:0!important;padding-bottom:64px}
          .app-header{padding:6px 10px!important;gap:0;align-items:center!important}
          .header-brand{display:none!important}
          .header-brand h1{font-size:15px!important}
          .header-tools{border-left:none!important;padding:0!important;gap:3px!important}
          .kpi-strip{flex-wrap:wrap!important;border-radius:10px!important}
          .kpi-strip>div{min-width:30%!important;flex:1 1 30%!important;padding:10px 6px!important}
          .tab-content{padding:12px 10px!important}
          .mobile-tabbar{display:flex!important}
          .expenses-grid{grid-template-columns:1fr!important}
        }
        @media(min-width:769px){
          .mobile-tabbar{display:none!important}
        }
        .mobile-tabbar{position:fixed;bottom:0;left:0;right:0;z-index:60;background:var(--mob-bg,#fff);border-top:1px solid var(--mob-border,#e2e8f0);padding:4px 2px 8px;box-shadow:0 -2px 8px rgba(0,0,0,0.05);display:none}
        .mob-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 0;background:none;border:none;cursor:pointer;font-family:inherit}
        .mob-tab svg{width:18px;height:18px;color:var(--mob-muted,#94a3b8)}
        .mob-tab span{font-size:8px;font-weight:600;color:var(--mob-muted,#94a3b8)}
        .mob-tab.active svg{color:var(--mob-accent,#f97316)}
        .mob-tab.active span{color:var(--mob-accent,#f97316);font-weight:700}
        button:active{transform:scale(0.96)}
        @keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
        @keyframes bounceCheck{0%{transform:scale(1)}30%{transform:scale(1.25)}60%{transform:scale(0.9)}100%{transform:scale(1)}}
        @keyframes slideInToast{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes toastProgress{from{width:100%}to{width:0%}}
        @keyframes fadeUpStagger{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .check-bounce{animation:bounceCheck 0.35s cubic-bezier(0.4,0,0.2,1)}
        .row-h:hover .edit-hint{opacity:0.6!important}
        .editable-amt{position:relative;border-bottom:1.5px dashed transparent;transition:border-color 0.2s;padding-bottom:1px}
        .editable-amt:hover{border-color:currentColor}
        .editable-amt:hover .edit-pencil{opacity:0.5!important}
        .editable-amt .edit-pencil{opacity:0;transition:opacity 0.2s}
        .edit-hint{opacity:0;transition:opacity 0.2s}
        .card-h:hover{border-color:rgba(255,255,255,0.15)!important;transform:translateY(-1px)}
        .card-h{transition:border-color 0.2s, transform 0.2s, box-shadow 0.2s}
        .card-h:hover{box-shadow:0 4px 12px rgba(0,0,0,0.15)}
        .refresh-spin{animation:spin 0.8s linear infinite}
        .table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
        @media(max-width:768px){table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}}
        @media(max-width:768px){.table-scroll{margin:0 -10px;padding:0 10px}}
        .hint-bubble{position:relative;background:#f97316;color:#fff;font-size:12px;font-weight:600;padding:8px 14px;border-radius:10px;margin:8px 0;animation:fadeUpStagger 0.4s ease;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(249,115,22,0.25)}
        .tour-overlay{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;animation:fadeUpStagger 0.3s ease}
        .tour-card{background:#fff;border-radius:20px;max-width:380px;width:90%;padding:28px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative}
        .tour-step-num{width:36px;height:36px;border-radius:50%;background:#f97316;color:#fff;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
        .tour-title{font-size:17px;font-weight:800;color:#1e293b;margin-bottom:6px}
        .tour-desc{font-size:13px;color:#64748b;line-height:1.6;margin-bottom:18px}
        .tour-dots{display:flex;gap:6px;justify-content:center;margin-bottom:16px}
        .tour-dot{width:8px;height:8px;border-radius:50%;background:#e2e8f0}
        .tour-dot.active{background:#f97316;width:20px;border-radius:4px}
        .tour-dot.done{background:#16a34a}
        .tour-btn{padding:10px 28px;border-radius:10px;border:none;font-family:Outfit;font-size:14px;font-weight:700;cursor:pointer}
        .tour-btn-next{background:#f97316;color:#fff}
        .tour-btn-skip{background:none;color:#94a3b8;font-size:12px;margin-top:8px;border:none;cursor:pointer;font-family:Outfit}
        .hint-close{background:none;border:none;color:rgba(255,255,255,0.7);font-size:14px;cursor:pointer;padding:0 4px;flex-shrink:0}
      `}</style>

      {/* Profile Modal */}
      {showProfile && <div onClick={() => setShowProfile(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: S.surface, borderRadius: 20, width: "100%", maxWidth: 440, maxHeight: "80vh", overflow: "auto", padding: 24, fontFamily: S.font }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 800, color: S.text }}>Mon profil</h2><button onClick={() => setShowProfile(false)} style={{ background: "none", border: "none", fontSize: 18, color: S.muted, cursor: "pointer" }}>x</button></div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${S.accent}, ${S.warning})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 800, flexShrink: 0 }}>{(user?.name || user?.email || "U")[0].toUpperCase()}</div>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: S.text }}>{user?.name || "Utilisateur"}</div><div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>{user?.email}</div></div>
          </div>
          {[{l:"Nom complet",v:user?.name||"Non renseigne",editable:true,action:async () => { const n = prompt("Nouveau nom:", user?.name || ""); if (n !== null) { setUser(prev => prev ? {...prev, name: n} : prev); localStorage.setItem("budget_user", JSON.stringify({...user, name: n})); showToast("Nom mis a jour"); } }},{l:"Email",v:user?.email||""},{l:"Mot de passe",v:"*********",editable:true,action:async () => { alert("Changement de mot de passe bientot disponible"); }},{l:"Membre depuis",v:"Mai 2026"},{l:"Devise",v:"EUR"}].map((f: {l:string;v:string;editable?:boolean;action?:()=>void}) => (
            <div key={f.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${S.border}` }}>
              <span style={{ fontSize: 12, color: S.muted }}>{f.l}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>{f.v}</span>{f.editable && <button onClick={f.action} style={{ fontSize: 10, fontWeight: 600, color: S.accent, background: `${S.accent}10`, border: `1px solid ${S.accent}30`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontFamily: S.font }}>Modifier</button>}</span>
            </div>
          ))}
        </div>
      </div>}

      {/* Settings Modal */}
      {showSettings && <div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: S.surface, borderRadius: 20, width: "100%", maxWidth: 440, maxHeight: "80vh", overflow: "auto", padding: 24, fontFamily: S.font }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 800, color: S.text }}>Parametres</h2><button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", fontSize: 18, color: S.muted, cursor: "pointer" }}>x</button></div>
          <div style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 8 }}>Affichage</div>
          <div style={{ background: S.bg, borderRadius: 12, marginBottom: 16, border: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${S.border}` }}><span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Mode sombre</span><button onClick={() => { setDarkMode(!darkMode); }} style={{ width: 40, height: 22, borderRadius: 11, background: darkMode ? S.accent : S.border, border: "none", cursor: "pointer", position: "relative" }}><div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: darkMode ? 20 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} /></button></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}><span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Langue</span><span style={{ fontSize: 12, color: S.muted }}>Francais</span></div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 8 }}>Budget</div>
          <div style={{ background: S.bg, borderRadius: 12, marginBottom: 16, border: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${S.border}` }}><span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Notifications</span><button style={{ width: 40, height: 22, borderRadius: 11, background: S.accent, border: "none", cursor: "pointer", position: "relative" }}><div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} /></button></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${S.border}`, cursor: "pointer" }}><span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Exporter mes donnees</span><span style={{ color: S.muted }}>CSV</span></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", cursor: "pointer" }}><span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Enveloppes par defaut</span><span style={{ color: S.muted }}>6</span></div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 8 }}>Aide</div>
          <div style={{ background: S.bg, borderRadius: 12, marginBottom: 16, border: `1px solid ${S.border}` }}>
            <div onClick={() => { localStorage.removeItem("budget_tour_done"); localStorage.removeItem("budget_hints"); setHints({}); setTourStep(0); setShowSettings(false); }} style={{ padding: "12px 14px", borderBottom: `1px solid ${S.border}`, cursor: "pointer" }}><span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Revoir le tutoriel</span></div>
            <div style={{ padding: "12px 14px", cursor: "pointer" }}><span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Signaler un probleme</span></div>
          </div>
          <div style={{ background: S.bg, borderRadius: 12, border: `1px solid ${S.danger}30` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${S.danger}15` }}>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: S.danger }}>Reinitialiser</div><div style={{ fontSize: 10, color: S.muted }}>Supprimer toutes les donnees</div></div>
              <button onClick={async () => { if (confirm("Supprimer TOUTES vos donnees ?")) { await fetch("/api/budget/user-data", { method: "DELETE", headers: getAuthHeaders() }); showToast("Donnees supprimees"); loadData(); setShowSettings(false); }}} style={{ fontSize: 11, fontWeight: 700, color: S.danger, background: `${S.danger}08`, border: `1px solid ${S.danger}30`, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontFamily: S.font }}>Reinitialiser</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: S.danger }}>Supprimer le compte</div><div style={{ fontSize: 10, color: S.muted }}>Irreversible</div></div>
              <button onClick={() => { if (confirm("Supprimer votre compte ? Cette action est irreversible.")) { logout(); }}} style={{ fontSize: 11, fontWeight: 700, color: S.danger, background: `${S.danger}08`, border: `1px solid ${S.danger}30`, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontFamily: S.font }}>Supprimer</button>
            </div>
          </div>
        </div>
      </div>}

      {/* Welcome Tour */}
      {tourStep >= 0 && !needsOnboarding && (() => {
        const steps = [
          { n: 1, t: "Bienvenue !", d: "Voici votre tableau de bord. Il resume votre situation financiere du mois en un coup d'oeil." },
          { n: 2, t: "Vos KPIs", d: "Les 5 indicateurs en haut montrent vos revenus, depenses, ce qu'il vous reste, le cumul depuis janvier et votre epargne." },
          { n: 3, t: "Validez vos depenses", d: "Chaque mois, cochez vos depenses une par une pour confirmer qu'elles sont correctes. Vous pouvez aussi swiper !" },
          { n: 4, t: "Modifiez les montants", d: "Cliquez sur n'importe quel montant pour le modifier directement. C'est aussi simple qu'un tableur." },
          { n: 5, t: "Explorez les onglets", d: "Depenses, Projection, Historique, Epargne, Salaires... Tout est accessible en bas de l'ecran sur mobile ou dans la sidebar sur desktop." },
        ];
        const s = steps[tourStep];
        if (!s) return null;
        return (<div className="tour-overlay" onClick={() => { if (tourStep >= steps.length - 1) { setTourStep(-1); localStorage.setItem("budget_tour_done", "1"); } else setTourStep(tourStep + 1); }}>
          <div className="tour-card" onClick={e => e.stopPropagation()}>
            <div className="tour-step-num">{s.n}</div>
            <div className="tour-title">{s.t}</div>
            <div className="tour-desc">{s.d}</div>
            <div className="tour-dots">{steps.map((_, i) => <div key={i} className={`tour-dot${i === tourStep ? " active" : i < tourStep ? " done" : ""}`} />)}</div>
            <button className="tour-btn tour-btn-next" onClick={() => { if (tourStep >= steps.length - 1) { setTourStep(-1); localStorage.setItem("budget_tour_done", "1"); } else setTourStep(tourStep + 1); }}>
              {tourStep >= steps.length - 1 ? "C'est parti !" : "Suivant"}
            </button>
            <br /><button className="tour-btn-skip" onClick={() => { setTourStep(-1); localStorage.setItem("budget_tour_done", "1"); }}>Passer le tour</button>
          </div>
        </div>);
      })()}

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? S.surface : "#2a1010", border: `1px solid ${toast.ok ? S.accent : S.danger}`, borderRadius: 12, padding: "12px 20px 8px", fontFamily: S.font, fontSize: 14, animation: "slideInToast 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 200, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            {toast.ok ? <Check size={14} color={S.success} /> : <AlertTriangle size={14} color={S.danger} />}
            <span style={{ fontWeight: 600 }}>{toast.msg}</span>
          </div>
          <div style={{ height: 2, borderRadius: 1, background: `${toast.ok ? S.accent : S.danger}30`, marginTop: 4, overflow: "hidden" }}><div style={{ height: "100%", background: toast.ok ? S.accent : S.danger, animation: "toastProgress 3s linear forwards" }} /></div>
        </div>
      )}

      {/* ── Onboarding Wizard ──────────────────────────────────────── */}
      {needsOnboarding && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: S.surface, borderRadius: 16, maxWidth: 520, width: "100%", padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", position: "relative" as const }}>
            <button onClick={() => setNeedsOnboarding(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#999", lineHeight: 1 }}>x</button>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[0,1,2].map(s => (<div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= onboardStep ? S.accent : S.border }} />))}
            </div>

            {onboardStep === 0 && (<div>
              <h2 style={{ fontFamily: S.heading, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Bienvenue ! 🎉</h2>
              <p style={{ color: S.muted, fontSize: 14, margin: "0 0 20px" }}>Configurons votre budget en 3 etapes rapides.</p>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Salaire net mensuel (EUR)</label>
              <input type="number" value={obSalary} onChange={e => setObSalary(e.target.value)} placeholder="Ex: 5000" style={{ width: "100%", padding: "12px 14px", fontSize: 18, fontFamily: S.heading, fontWeight: 700, border: `2px solid ${S.border}`, borderRadius: 10, background: S.bg, color: S.text, outline: "none" }} autoFocus />
              <button onClick={() => { if (obSalary) setOnboardStep(1); }} disabled={!obSalary} style={{ width: "100%", marginTop: 16, padding: "12px", fontSize: 15, fontWeight: 700, background: obSalary ? S.accent : S.border, color: obSalary ? "#fff" : S.muted, border: "none", borderRadius: 10, cursor: obSalary ? "pointer" : "default" }}>Suivant →</button>
            </div>)}

            {onboardStep === 1 && (<div>
              <h2 style={{ fontFamily: S.heading, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Dépenses récurrentes mensuelles</h2>
              <p style={{ color: S.muted, fontSize: 14, margin: "0 0 16px" }}>Ajoutez vos depenses recurrentes. Vous pourrez modifier plus tard.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {COMMON_EXPENSES.filter(ce => !obExpenses.some(e => e.label === ce.l)).map(ce => (
                  <button key={ce.l} onClick={() => setObExpenses(p => [...p, { label: ce.l, amount: "", category: ce.c }])} style={{ fontSize: 12, padding: "5px 10px", border: `1px solid ${S.border}`, borderRadius: 6, background: S.bg, color: S.text, cursor: "pointer" }}>+ {ce.l}</button>
                ))}
              </div>
              {obExpenses.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{e.label}</span>
                  <input type="number" value={e.amount} onChange={ev => { const n = [...obExpenses]; n[i].amount = ev.target.value; setObExpenses(n); }} placeholder="Montant" style={{ width: 100, padding: "6px 10px", fontSize: 14, border: `1px solid ${S.border}`, borderRadius: 6, background: S.bg, color: S.text, textAlign: "right" }} />
                  <span style={{ fontSize: 12, color: S.muted }}>EUR</span>
                  <button onClick={() => setObExpenses(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: S.danger, cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 8, marginBottom: 16 }}>
                <input value={obNewLabel} onChange={e => setObNewLabel(e.target.value)} placeholder="Autre depense..." style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: `1px solid ${S.border}`, borderRadius: 6, background: S.bg, color: S.text }} />
                <button onClick={() => { if (obNewLabel.trim()) { setObExpenses(p => [...p, { label: obNewLabel.trim(), amount: "", category: "fixed" }]); setObNewLabel(""); } }} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, border: `1px solid ${S.border}`, borderRadius: 6, background: S.bg, color: S.accent, cursor: "pointer" }}>Ajouter</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setOnboardStep(0)} style={{ flex: 1, padding: "12px", fontSize: 14, border: `1px solid ${S.border}`, borderRadius: 10, background: "transparent", color: S.text, cursor: "pointer" }}>← Retour</button>
                <button onClick={() => setOnboardStep(2)} style={{ flex: 2, padding: "12px", fontSize: 15, fontWeight: 700, background: S.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" }}>Suivant →</button>
              </div>
            </div>)}

            {onboardStep === 2 && (<div>
              <h2 style={{ fontFamily: S.heading, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Objectif epargne</h2>
              <p style={{ color: S.muted, fontSize: 14, margin: "0 0 20px" }}>Combien souhaitez-vous mettre de cote chaque mois ?</p>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Epargne mensuelle (EUR)</label>
              <input type="number" value={obSavings} onChange={e => setObSavings(e.target.value)} placeholder="Ex: 500" style={{ width: "100%", padding: "12px 14px", fontSize: 18, fontFamily: S.heading, fontWeight: 700, border: `2px solid ${S.border}`, borderRadius: 10, background: S.bg, color: S.text, outline: "none" }} autoFocus />
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => setOnboardStep(1)} style={{ flex: 1, padding: "12px", fontSize: 14, border: `1px solid ${S.border}`, borderRadius: 10, background: "transparent", color: S.text, cursor: "pointer" }}>← Retour</button>
                <button disabled={obLoading} onClick={async () => {
                  setObLoading(true);
                  try {
                    const body = { salary: parseFloat(obSalary) || 0, savings_target: parseFloat(obSavings) || 0, start_year: selectedYear, fixed_expenses: obExpenses.filter(e => e.amount).map(e => ({ label: e.label, amount: parseFloat(e.amount) || 0, category: e.category })) };
                    const obRes = await fetch("/api/budget/onboarding", { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(body) });
                    if (!obRes.ok) { const e = await obRes.json().catch(() => ({})); setObLoading(false); alert(e.detail || "Erreur serveur " + obRes.status); return; }
                    setNeedsOnboarding(false);
                    setOnboardStep(0);
                    setTimeout(() => startTour(), 800);
                    const mr = await fetch(`/api/budget/months?year=${selectedYear}`, { headers: getAuthHeaders() });
                    const md = await mr.json();
                    setMonths(md.months || []);
                    setIdx(0);
                    showToast("Budget configure ! 🎉");
                  } catch (err) { setObLoading(false); alert("Erreur: " + (err instanceof Error ? err.message : String(err))); }
                }} style={{ flex: 2, padding: "12px", fontSize: 15, fontWeight: 700, background: S.accent, color: "#fff", border: "none", borderRadius: 10, cursor: obLoading ? "wait" : "pointer", opacity: obLoading ? 0.7 : 1 }}>{obLoading ? "Configuration en cours..." : "Lancer mon budget 🚀"}</button>
              </div>
            </div>)}
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      
      <aside className="desktop-sidebar" style={{ display: isMobile ? "none" : "flex", width: sidebarOpen ? 220 : 60, minHeight: "100vh", background: S.surface, borderRight: `1px solid ${S.border}`, transition: "width 0.2s ease", flexShrink: 0, flexDirection: "column", padding: "12px 8px", position: "fixed", left: 0, top: 0, zIndex: 50 }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", color: S.text, width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 8 }}><Menu size={20} /></button>
        {sidebarOpen && <div style={{ fontFamily: S.heading, fontSize: 17, fontWeight: 800, color: S.primary, padding: "0 10px", marginBottom: 20 }}>BudgetApp</div>}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {TABS.map(t => { const Icon = t.icon; const active = tab === t.id; return (<button key={t.id} onClick={() => setTab(t.id)} title={t.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: sidebarOpen ? "10px 12px" : "10px 0", justifyContent: sidebarOpen ? "flex-start" : "center", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? S.primary : S.muted, background: active ? `${S.primary}12` : "transparent", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: S.font, transition: "all 0.15s", width: "100%" }}><Icon size={18} />{sidebarOpen && <span>{t.label}</span>}</button>); })}
        </nav>
        <button onClick={() => setDarkMode(!darkMode)} style={{ marginTop: 8, background: "transparent", border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: sidebarOpen ? "8px 12px" : "8px 0", display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "flex-start" : "center", gap: 8, width: "100%", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{darkMode ? "☀" : "☽"}{sidebarOpen && <span>{darkMode ? "Mode clair" : "Mode sombre"}</span>}</button>

        <div style={{ position: "relative", marginTop: 8, width: "100%", display: "flex", justifyContent: "center" }}>
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ display: "flex", alignItems: "center", gap: 8, padding: sidebarOpen ? "8px 12px" : "8px", background: showProfileMenu ? S.surface2 : S.bg, border: `1px solid ${S.border}`, borderRadius: 10, cursor: "pointer", color: S.text, fontFamily: S.font, fontSize: 12, fontWeight: 600, width: sidebarOpen ? "calc(100% - 16px)" : 36, justifyContent: sidebarOpen ? "flex-start" : "center", overflow: "hidden" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: S.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{(user?.name || user?.email || "U")[0].toUpperCase()}</div>
            {sidebarOpen && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{user?.name || user?.email?.split("@")[0] || "Utilisateur"}</span>}
          </button>
          {showProfileMenu && <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: "calc(100% + 6px)", left: sidebarOpen ? 8 : -60, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", width: 200, zIndex: 100, overflow: "hidden", fontFamily: S.font }}>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: S.text }}>{user?.name || "Utilisateur"}</div>
              <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{user?.email}</div>
            </div>
            <button onClick={() => { setShowProfile(true); setShowProfileMenu(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: "none", border: "none", color: S.text, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: S.font, textAlign: "left" as const }}>Voir profil</button>
            <button onClick={() => { setShowSettings(true); setShowProfileMenu(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: "none", border: "none", color: S.text, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: S.font, textAlign: "left" as const }}>Parametres</button>
            <div style={{ borderTop: `1px solid ${S.border}` }}>
              <button onClick={async () => { if (confirm("Supprimer TOUTES vos donnees ? Cette action est irreversible.")) { await fetch("/api/budget/user-data", { method: "DELETE", headers: getAuthHeaders() }); showToast("Donnees supprimees"); loadData(); } setShowProfileMenu(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: "none", border: "none", color: S.danger, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: S.font, textAlign: "left" as const }}>Tout supprimer</button>
              <button onClick={() => { logout(); setShowProfileMenu(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: "none", border: "none", color: S.muted, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: S.font, textAlign: "left" as const }}>Se deconnecter</button>
            </div>
          </div>}
        </div>      </aside>
      <div className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? 220 : 60), transition: "margin-left 0.2s ease", flex: 1 }}>
      <header className="app-header" style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "stretch", position: "sticky", top: 0, zIndex: 40 }}>
        {/* Brand - hidden on mobile */}
        {!isMobile && <div className="header-brand" style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, borderRight: `1px solid ${S.border}` }}>
          <h1 style={{ fontFamily: S.heading, fontSize: 17, fontWeight: 800, color: S.text, margin: 0 }}>Budget Personnel</h1>
          <span style={{ fontSize: 11, color: S.muted }}>{getDateFR()}</span>
        </div>}
        {/* Month navigation - center */}
        {m && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: isMobile ? "flex-start" : "center", gap: isMobile ? 6 : 10 }}>
          <button onClick={() => { if (idx === 0 && selectedYear > 2026) { const ny = selectedYear - 1; setSelectedYear(ny); setIdx(11); fetch(`/api/budget/months?year=${ny}`, { headers: getAuthHeaders() }).then(r => r.json()).then(md => setMonths(md.months || [])); } else { setIdx(i => Math.max(0, i - 1)); } }} disabled={idx === 0 && selectedYear <= 2026} style={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: 6, border: `1px solid ${S.border}`, background: S.bg, color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ArrowLeft size={13} /></button>
          <select
            value={`${selectedYear}-${String(idx + 1).padStart(2, "0")}`}
            onChange={(e) => { const [y, mo] = e.target.value.split("-").map(Number); setSelectedYear(y); setIdx(mo - 1); fetch(`/api/budget/months?year=${y}`, { headers: getAuthHeaders() }).then(r => r.json()).then(md => setMonths(md.months || [])); }}
            style={{ fontFamily: S.heading, fontSize: 14, fontWeight: 700, color: S.primary, background: `${S.accent}08`, border: `1px solid ${S.accent}30`, borderRadius: 8, padding: isMobile ? "5px 20px 5px 10px" : "7px 28px 7px 12px", cursor: "pointer", appearance: "none" as const, WebkitAppearance: "none" as const, textAlign: "center", outline: "none" }}>
            {YEARS.map(y => { const MN = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"]; return MN.map((mn, mi) => (<option key={`${y}-${mi}`} value={`${y}-${String(mi+1).padStart(2,"0")}`}>{mn} {y}</option>)); })}
          </select>
          <button onClick={() => { if (idx === months.length - 1 && selectedYear < 2036) { const ny = selectedYear + 1; setSelectedYear(ny); setIdx(0); fetch(`/api/budget/months?year=${ny}`, { headers: getAuthHeaders() }).then(r => r.json()).then(md => setMonths(md.months || [])); } else { setIdx(i => Math.min(months.length - 1, i + 1)); } }} disabled={idx === months.length - 1 && selectedYear >= 2036} style={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: 6, border: `1px solid ${S.border}`, background: S.bg, color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ArrowRight size={13} /></button>
          {!isMobile && <span style={{ fontSize: 10, color: S.muted, fontWeight: 600 }}>{validatedCnt}/{totalItems} valides</span>}
        </div>}
        {/* Tools */}
        <div className="header-tools" style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 14px", borderLeft: `1px solid ${S.border}` }}>
          {isMobile && <button onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ width: 26, height: 26, borderRadius: "50%", background: S.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800, border: "none", cursor: "pointer", flexShrink: 0 }}>{(user?.name || user?.email || "U")[0].toUpperCase()}</button>}
          {showProfileMenu && isMobile && <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: 48, right: 10, left: 10, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", zIndex: 100, fontFamily: S.font, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${S.accent}, ${S.warning})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{(user?.name || user?.email || "U")[0].toUpperCase()}</div>
              <div><div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>{user?.name || "Utilisateur"}</div><div style={{ fontSize: 11, color: S.muted }}>{user?.email}</div></div>
            </div>
            <button onClick={() => { setShowProfile(true); setShowProfileMenu(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", borderBottom: `1px solid ${S.border}`, color: S.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: S.font, textAlign: "left" as const }}>Voir profil</button>
            <button onClick={() => { setShowSettings(true); setShowProfileMenu(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", borderBottom: `1px solid ${S.border}`, color: S.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: S.font, textAlign: "left" as const }}>Parametres</button>
            <button onClick={async () => { if (confirm("Supprimer TOUTES vos donnees ?")) { await fetch("/api/budget/user-data", { method: "DELETE", headers: getAuthHeaders() }); showToast("Donnees supprimees"); loadData(); } setShowProfileMenu(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", borderBottom: `1px solid ${S.border}`, color: S.danger, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: S.font, textAlign: "left" as const }}>Tout supprimer</button>
            <button onClick={() => { logout(); setShowProfileMenu(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", color: S.muted, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: S.font, textAlign: "left" as const }}>Se deconnecter</button>
          </div>}
          <button onClick={() => setNeedsOnboarding(true)} title="Aide" style={{ display: "flex", width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8, border: `1px solid ${S.border}`, background: S.bg, color: S.muted, alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>?</button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAlerts(!showAlerts)} title="Alertes" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${showAlerts ? S.accent : S.border}`, background: showAlerts ? `${S.accent}10` : S.bg, color: inAppAlerts.filter(a => !dismissedAlerts.includes(a.id)).length > 0 ? S.accent : S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Bell size={13} />
              {inAppAlerts.filter(a => !dismissedAlerts.includes(a.id)).length > 0 && <span style={{ position: "absolute", top: -3, right: -3, width: 14, height: 14, borderRadius: "50%", background: S.danger, color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${S.surface}` }}>{inAppAlerts.filter(a => !dismissedAlerts.includes(a.id)).length}</span>}
            </button>
            {showAlerts && <div style={{ position: isMobile ? "fixed" as any : "absolute" as any, top: isMobile ? 50 : 38, right: isMobile ? 10 : 0, left: isMobile ? 10 : "auto", width: isMobile ? "auto" : 300, maxHeight: 380, overflowY: "auto", background: S.surface, border: "none", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", zIndex: 100, padding: 8 }}>
              <div style={{ padding: "12px 14px 10px", fontFamily: S.heading, fontSize: 15, fontWeight: 800, color: S.text }}>Notifications</div>
              {inAppAlerts.filter(a => !dismissedAlerts.includes(a.id)).length === 0 && <div style={{ padding: "16px 10px", textAlign: "center", color: S.muted, fontSize: 12 }}>Aucune notification</div>}
              {inAppAlerts.filter(a => !dismissedAlerts.includes(a.id)).map((a) => { const cl = a.type === "danger" ? S.danger : a.type === "success" ? S.success : a.type === "insight" ? S.primary : a.type === "warning" ? S.warning : S.accent; return (<div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", borderBottom: `1px solid ${S.border}` }}><div style={{ width: 36, height: 36, borderRadius: "50%", background: `${cl}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{a.type === "success" ? <Check size={16} color={cl} /> : a.type === "action" ? <Bell size={16} color={cl} /> : a.type === "insight" ? <ArrowRight size={16} color={cl} /> : <AlertTriangle size={16} color={cl} />}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: S.text, lineHeight: 1.3 }}>{a.title}</div><div style={{ fontSize: 11, color: S.muted, marginTop: 1, lineHeight: 1.3 }}>{a.detail}</div>{a.actionLabel && <button onClick={() => { setTab((a.actionTab || "dashboard") as any); setShowAlerts(false); }} style={{ fontSize: 11, fontWeight: 600, color: S.primary, background: "none", border: "none", cursor: "pointer", fontFamily: S.font, padding: "4px 0 0", display: "block" }}>{a.actionLabel}</button>}</div><button onClick={() => dismissAlert(a.id)} style={{ background: "none", border: "none", color: S.muted, fontSize: 16, cursor: "pointer", opacity: 0.3, padding: "0 2px", flexShrink: 0, lineHeight: 1 }}>×</button></div>); })}
            </div>}
          </div>
          <button onClick={logout} title="Deconnexion" style={{ width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8, border: `1px solid ${S.border}`, background: S.bg, color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg></button>
          <button onClick={loadData} title="Actualiser" style={{ width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8, border: `1px solid ${S.border}`, background: S.bg, color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><RefreshCw size={12} /></button>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────── */}
      <main key={tab} className="tab-content" style={{ padding: "24px", maxWidth: 1200, margin: "0 auto", animation: "fadeUpStagger 0.35s cubic-bezier(0.4,0,0.2,1)" }}>
        {tab === "dashboard" && m && (
          <DashboardTab month={m} months={months} idx={idx} isMobile={isMobile} hints={hints} dismissHint={dismissHint} netBalance={netBal} totalExpenses={totalExp} validatedBudget={validatedBudget} validatedCount={validatedCnt} totalCount={totalItems} 
            onIncomeChange={(f, v) => patchIncome(m.month_key, f, v)}
            onValidate={(l, v) => patchExpense(m.month_key, l, { validated: v })} saving={saving} />
        )}
        {tab === "depenses" && m && (<>
          {!hints.depenses && <div className="hint-bubble" style={{ margin: "0 0 8px" }}><span>Cliquez sur un montant pour le modifier. Ajoutez des depenses avec +</span><button className="hint-close" onClick={() => dismissHint("depenses")}>x</button></div>}
          <DepensesTab month={m} months={months} monthKey={m.month_key}
            onValidate={(l, v) => patchExpense(m.month_key, l, { validated: v })}
            onAmountChange={(l, a) => patchExpense(m.month_key, l, { amount: a })}
            onIncomeChange={(f, v) => patchIncome(m.month_key, f, v)}
            onBudgetChange={(upd) => patchBudgetAlloc(m.month_key, upd)}
            onAddExpense={(label, amount, category) => addExpense(m.month_key, label, amount, category)}
            onDeleteExpense={(label) => deleteExpense(m.month_key, label)}
            saving={saving} isAdding={saving === "adding"} />
        </>)}
        {tab === "projection" && forecast && <>{!hints.projection && <div className="hint-bubble" style={{ margin: "0 24px 8px" }}><span>La projection montre vos 12 prochains mois. Les mois en rouge ont un solde negatif prevu.</span><button className="hint-close" onClick={() => dismissHint("projection")}>x</button></div>}<ProjectionTab forecast={forecast} goalMonthly={totalGoalMonthly} prevCumul={(() => { let c = 0; const curMk = months[idx]?.month_key || ""; for (const mo of months) { if (mo.month_key >= curMk) break; const inc = mo.income_salary + mo.income_other + ((mo as unknown as Record<string,number>).income_rente ?? 0) + ((mo as unknown as Record<string,number>).income_epargne ?? 0) + ((mo as unknown as Record<string,number>).income_actions ?? 0) + ((mo as unknown as Record<string,number>).income_virements ?? 0) + ((mo as unknown as Record<string,number>).income_solde_ajuste ?? 0); const exp = mo.expenses.filter(e => e.category !== "investment").reduce((s, e) => s + e.amount, 0) + Object.values(mo.budget_allocation as unknown as Record<string, number>).reduce((s, v) => s + v, 0); c += inc - exp; } return c; })()} /></>}
        {tab === "historique" && months.length > 0 && <>{!hints.historique && <div className="hint-bubble" style={{ margin: "0 24px 8px" }}><span>Visualisez votre historique mois par mois. Le graphe montre vos revenus, depenses et cumul.</span><button className="hint-close" onClick={() => dismissHint("historique")}>x</button></div>}<HistoriqueTab months={months} goalMonthly={totalGoalMonthly} /></>}
        {tab === "salaires" && <>{!hints.salaires && <div className="hint-bubble" style={{ margin: "0 24px 8px" }}><span>Suivez votre evolution salariale et simulez votre impot sur le revenu en bas de page.</span><button className="hint-close" onClick={() => dismissHint("salaires")}>x</button></div>}<SalairesTab showToast={showToast} /></>}
        {tab === "economies" && months.length > 0 && (<>
          {!hints.economies && <div className="hint-bubble" style={{ margin: "0 0 8px" }}><span>Gerez vos investissements et suivez votre portefeuille.</span><button className="hint-close" onClick={() => dismissHint("economies")}>x</button></div>}
          <EconomiesTab months={months} currentIdx={idx} isMobile={isMobile}
            onSavingsChange={(mk, u) => patchSavings(mk, u)}
            onPortfolioValuesChange={(mk, u) => patchPortfolioValues(mk, u)}
            onValidateExpense={(label, v) => patchExpense(months[idx].month_key, label, { validated: v })}
            onAddInvestment={(label, amount) => addExpense(months[idx].month_key, label, amount, "investment")} />
        </>)}
      </main>
      {/* Mobile bottom tab bar */}
      <nav className="mobile-tabbar">
        {TABS.map(t => { const Icon = t.icon; return (
          <button key={t.id} className={`mob-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            <Icon size={18} />
            <span>{t.label.length > 8 ? t.label.slice(0,7) + "." : t.label}</span>
          </button>
        ); })}
      </nav>
    </div></div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab({ month: m, months, idx, netBalance, totalExpenses, validatedBudget, validatedCount, totalCount, onIncomeChange, onValidate, saving, isMobile, hints, dismissHint }: {
  month: Month; months: Month[]; idx: number; netBalance: number; totalExpenses: number; validatedBudget: number; validatedCount: number; totalCount: number; isMobile: boolean; hints: Record<string, boolean>; dismissHint: (k: string) => void;
  onIncomeChange: (f: "income_salary" | "income_other", v: number) => void;
  onValidate: (label: string, v: boolean) => void; saving: string | null;
}) {
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const income = m.income_salary + m.income_other + ((m as unknown as Record<string,number>).income_rente ?? 0) + ((m as unknown as Record<string,number>).income_epargne ?? 0) + ((m as unknown as Record<string,number>).income_actions ?? 0) + ((m as unknown as Record<string,number>).income_virements ?? 0) + ((m as unknown as Record<string,number>).income_solde_ajuste ?? 0);
  const balColor = netBalance >= 0 ? S.success : S.danger;
  const fixed = m.expenses.filter(e => e.category === "fixed");
  const invest = m.expenses.filter(e => e.category === "investment");
  const variable = m.expenses.filter(e => e.category === "variable");
  const pending = m.expenses.filter(e => !e.validated);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="kpi-strip" style={{ display: "flex", gap: 0, background: S.surface, borderRadius: 14, border: `1px solid ${S.border}`, overflow: "hidden" }}>
        {[
          { label: "Revenus", value: income, color: S.success, icon: "€", sub: undefined, tip: "Tout l'argent qui entre : salaire, rente, placements…" },
          { label: "Dépenses", tip: "Ce que vous dépensez chaque mois (hors épargne)", value: totalExpenses, color: S.danger, icon: "↓", sub: validatedBudget > 0 ? `dont ${fmt(validatedBudget)} env.` : undefined },
          { label: "Il vous reste", value: netBalance, color: balColor, icon: "◎", tip: "Revenus − Dépenses − Épargne = ce qui reste en fin de mois", sub: undefined },
          { label: "Cumul depuis janv.", value: (() => { let c2 = 0; for (let i2 = 0; i2 <= idx; i2++) { const m2 = months[i2]; c2 += m2.income_salary + m2.income_other + ((m2 as unknown as Record<string,number>).income_rente ?? 0) + ((m2 as unknown as Record<string,number>).income_epargne ?? 0) + ((m2 as unknown as Record<string,number>).income_actions ?? 0) + ((m2 as unknown as Record<string,number>).income_virements ?? 0) + ((m2 as unknown as Record<string,number>).income_solde_ajuste ?? 0) - m2.expenses.filter((e2: Expense) => e2.category !== "investment").reduce((s2: number, e2: Expense) => s2 + e2.amount, 0) - Object.values(m2.budget_allocation as unknown as Record<string,number>).reduce((s2: number, v2: number) => s2 + v2, 0) - m2.expenses.filter((e2: Expense) => e2.category === "investment").reduce((s2: number, e2: Expense) => s2 + e2.amount, 0); } return Math.round(c2); })(), color: S.primary, icon: "↗", tip: "La somme de vos restes depuis le début de l'année", sub: "Depuis janvier" },
          { label: "Épargne", value: m.expenses.filter((e: Expense) => e.category === "investment").reduce((s: number, e: Expense) => s + e.amount, 0), color: S.accent, icon: "★", tip: "Vos investissements mensuels (PEA, assurance vie…)", sub: `Cumul: ${fmt(months.slice(0, idx + 1).reduce((s: number, mo: Month) => s + mo.expenses.filter((e: Expense) => e.category === "investment").reduce((s2: number, e2: Expense) => s2 + e2.amount, 0), 0))}` },
        ].map((k, i, arr) => (
          <div key={k.label} title={(k as {tip?:string}).tip || ""} style={{ flex: 1, padding: "14px 14px", borderRight: i < arr.length - 1 ? `1px solid ${S.border}` : "none", textAlign: "center" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 13, color: k.color }}>{k.icon}</div>
            <div style={{ fontSize: 10, color: S.muted, textTransform: "uppercase" as const, fontWeight: 600, letterSpacing: 0.5, position: "relative", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>{k.label}{(k as {tip?:string}).tip && <span className="kpi-tip" style={{ cursor: "help", opacity: 0.4 }} data-tip={(k as {tip?:string}).tip}>ⓘ</span>}</div>
            <div style={{ fontFamily: S.heading, fontSize: 20, fontWeight: 800, color: k.color, margin: "2px 0" }}>{fmt(k.value)}</div>
            {k.sub && <div style={{ fontSize: 10, color: S.muted }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {!hints.welcome && <div className="hint-bubble"><span>Bienvenue ! Voici votre tableau de bord. Les icones info vous donnent des explications.</span><button className="hint-close" onClick={() => dismissHint("welcome")}>x</button></div>}

      <AiAnalysis month={m} months={months} idx={idx} />


      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, color: S.muted, letterSpacing: 1, marginBottom: 12 }}>Répartition des dépenses</div>
        {[{n:"Fixes",v:fixed.reduce((s:number,e:Expense)=>s+e.amount,0),c:S.primary},{n:"Variables",v:variable.reduce((s:number,e:Expense)=>s+e.amount,0),c:S.warning},{n:"Enveloppes",v:Object.values(m.budget_allocation as unknown as Record<string,number>).reduce((s:number,v:number)=>s+v,0),c:S.muted},{n:"Épargne",v:(m.savings?.target_monthly ?? 0) + m.expenses.filter((e:Expense)=>e.category==="investment").reduce((s:number,e:Expense)=>s+e.amount,0),c:S.accent}].map(cat => {
          const total2 = fixed.reduce((s:number,e:Expense)=>s+e.amount,0) + variable.reduce((s:number,e:Expense)=>s+e.amount,0) + Object.values(m.budget_allocation as unknown as Record<string,number>).reduce((s:number,v:number)=>s+v,0);
          const pct = total2 > 0 ? Math.round((cat.v / total2) * 100) : 0;
          return (<div key={cat.n} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ width: 90, fontSize: 12, fontWeight: 600, color: S.muted }}>{cat.n}</span>
            <div style={{ flex: 1, height: 20, background: `${S.border}40`, borderRadius: 6, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: cat.c, borderRadius: 6, display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 10, fontWeight: 700, color: "#fff", transition: "width 0.3s" }}>{pct > 10 ? `${pct}%` : ""}</div></div>
            {!isMobile && <span style={{ width: 80, textAlign: "right" as const, fontSize: 13, fontWeight: 700, color: cat.c }}>{fmt(cat.v)}</span>}
          </div>);
        })}
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                {showSwipeTutorial && (
        <div onClick={() => setShowSwipeTutorial(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, cursor: "pointer" }}>
          <div style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 40, marginBottom: 16 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 28 }}>←</div><div style={{ fontSize: 14, fontWeight: 600, color: "#f87171" }}>Rejeter</div></div>
              <div style={{ width: 120, height: 70, background: "rgba(255,255,255,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed rgba(255,255,255,0.3)", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Dépense</div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 28 }}>→</div><div style={{ fontSize: 14, fontWeight: 600, color: "#4ade80" }}>Valider</div></div>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Swipez pour valider vos dépenses</p>
            <p style={{ fontSize: 12, opacity: 0.6 }}>Glissez à droite pour valider, à gauche pour rejeter</p>
            <button onClick={(e) => { e.stopPropagation(); setShowSwipeTutorial(false); }} style={{ marginTop: 16, padding: "10px 28px", background: "#4ade80", color: "#000", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>J’ai compris !</button>
          </div>
        </div>
      )}
      <SLabel>Progression validation</SLabel>
          <span style={{ color: validatedCount === totalCount ? S.success : S.muted, fontSize: 13, fontWeight: 700 }}>{validatedCount === totalCount ? "Tout valide !" : `${validatedCount} / ${totalCount}`}</span>
        </div>
        <div style={{ background: S.surface2, borderRadius: 999, height: 10, overflow: "hidden" }}>
          <div style={{ background: `linear-gradient(90deg, ${S.success}, ${S.accent})`, height: "100%", width: `${totalCount > 0 ? (validatedCount / totalCount) * 100 : 0}%`, borderRadius: 999, transition: "width 0.6s ease" }} />
        </div>
      </Card>

      {!hints.swipe && <div className="hint-bubble" style={{ marginBottom: 4 }}><span>Swipez pour valider vos depenses !</span><button className="hint-close" onClick={() => dismissHint("swipe")}>x</button></div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ fontFamily: S.heading, fontSize: 14, fontWeight: 700 }}>Valider ses dépenses</span><button onClick={() => setShowSwipeTutorial(true)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${S.border}`, background: "transparent", color: S.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>?</button></div>
      <SwipeValidator expenses={m.expenses} onValidate={onValidate} saving={saving} />
    </div>
  );
}




function AiAnalysis({ month, months, idx }: { month: Month; months: Month[]; idx: number }) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function analyze() {
    setLoading(true);
    const income = month.income_salary + month.income_other + ((month as unknown as Record<string,number>).income_rente ?? 0) + ((month as unknown as Record<string,number>).income_epargne ?? 0) + ((month as unknown as Record<string,number>).income_actions ?? 0) + ((month as unknown as Record<string,number>).income_virements ?? 0) + ((month as unknown as Record<string,number>).income_solde_ajuste ?? 0);
    const expenses = month.expenses.filter(e => e.category !== "investment").reduce((s, e) => s + e.amount, 0);
    const fixed = month.expenses.filter(e => e.category === "fixed").reduce((s, e) => s + e.amount, 0);
    const variable = month.expenses.filter(e => e.category === "variable").reduce((s, e) => s + e.amount, 0);
    const invest = month.expenses.filter(e => e.category === "investment").reduce((s, e) => s + e.amount, 0);
    const savings = month.savings?.target_monthly ?? 140;
    const balance = income - expenses - savings;
    let cumulBal = 0;
    for (let i = 0; i <= idx; i++) { const mi2 = months[i]; cumulBal += mi2.income_salary + mi2.income_other + ((mi2 as unknown as Record<string,number>).income_rente ?? 0) + ((mi2 as unknown as Record<string,number>).income_epargne ?? 0) + ((mi2 as unknown as Record<string,number>).income_actions ?? 0) + ((mi2 as unknown as Record<string,number>).income_virements ?? 0) + ((mi2 as unknown as Record<string,number>).income_solde_ajuste ?? 0) - mi2.expenses.filter(e => e.category !== "investment").reduce((s, e) => s + e.amount, 0) ; }
    const prompt = `Budget ${month.month_name} 2026: Revenu: ${income}EUR, Depenses fixes: ${fixed}EUR (${income > 0 ? Math.round(fixed/income*100) : 0}%), Variables: ${variable}EUR, Investissements: ${invest}EUR, Epargne: ${savings}EUR, Solde net: ${balance}EUR, Cumul depuis jan: ${Math.round(cumulBal)}EUR, Taux effort: ${income > 0 ? Math.round(expenses/income*100) : 0}%, Validation: ${month.expenses.filter(e => e.validated).length}/${month.expenses.length}`;
    try { const r = await fetch("/api/analyze", { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ prompt }) }); const d = await r.json(); setAnalysis(d.analysis); } catch { setAnalysis("Analyse indisponible."); }
    setLoading(false);
  }
  return (
    <Card style={{ borderColor: `${S.primary}20`, background: `linear-gradient(135deg, ${S.primary}04, ${S.bg})` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: analysis ? 14 : 0, gap: 12, flexWrap: "wrap" as const }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={S.primary} strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          <SLabel>Analyse IA du budget</SLabel>
        </div>
        <button onClick={analyze} disabled={loading} style={{ background: loading ? S.surface2 : S.primary, color: "#fff", border: "none", borderRadius: 10, padding: "7px 16px", fontSize: 13, fontFamily: S.font, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.7 : 1 }}>
          {loading && <div style={{ width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
          {loading ? "Analyse..." : analysis ? "Relancer" : "Analyser mon budget"}
        </button>
      </div>
      {analysis && <div style={{ fontSize: 14, lineHeight: 1.8, color: S.text, whiteSpace: "pre-line", background: S.surface2, borderRadius: 12, padding: "16px 18px" }}>{analysis}</div>}
    </Card>
  );
}

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const [go, setGo] = useState(false);
  const parts = useRef(Array.from({ length: 28 }, () => ({
    x: (Math.random() - 0.5) * 400, y: Math.random() * -350 - 30, r: Math.random() * 720 - 360,
    sz: 5 + Math.random() * 8, d: Math.random() * 200, round: Math.random() > 0.4,
    color: ["#22c55e","#f59e0b","#2563EB","#F97316","#ec4899","#8b5cf6","#14b8a6"][Math.floor(Math.random() * 7)],
  })));
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setGo(true))); const t = setTimeout(onDone, 1200); return () => clearTimeout(t); }, [onDone]);
  return (<div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 60 }}>
    {parts.current.map((p, i) => (<div key={i} style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -p.sz/2, marginTop: -p.sz/2, width: p.sz, height: p.sz, background: p.color, borderRadius: p.round ? "50%" : "2px", transform: go ? `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg) scale(0)` : "translate(0,0) rotate(0deg) scale(1)", transition: `all ${0.7 + Math.random()*0.4}s cubic-bezier(0.25,0.46,0.45,0.94) ${p.d}ms`, opacity: go ? 0 : 1 }} />))}
  </div>);
}

function SwipeValidator({ expenses, onValidate, onAmountChange, saving }: { expenses: Expense[]; onValidate: (label: string, v: boolean) => void; onAmountChange?: (label: string, amount: number) => void; saving: string | null }) {
  const pending = expenses.filter(e => !e.validated);
  const [ci, setCi] = useState(0);
  const [ox, setOx] = useState(0);
  const [drag, setDrag] = useState(false);
  const sx = useRef(0);
  const [fly, setFly] = useState<"right"|"left"|null>(null);
  const [confetti, setConfetti] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [fs, setFs] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const list = reviewMode ? pending.filter(e => skipped.includes(e.label)) : pending;
  const cur = list[ci];

  function hs(x: number) { setDrag(true); sx.current = x; setOx(0); }
  function hm(x: number) { if (drag) setOx(x - sx.current); }
  function he() {
    if (!drag) return; setDrag(false);
    if (ox > 80 && cur) {
      setFly("right"); setConfetti(true); onValidate(cur.label, true);
      setTimeout(() => { setCi(i => i+1); setOx(0); setFly(null); }, 450);
    } else if (ox < -80 && cur) {
      setFly("left");
      if (!reviewMode) setSkipped(s => [...s, cur.label]);
      setTimeout(() => { setCi(i => i+1); setOx(0); setFly(null); }, 450);
    } else setOx(0);
  }

  if (!pending.length) return <Card style={{ textAlign: "center", padding: "40px 20px" }}><Check size={36} color={S.success} style={{ margin: "0 auto 12px" }} /><p style={{ fontFamily: S.heading, fontSize: 24, fontWeight: 700, color: S.success, margin: 0 }}>Tout est valide !</p></Card>;

  const done = ci >= list.length;
  if (done) return (
    <Card style={{ textAlign: "center", padding: "32px 20px" }}>
      <Check size={36} color={S.success} style={{ margin: "0 auto 12px" }} />
      <p style={{ fontFamily: S.heading, fontSize: 22, fontWeight: 700, color: S.success, margin: 0 }}>Session terminee !</p>
      {skipped.length > 0 && !reviewMode && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: S.warning, fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>{skipped.length} depense{skipped.length > 1 ? "s" : ""} a revoir</p>
          <button onClick={() => { setReviewMode(true); setCi(0); }} style={{ background: S.warning, color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontFamily: S.font, fontWeight: 700 }}>Revoir maintenant</button>
        </div>
      )}
      {(skipped.length === 0 || reviewMode) && (
        <button onClick={() => { setCi(0); setSkipped([]); setReviewMode(false); }} style={{ marginTop: 12, background: S.primary, color: "#fff", border: "none", borderRadius: 10, padding: "8px 20px", fontSize: 14, fontFamily: S.font, fontWeight: 600 }}>Recommencer</button>
      )}
    </Card>
  );

  const Ico = (cur.icon && ICONS[cur.icon]) ? ICONS[cur.icon] : CreditCard;
  const isR = ox > 50; const isL = ox < -50;
  // Smooth spring animation values
  const flyX = fly === "right" ? 900 : fly === "left" ? -900 : ox;
  const flyRot = fly === "right" ? 30 : fly === "left" ? -30 : ox * 0.05;
  const flyScale = fly ? 0.7 : (drag ? 1.02 : 1);
  const flyOpacity = fly ? 0 : 1;

  const cardEl = (
    <div
      onMouseDown={e => hs(e.clientX)}
      onMouseMove={e => hm(e.clientX)}
      onMouseUp={he}
      onMouseLeave={() => drag && he()}
      onTouchStart={e => hs(e.touches[0].clientX)}
      onTouchMove={e => { e.preventDefault(); hm(e.touches[0].clientX); }}
      onTouchEnd={he}
      style={{
        width: fs ? "min(85vw, 360px)" : 280,
        userSelect: "none",
        transform: `translateX(${flyX}px) rotate(${flyRot}deg) scale(${flyScale})`,
        transition: drag ? "none" : "all 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        opacity: flyOpacity,
        cursor: drag ? "grabbing" : "grab",
        background: isR ? `${S.success}08` : isL ? `${S.danger}06` : S.surface,
        border: `2px solid ${isR ? S.success : isL ? S.danger : S.border}`,
        borderRadius: fs ? 24 : 20,
        padding: fs ? "40px 28px" : "24px 20px",
        textAlign: "center",
        boxShadow: drag ? "0 20px 60px rgba(0,0,0,0.15)" : "0 4px 20px rgba(0,0,0,0.06)",
        touchAction: "none",
      }}
    >
      <div style={{ width: fs ? 64 : 48, height: fs ? 64 : 48, borderRadius: 18, background: `${S.accent}10`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Ico size={fs ? 32 : 24} color={S.accent} />
      </div>
      <p style={{ fontFamily: S.heading, fontSize: fs ? 26 : 20, fontWeight: 700, color: S.text, margin: "0 0 8px" }}>{cur.label}</p>
      {onAmountChange ? (
        <div style={{ margin: "0 0 10px" }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          <EditableAmt value={cur.amount} onChange={v => onAmountChange(cur.label, v)} color={S.accent} size="lg" />
        </div>
      ) : (
        <p style={{ fontFamily: S.heading, fontSize: fs ? 36 : 30, fontWeight: 800, color: S.accent, margin: "0 0 10px" }}>{fmt(cur.amount)}</p>
      )}
      <span style={{ background: `${S.primary}08`, color: S.primary, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8 }}>{cur.category === "fixed" ? "Fixe" : cur.category === "investment" ? "Investissement" : "Variable"}</span>
      <p style={{ color: S.muted, fontSize: fs ? 14 : 12, marginTop: fs ? 24 : 16, letterSpacing: "0.03em" }}>← Revoir · Glisser · Valider →</p>
    </div>
  );

  // Fullscreen: just the card on a blurred backdrop
  if (fs) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(248,250,252,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      {/* Close button */}
      <button onClick={() => setFs(false)} style={{ position: "absolute", top: 20, right: 20, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: S.muted, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <X size={18} />
      </button>
      {/* Small counter */}
      <p style={{ position: "absolute", top: 24, left: 24, color: S.muted, fontSize: 13, fontWeight: 600, fontFamily: S.font }}>{reviewMode ? "Revision" : "Validation"} · {Math.min(ci+1, list.length)}/{list.length}</p>

      {/* Left/Right big indicators */}
      <div style={{ position: "absolute", left: "8vw", top: "50%", transform: "translateY(-50%)", color: S.danger, opacity: isL ? 0.7 : 0.08, transition: drag ? "none" : "opacity 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <X size={44} strokeWidth={2.5} />
        <span style={{ fontSize: 16, fontWeight: 700 }}>Revoir</span>
      </div>
      <div style={{ position: "absolute", right: "8vw", top: "50%", transform: "translateY(-50%)", color: S.success, opacity: isR ? 0.7 : 0.08, transition: drag ? "none" : "opacity 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Check size={44} strokeWidth={2.5} />
        <span style={{ fontSize: 16, fontWeight: 700 }}>Valider</span>
      </div>

      {confetti && <ConfettiBurst onDone={() => setConfetti(false)} />}
      {cardEl}
    </div>
  );

  // Normal (embedded) mode
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SLabel>{reviewMode ? "Revoir les dépenses" : "Valider les dépenses"} ({list.length - ci} restantes)</SLabel>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: S.muted, fontSize: 12, fontWeight: 600 }}>{Math.min(ci+1, list.length)}/{list.length}</span>
          <button onClick={() => setFs(true)} title="Plein ecran" style={{ background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: S.muted }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 20px 20px", position: "relative", minHeight: 180, touchAction: "none" }}>
        <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: S.danger, opacity: isL ? 0.7 : 0.08, transition: drag ? "none" : "opacity 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><X size={28} /><span style={{ fontSize: 11, fontWeight: 700 }}>Revoir</span></div>
        <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: S.success, opacity: isR ? 0.7 : 0.08, transition: drag ? "none" : "opacity 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><Check size={28} /><span style={{ fontSize: 11, fontWeight: 700 }}>Valider</span></div>
        {confetti && <ConfettiBurst onDone={() => setConfetti(false)} />}
        {cardEl}
      </div>
    </Card>
  );
}


// ── Depenses ──────────────────────────────────────────────────────────────────
function DepensesTab({ month: m, months, monthKey, onValidate, onAmountChange, onIncomeChange, onBudgetChange, onAddExpense, onDeleteExpense, saving, isAdding }: {
  month: Month; months: Month[]; monthKey: string;
  onValidate: (l: string, v: boolean) => void;
  onAmountChange: (l: string, a: number) => void;
  onIncomeChange: (f: "income_salary" | "income_other", v: number) => void;
  onBudgetChange: (upd: { amounts?: Record<string, number>; validated?: Record<string, boolean>; rename?: { old: string; new: string }; delete_key?: string; add_key?: string; add_amount?: number }) => void;
  onAddExpense: (label: string, amount: number, category: string) => void;
  onDeleteExpense: (label: string) => void;
  saving: string | null; isAdding: boolean;
}) {
  const [addingTo, setAddingTo] = useState<"fixed" | "variable" | "investment" | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recurrenceStep, setRecurrenceStep] = useState<"form" | "recurrence" | "picker" | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [pendingAdd, setPendingAdd] = useState<{ label: string; amount: number; category: string } | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  // All existing expense labels for suggestions
  const allLabels = [...new Set(months.flatMap(mo => mo.expenses.map(e => e.label)))].sort();
  const filteredLabels = newLabel.trim() ? allLabels.filter(l => l.toLowerCase().includes(newLabel.toLowerCase())) : allLabels;
  const isNewLabel = newLabel.trim() && !allLabels.some(l => l.toLowerCase() === newLabel.trim().toLowerCase());

  const MONTH_KEYS = ["2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07","2026-08","2026-09","2026-10","2026-11","2026-12"];
  const MONTH_SHORT = ["Jan","Fev","Mar","Avr","Mai","Jun","Jul","Aou","Sep","Oct","Nov","Dec"];

  function openAdd(cat: "fixed" | "variable" | "investment") { setAddingTo(cat); setNewLabel(""); setNewAmount(""); setRecurrenceStep("form"); setShowSuggestions(false); setTimeout(() => labelRef.current?.focus(), 50); }
  function cancelAdd() { setAddingTo(null); setNewLabel(""); setNewAmount(""); setRecurrenceStep(null); setPendingAdd(null); }

  function submitAdd() {
    const a = parseFloat(newAmount);
    if (!newLabel.trim() || isNaN(a) || a < 0) return;
    setPendingAdd({ label: newLabel.trim(), amount: a, category: addingTo! });
    setRecurrenceStep("recurrence");
  }

  function confirmRecurrence(type: "single" | "all" | "custom") {
    if (!pendingAdd) return;
    if (type === "single") {
      fetch(`/api/budget/month/${monthKey}/expense`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ label: pendingAdd.label, amount: pendingAdd.amount, category: pendingAdd.category, propagate: false }),
      }).then(() => window.location.reload());
    } else if (type === "all") {
      onAddExpense(pendingAdd.label, pendingAdd.amount, pendingAdd.category);
    } else if (type === "custom") {
      // Call for each selected month individually via non-propagating add
      selectedMonths.forEach(mk => {
        fetch(`/api/budget/month/${mk}/expense`, {
          method: "POST", headers: getAuthHeaders(),
          body: JSON.stringify({ label: pendingAdd!.label, amount: pendingAdd!.amount, category: pendingAdd!.category, propagate: false }),
        });
      });
      setTimeout(() => window.location.reload(), 300);
    }
    cancelAdd();
  }

  function selectLabel(label: string) {
    setNewLabel(label);
    setShowSuggestions(false);
    // Pre-fill amount if this expense exists
    const existing = m.expenses.find(e => e.label === label);
    if (existing) setNewAmount(existing.amount.toString());
  }

  const fixed = m.expenses.filter(e => e.category === "fixed");
  const invest = m.expenses.filter(e => e.category === "investment");
  const variable = m.expenses.filter(e => e.category === "variable");
  const budgetValidated = m.budget_validated || {};
  const validatedBudgetTotal = Object.entries(budgetValidated).filter(([, v]) => v).reduce((sum, [k]) => sum + ((m.budget_allocation as unknown as Record<string, number>)[k] || 0), 0);

  const [calcPopup, setCalcPopup] = useState<{ value: number; lines: string[]; onChange: (v: number) => void } | null>(null);
  function ExpRow({ e, color }: { e: Expense; color: string }) {
    const Ico = (e.icon && ICONS[e.icon]) ? ICONS[e.icon] : CreditCard;
    const isSav = saving === e.label;
    return (
      <div className="row-h" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: e.validated ? `${color}12` : S.surface2, borderRadius: 10, border: `1px solid ${e.validated ? color + "40" : S.border}`, transition: "all 0.2s" }}>
        <Ico size={14} color={e.validated ? color : S.muted} />
        <span style={{ flex: 1, fontSize: 13, color: e.validated ? S.text : S.muted, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{e.label}</span>
        <EditableAmt value={e.amount} onChange={v => onAmountChange(e.label, v)} color={color} size="sm" /><button onClick={(ev) => { ev.stopPropagation(); setCalcPopup({ value: e.amount, lines: [String(e.amount)], onChange: v => onAmountChange(e.label, v) }); }} title="Calculette" style={{ width: 22, height: 22, borderRadius: 5, border: `1px solid ${S.border}`, background: "transparent", color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 10, flexShrink: 0, opacity: 0.5 }}>+/-</button>
        <button className="val-btn" onClick={() => onValidate(e.label, !e.validated)} disabled={isSav} style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${e.validated ? color : S.muted}`, background: e.validated ? color : "transparent", color: e.validated ? "#fff" : S.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: isSav ? 0.5 : 1 }} title={e.validated ? "Devalider" : "Valider"}>
          {isSav ? <div style={{ width: 10, height: 10, border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <Check size={12} />}
        </button>
        <button className="del-btn" onClick={() => onDeleteExpense(e.label)} title="Supprimer" style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: `${S.danger}20`, color: S.danger, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Trash2 size={11} />
        </button>
      </div>
    );
  }

  function addRowForm({ category, color }: { category: "fixed" | "variable" | "investment"; color: string }) {
    if (addingTo !== category) return null;

    if (recurrenceStep === "recurrence" && pendingAdd) return (
      <div style={{ padding: "14px 16px", background: `${color}06`, borderRadius: 12, border: `1px solid ${color}40` }}>
        <p style={{ fontFamily: S.heading, fontSize: 16, fontWeight: 700, color: S.text, margin: "0 0 4px" }}>{pendingAdd.label} — {fmt(pendingAdd.amount)}</p>
        <p style={{ color: S.muted, fontSize: 13, margin: "0 0 12px" }}>Cette depense est-elle recurrente ?</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          <button onClick={() => confirmRecurrence("single")} style={{ background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontFamily: S.font, fontWeight: 600, color: S.text }}>Juste ce mois</button>
          <button onClick={() => confirmRecurrence("all")} style={{ background: color, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontFamily: S.font, fontWeight: 600, color: "#fff" }}>Tous les mois suivants</button>
          <button onClick={() => { setRecurrenceStep("picker"); setSelectedMonths(new Set([monthKey])); }} style={{ background: S.surface2, border: `1px solid ${color}40`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontFamily: S.font, fontWeight: 600, color: color }}>Choisir les mois</button>
          <button onClick={cancelAdd} style={{ background: "transparent", color: S.muted, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontFamily: S.font }}><X size={12} /></button>
        </div>
      </div>
    );

    if (recurrenceStep === "picker" && pendingAdd) return (
      <div style={{ padding: "14px 16px", background: `${color}06`, borderRadius: 12, border: `1px solid ${color}40` }}>
        <p style={{ fontFamily: S.heading, fontSize: 16, fontWeight: 700, color: S.text, margin: "0 0 4px" }}>{pendingAdd.label} — {fmt(pendingAdd.amount)}</p>
        <p style={{ color: S.muted, fontSize: 13, margin: "0 0 10px" }}>Cochez les mois souhaites :</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 12 }}>
          {MONTH_KEYS.map((mk, i) => {
            const sel = selectedMonths.has(mk);
            return <button key={mk} onClick={() => { const s = new Set(selectedMonths); if (sel) s.delete(mk); else s.add(mk); setSelectedMonths(s); }} style={{ padding: "6px 4px", fontSize: 12, fontWeight: sel ? 700 : 500, borderRadius: 8, border: `1.5px solid ${sel ? color : S.border}`, background: sel ? `${color}15` : S.surface2, color: sel ? color : S.muted, fontFamily: S.font }}>{MONTH_SHORT[i]}</button>;
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => confirmRecurrence("custom")} disabled={selectedMonths.size === 0} style={{ background: color, border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontFamily: S.font, fontWeight: 700, color: "#fff", opacity: selectedMonths.size === 0 ? 0.5 : 1 }}>Confirmer ({selectedMonths.size} mois)</button>
          <button onClick={() => setRecurrenceStep("recurrence")} style={{ background: "transparent", color: S.muted, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: S.font }}>Retour</button>
        </div>
      </div>
    );

    // Main form with search
    return (
      <div style={{ background: `${color}06`, borderRadius: 10, border: `1px dashed ${color}50`, padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            ref={labelRef}
            value={newLabel}
            onChange={e => { setNewLabel(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
            placeholder="Rechercher ou creer une depense..."
            autoComplete="off"
            onKeyDown={e => { if (e.key === "Enter") submitAdd(); if (e.key === "Escape") cancelAdd(); }}
            style={{ flex: 1, minWidth: 140, background: S.surface2, border: `1px solid ${showSuggestions ? color : S.border}`, borderRadius: 8, padding: "8px 12px", color: S.text, fontSize: 14, fontFamily: S.font, outline: "none", transition: "border-color 0.15s" }}
          />
          <input
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            placeholder="Montant"
            type="number"
            min="0"
            step="0.01"
            autoComplete="off"
            onKeyDown={e => { if (e.key === "Enter") submitAdd(); if (e.key === "Escape") cancelAdd(); }}
            style={{ width: 90, background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 12px", color: S.text, fontSize: 14, fontFamily: S.font, outline: "none" }}
          />
          <button onClick={submitAdd} disabled={isAdding} style={{ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, fontFamily: S.font, display: "flex", alignItems: "center", gap: 4, opacity: isAdding ? 0.6 : 1, flexShrink: 0 }}>
            {isAdding ? <div style={{ width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <Check size={14} />}
            OK
          </button>
          <button onClick={cancelAdd} style={{ background: "transparent", color: S.muted, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: S.font, flexShrink: 0 }}><X size={14} /></button>
        </div>

        {/* Search dropdown */}
        {showSuggestions && (filteredLabels.length > 0 || isNewLabel) && (
          <div style={{ marginTop: 8, background: S.surface, border: `1px solid ${color}25`, borderRadius: 10, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
            {newLabel.trim() && <div style={{ padding: "6px 12px", fontSize: 11, color: S.muted, fontWeight: 600, borderBottom: `1px solid ${S.border}` }}>{filteredLabels.length} resultat{filteredLabels.length !== 1 ? "s" : ""}</div>}
            {filteredLabels.slice(0, 10).map(l => {
              const idx3 = newLabel.trim() ? l.toLowerCase().indexOf(newLabel.toLowerCase()) : -1;
              return (
                <div key={l} onMouseDown={e => { e.preventDefault(); selectLabel(l); }} style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, color: S.text, borderBottom: `1px solid ${S.border}` }}>
                  {idx3 >= 0 ? <>{l.slice(0, idx3)}<strong style={{ color: color }}>{l.slice(idx3, idx3 + newLabel.length)}</strong>{l.slice(idx3 + newLabel.length)}</> : l}
                </div>
              );
            })}
            {isNewLabel && (
              <div onMouseDown={e => { e.preventDefault(); setShowSuggestions(false); }} style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, color: color, fontWeight: 700, background: `${color}04`, borderTop: filteredLabels.length > 0 ? `1px solid ${S.border}` : "none" }}>
                + Creer &quot;{newLabel.trim()}&quot;
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function ColCard({ title, items, color, catKey }: { title: string; items: Expense[]; color: string; catKey: "fixed" | "variable" | "investment" }) {
    const total = items.reduce((s, e) => s + e.amount, 0);
    return (
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SLabel>{title}</SLabel>
          <button onClick={() => addingTo === catKey ? cancelAdd() : openAdd(catKey)} style={{ background: addingTo === catKey ? `${color}30` : `${color}20`, color, border: `1px solid ${color}40`, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }} title="Ajouter une depense">
            {addingTo === catKey ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(e => <ExpRow key={e.label} e={e} color={color} />)}
          {addRowForm({ category: catKey, color })}
        </div>
        <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: S.muted, fontSize: 12 }}>Total ({items.length} lignes)</span>
          <span style={{ fontFamily: S.heading, fontSize: 20, color, fontWeight: 700 }}>{fmt(total)}</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      {calcPopup && (<div onClick={() => setCalcPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}><div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: 340, padding: 24, boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}><div style={{ fontFamily: S.heading, fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Calculette</div>{calcPopup.lines.map((line, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>{i > 0 && <span style={{ color: S.accent, fontWeight: 700, fontSize: 18 }}>+</span>}<input type="number" value={line} onChange={e => { const nl = [...calcPopup.lines]; nl[i] = e.target.value; setCalcPopup({ ...calcPopup, lines: nl }); }} style={{ flex: 1, padding: "10px 14px", fontSize: 16, border: "1px solid #e0e0e0", borderRadius: 10, background: "#fafafa", outline: "none", fontWeight: 600, textAlign: "right" }} autoFocus={i === calcPopup.lines.length - 1} />{calcPopup.lines.length > 1 && <button onClick={() => setCalcPopup({ ...calcPopup, lines: calcPopup.lines.filter((_, j) => j !== i) })} style={{ border: "none", background: "none", color: "#ef4444", fontSize: 18, cursor: "pointer" }}>x</button>}</div>))}<button onClick={() => setCalcPopup({ ...calcPopup, lines: [...calcPopup.lines, ""] })} style={{ width: "100%", padding: 8, fontSize: 12, border: "1px dashed #ccc", borderRadius: 8, background: "transparent", color: "#888", cursor: "pointer", marginBottom: 14 }}>+ Ajouter une ligne</button><div style={{ borderTop: "2px solid #eee", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontFamily: S.heading, fontSize: 22, fontWeight: 800, color: S.accent }}>{calcPopup.lines.reduce((s, l) => s + (parseFloat(l) || 0), 0).toFixed(0)} EUR</span><button onClick={() => { calcPopup.onChange(calcPopup.lines.reduce((s, l) => s + (parseFloat(l) || 0), 0)); setCalcPopup(null); }} style={{ padding: "10px 24px", fontSize: 14, fontWeight: 700, background: S.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" }}>Valider</button></div></div></div>)}
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ borderColor: `${S.success}25` }}>
        {(() => {
          const RC = {sal: "#16a34a", rente: "#3b82f6", epargne: "#8b5cf6", actions: "#f59e0b", virements: "#06b6d4", autres: "#94a3b8", ajuste: "#ec4899"};
          const sal = m.income_salary;
          const rente = (m as unknown as Record<string,number>).income_rente ?? 0;
          const ep = (m as unknown as Record<string,number>).income_epargne ?? 0;
          const act = (m as unknown as Record<string,number>).income_actions ?? 0;
          const vir = (m as unknown as Record<string,number>).income_virements ?? 0;
          const aut = m.income_other;
          const adj = (m as unknown as Record<string,number>).income_solde_ajuste ?? 0;
          const total = sal + rente + ep + act + vir + aut + adj;
          const items = [{k:"income_salary",l:"Salaire principal",v:sal,c:RC.sal},{k:"income_rente",l:"Rente",v:rente,c:RC.rente},{k:"income_epargne",l:"Épargne",v:ep,c:RC.epargne},{k:"income_actions",l:"Actions",v:act,c:RC.actions},{k:"income_virements",l:"Virements",v:vir,c:RC.virements},{k:"income_other",l:"Autres revenus",v:aut,c:RC.autres},{k:"income_solde_ajuste",l:"Solde ajusté",v:adj,c:RC.ajuste}];
          return (<>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, color: S.muted }}>Revenus du mois</div>
              <div style={{ fontFamily: S.heading, fontSize: 26, fontWeight: 800, color: S.success, lineHeight: 1 }}>{fmt(total)} <span style={{ fontSize: 12, color: S.muted, fontWeight: 600 }}>/ mois</span></div>
            </div>
            <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 14, gap: 2 }}>
              {items.filter(i => i.v > 0).map(i => (<div key={i.k} style={{ width: `${(i.v / total) * 100}%`, background: i.c, borderRadius: 4 }} title={`${i.l}: ${fmt(i.v)}`} />))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {items.map(i => (<div key={i.k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "#fafbfc" }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: i.c, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: S.muted, fontWeight: 500 }}>{i.l}</span>
                <EditableAmt value={i.v} onChange={v => onIncomeChange(i.k as "income_salary", v)} color={i.c} size="sm" />
              </div>))}
            </div>
          </>);
        })()}
      </Card>

      <div className="expenses-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {ColCard({ title: "Dépenses fixes", items: fixed, color: S.primary, catKey: "fixed" })}
        {ColCard({ title: "Dépenses variables", items: variable, color: S.warning, catKey: "variable" })}
      </div>



      <Card style={{ borderColor: `${S.primary}25` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SLabel>Budgets enveloppes — valider = compte dans les depenses</SLabel>
          {validatedBudgetTotal > 0 && <span style={{ fontFamily: S.heading, fontSize: 16, color: S.primary, fontWeight: 700 }}>+{fmt(validatedBudgetTotal)} integres</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
          {Object.entries(m.budget_allocation).map(([key, amount]) => {
            const isValid = budgetValidated[key] || false;
            return (
              <div key={key} className="row-h" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: isValid ? `${S.primary}12` : S.surface2, borderRadius: 10, border: `1px solid ${isValid ? S.primary + "40" : S.border}`, transition: "all 0.2s" }}>
                <Wallet size={14} color={isValid ? S.primary : S.muted} />
                <input defaultValue={BUDGET_LABELS[key] || key} onBlur={e => { if (e.target.value !== key) onBudgetChange({ rename: { old: key, new: e.target.value } }); }} style={{ flex: 1, fontSize: 13, color: isValid ? S.text : S.muted, fontWeight: 600, background: "transparent", border: "none", outline: "none", padding: 0, fontFamily: "inherit" }} />
                <EditableAmt value={amount as number} onChange={v => onBudgetChange({ amounts: { [key]: v } })} color={S.primary} size="sm" />
                <button className="val-btn" onClick={() => onBudgetChange({ validated: { [key]: !isValid } })} style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${isValid ? S.primary : S.muted}`, background: isValid ? S.primary : "transparent", color: isValid ? "#fff" : S.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title={isValid ? "Devalider" : "Valider"}>
                  <Check size={12} />
                </button>
                <button onClick={() => onBudgetChange({ delete_key: key })} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.5 }} title="Supprimer"><Trash2 size={11} /></button>
              </div>
            );
          })}
        </div>
        <button onClick={() => { const name = prompt("Nom de la nouvelle enveloppe :"); if (name) onBudgetChange({ add_key: name, add_amount: 0 }); }} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, border: `1px dashed ${S.border}`, borderRadius: 8, background: "transparent", color: S.muted, cursor: "pointer", width: "100%", justifyContent: "center" }}><Plus size={12} /> Ajouter une enveloppe</button>
      </Card>
    </div>
  </>);
}

// ── Projection ────��──────────────────────────���─────────────────────────────────
const ChartTip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1c1c1c", border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px 14px", fontFamily: S.font }}>
      <p style={{ fontFamily: S.heading, fontSize: 18, color: S.accent, margin: "0 0 8px", fontWeight: 700 }}>{label}</p>
      {payload.filter(p => p.value != null).map(p => <p key={p.name} style={{ color: p.color, fontSize: 13, margin: "2px 0" }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};


function ProjectionTab({ forecast: f, prevCumul = 0, goalMonthly = 0 }: { forecast: Forecast; prevCumul?: number; goalMonthly?: number }) {
  const [expandedChart, setExpandedChart] = useState(false);
  const cmi = new Date().getMonth();
  const NAMES27 = ["Janvier 2027","Fevrier 2027","Mars 2027","Avril 2027","Mai 2027","Juin 2027","Juillet 2027","Aout 2027","Septembre 2027","Octobre 2027","Novembre 2027","Decembre 2027"];
  const fromCur = f.months;
  const need = Math.max(0, 12 - fromCur.length);
  const lastM = f.months[f.months.length - 1] || f.months[0];
  type EM = typeof fromCur[number] & { is_projected?: boolean };
  const proj: EM[] = Array.from({ length: need }, (_, i) => ({ month_key: `2027-${String(i+1).padStart(2,"0")}`, month_name: NAMES27[i], income: lastM.income, expenses: lastM.expenses, savings_target: lastM.savings_target, balance: lastM.balance, alert_type: lastM.alert_type, is_projected: true }));
  const rolling: EM[] = [...fromCur, ...proj];

  let cumul = prevCumul;
  const chartData = rolling.map(m => { cumul += m.balance; const ip = (m as EM).is_projected; return { name: m.month_name.slice(0,3) + (ip ? "*" : ""), full: m.month_name + (ip ? " (proj.)" : ""), "Revenu": m.income, "Dépenses": m.expenses, "Solde mensuel": m.balance, "Solde cumulé": cumul, isProj: ip }; });
  const alerts = rolling.filter(m => m.alert_type !== "ok");
  const ti = rolling.reduce((s, m) => s + m.income, 0);
  const te = rolling.reduce((s, m) => s + m.expenses, 0);
  const fc = chartData.length > 0 ? chartData[chartData.length-1]["Solde cumulé"] : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
        {[{ l: "Revenus 12 mois", v: ti, c: S.success }, { l: "Dépenses 12 mois", v: te, c: S.danger }, { l: "Total économisé", v: fc, c: fc >= 0 ? S.primary : S.danger }].map(({ l, v, c }) => (
          <Card key={l} className="card-h"><SLabel>{l}</SLabel><p style={{ fontFamily: S.heading, fontSize: 28, fontWeight: 700, color: c, margin: 0 }}>{fmt(v)}</p></Card>
        ))}
        <Card className="card-h" style={{ borderColor: alerts.length > 0 ? `${S.danger}40` : `${S.success}30` }}><SLabel>Mois a risque</SLabel><p style={{ fontFamily: S.heading, fontSize: 28, fontWeight: 700, color: alerts.length > 0 ? S.danger : S.success, margin: 0 }}>{alerts.length} mois</p></Card>
      </div>

      {alerts.length > 0 && alerts.map(a => (
        <div key={a.month_key} style={{ background: a.alert_type === "danger" ? `${S.danger}08` : `${S.warning}08`, border: `1px solid ${a.alert_type === "danger" ? S.danger : S.warning}40`, borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <AlertTriangle size={18} color={a.alert_type === "danger" ? S.danger : S.warning} />
          <span style={{ fontFamily: S.heading, fontSize: 17, color: S.accent, flexShrink: 0, fontWeight: 700 }}>{a.month_name}</span>
          <span style={{ fontSize: 13, color: S.text, flex: 1 }}>{a.message || (a.alert_type === "danger" ? "Solde négatif" : "Solde serré")}</span>
          <span style={{ fontFamily: S.heading, fontSize: 17, color: a.alert_type === "danger" ? S.danger : S.warning, fontWeight: 700, flexShrink: 0 }}>{fmt(a.balance)}</span>
        </div>
      ))}

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" as const, gap: 8 }}>
          <div style={{ position: "relative", display: "inline-block", float: "right" }}><ExpandBtn onClick={() => setExpandedChart(!expandedChart)} /></div>
          <SLabel>Projection 12 mois — {rolling[0]?.month_name ?? ""} a {rolling[rolling.length-1]?.month_name ?? ""}</SLabel>
          {need > 0 && <span style={{ color: S.muted, fontSize: 11, background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 6, padding: "3px 8px" }}>* = estimation 2027</span>}
        </div>
        <ResponsiveContainer width="100%" height={expandedChart ? 600 : 300}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 12, fontFamily: S.font }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: S.accent, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine yAxisId="right" y={0} stroke={S.muted} strokeDasharray="4 4" strokeWidth={1} />
            <Bar yAxisId="left" dataKey="Revenu" fill={`${S.success}50`} radius={[4,4,0,0]} maxBarSize={26} />
            <Bar yAxisId="left" dataKey="Dépenses" fill={`${S.danger}50`} radius={[4,4,0,0]} maxBarSize={26} />
            <Line yAxisId="right" type="monotone" dataKey="Solde mensuel" stroke={`${S.warning}80`} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="Solde cumulé" stroke={S.accent} strokeWidth={3} dot={{ fill: S.accent, r: 4, strokeWidth: 0 }} activeDot={{ r: 7 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
          {[{ c: `${S.success}50`, l: "Revenu" }, { c: `${S.danger}50`, l: "Dépenses" }, { c: `${S.warning}80`, l: "Solde mensuel" }, { c: S.accent, l: "Solde cumulé" }].map(({ c, l }) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, background: c, borderRadius: 3 }} /><span style={{ color: S.muted, fontSize: 12 }}>{l}</span></div>
          ))}
        </div>
      </Card>

      <Card>
        <SLabel>Detail 12 mois avec solde cumule</SLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: S.font, fontSize: 13 }}>
            <thead><tr>{["Mois","Revenus","Dépenses","Épargne","Solde","Cumulé","Statut"].map(h => <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: S.muted, fontWeight: 600, fontSize: 11, borderBottom: `2px solid ${S.border}` }}>{h}</th>)}</tr></thead>
            <tbody>{(() => { let rc = prevCumul; return rolling.map(mo => { rc += mo.balance; const ac = mo.alert_type === "danger" ? S.danger : mo.alert_type === "warning" ? S.warning : S.success; const ip = (mo as EM).is_projected; return (
              <tr key={mo.month_key} className="row-h" style={{ borderBottom: `1px solid ${S.border}`, opacity: ip ? 0.7 : 1 }}>
                <td style={{ padding: "9px 14px", fontFamily: S.heading, fontSize: 16, color: ip ? S.muted : S.text, fontWeight: 600 }}>{mo.month_name}{ip && <span style={{ color: S.muted, fontSize: 10, marginLeft: 4 }}>(proj.)</span>}</td>
                <td style={{ padding: "9px 14px", color: S.success, fontWeight: 600 }}>{fmt(mo.income)}</td>
                <td style={{ padding: "9px 14px", color: S.danger, fontWeight: 600 }}>{fmt(mo.expenses)}</td>
                <td style={{ padding: "9px 14px", color: S.muted }}>{fmt(mo.savings_target )}</td>
                <td style={{ padding: "9px 14px", color: ac, fontWeight: 600 }}>{fmt(mo.balance)}</td>
                <td style={{ padding: "9px 14px", fontFamily: S.heading, fontSize: 17, fontWeight: 800, color: rc >= 0 ? S.success : S.danger }}>{fmt(rc)}</td>
                <td style={{ padding: "9px 14px" }}><span style={{ background: `${ac}15`, color: ac, border: `1px solid ${ac}40`, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{mo.alert_type === "danger" ? "NEGATIF" : mo.alert_type === "warning" ? "SERRE" : "OK"}</span></td>
              </tr>); }); })()}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}



// ── Historique ────────────────────────────────────────────────────────────────
function HistoriqueTab({ months, goalMonthly = 0 }: { months: Month[]; goalMonthly?: number }) {
  const exportCSV = () => { const header = "Mois,Revenus,Depenses,Epargne,Solde,Cumule"; const csvRows = rows.map(r => `${r.month_name},${r.inc},${r.exp},${r.sav},${r.bal},${r.cumul}`); const csv = [header, ...csvRows].join("\n"); const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `budget_historique_${rows[0]?.year || 2026}.csv`; a.click(); URL.revokeObjectURL(url); };
  let cumul = 0;
  const rows = months.map(m => { const inc = m.income_salary + m.income_other + ((m as unknown as Record<string,number>).income_rente ?? 0) + ((m as unknown as Record<string,number>).income_epargne ?? 0) + ((m as unknown as Record<string,number>).income_actions ?? 0) + ((m as unknown as Record<string,number>).income_virements ?? 0) + ((m as unknown as Record<string,number>).income_solde_ajuste ?? 0); const expItems = m.expenses.filter(e => e.category !== "investment").reduce((s, e) => s + e.amount, 0); const budgetEnv = Object.values(m.budget_allocation as unknown as Record<string, number>).reduce((s, v) => s + v, 0); const exp = expItems + budgetEnv; const investSum = m.expenses.filter(e => e.category === "investment").reduce((s, e) => s + e.amount, 0); const sav = investSum ; const bal = inc - exp - sav; cumul += bal; return { ...m, inc, exp, sav, bal, cumul, vc: m.expenses.filter(e => e.validated).length, tc: m.expenses.length }; });
  const ti = rows.reduce((s, r) => s + r.inc, 0); const te = rows.reduce((s, r) => s + r.exp, 0); const fc = rows.length > 0 ? rows[rows.length-1].cumul : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {[{ l: "Total revenus", v: ti, c: S.success }, { l: "Total dépenses", v: te, c: S.danger }, { l: "Total économisé", v: fc, c: fc >= 0 ? S.primary : S.danger }].map(({ l, v, c }) => (
          <Card key={l} className="card-h"><SLabel>{l}</SLabel><p style={{ fontFamily: S.heading, fontSize: 26, fontWeight: 700, color: c, margin: 0 }}>{fmt(v)}</p></Card>
        ))}
      </div>

      {/* Evolution chart */}
      <Card style={{ position: "relative" }}>
        <SLabel>Evolution mensuelle</SLabel>
        <button onClick={exportCSV} style={{ position: "absolute", top: 10, right: 14, fontSize: 11, fontWeight: 600, color: S.primary, background: `${S.primary}10`, border: `1px solid ${S.primary}30`, borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontFamily: S.font }}>Exporter CSV</button>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={rows.map(r => ({ name: r.month_name.slice(0, 3), "Revenus": r.inc, "Dépenses": r.exp, "Solde": r.bal, "Cumulé": r.cumul }))} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: S.muted, fontSize: 10, fontFamily: S.font }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: S.accent, fontSize: 10, fontFamily: S.font }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine yAxisId="right" y={0} stroke={S.muted} strokeDasharray="4 4" strokeWidth={1} />
            <Bar yAxisId="left" dataKey="Revenus" fill={`${S.success}40`} radius={[3,3,0,0]} maxBarSize={20} />
            <Bar yAxisId="left" dataKey="Dépenses" fill={`${S.danger}40`} radius={[3,3,0,0]} maxBarSize={20} />
            <Line yAxisId="right" type="monotone" dataKey="Cumulé" stroke={S.accent} strokeWidth={3} dot={{ fill: S.accent, r: 3, strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 14, marginTop: 8, justifyContent: "center", flexWrap: "wrap" as const }}>
          {[{ c: `${S.success}40`, l: "Revenus" }, { c: `${S.danger}40`, l: "Dépenses" }, { c: S.accent, l: "Cumulé" }].map(({ c, l }) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, background: c, borderRadius: 2 }} /><span style={{ color: S.muted, fontSize: 11 }}>{l}</span></div>
          ))}
        </div>
      </Card>

      <Card>
        <SLabel>Historique détaillé — mois par mois</SLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: S.font, fontSize: 13 }}>
            <thead><tr>{["Mois","Revenus","Dépenses","Épargne","Solde","Cumulé","Valid."].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: S.muted, fontWeight: 600, fontSize: 11, borderBottom: `2px solid ${S.border}`, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map(r => {
              const bc = r.bal >= 0 ? S.success : S.danger; const cc = r.cumul >= 0 ? S.success : S.danger; const pv = r.tc > 0 ? Math.round((r.vc/r.tc)*100) : 0;
              return (<tr key={r.month_key} className="row-h" style={{ borderBottom: `1px solid ${S.border}` }}>
                <td style={{ padding: "12px 14px", fontFamily: S.heading, fontSize: 17, color: S.text, fontWeight: 700 }}>{r.month_name}</td>
                <td style={{ padding: "12px 14px", color: S.success, fontWeight: 600 }}>{fmt(r.inc)}</td>
                <td style={{ padding: "12px 14px", color: S.danger, fontWeight: 600 }}>{fmt(r.exp)}</td>
                <td style={{ padding: "12px 14px", color: S.accent }}>{fmt(r.sav)}</td>
                <td style={{ padding: "12px 14px", color: bc, fontWeight: 700 }}>{fmt(r.bal)}</td>
                <td style={{ padding: "12px 14px" }}><span style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 800, color: cc }}>{fmt(r.cumul)}</span></td>
                <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, background: "rgba(0,0,0,0.06)", borderRadius: 999, height: 6, overflow: "hidden", minWidth: 50 }}><div style={{ background: pv === 100 ? S.success : S.accent, height: "100%", width: `${pv}%`, borderRadius: 999 }} /></div><span style={{ color: pv === 100 ? S.success : S.muted, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{r.vc}/{r.tc}</span></div></td>
              </tr>);
            })}</tbody>
            <tfoot><tr style={{ borderTop: `2px solid ${S.border}` }}>
              <td style={{ padding: "12px 14px", fontFamily: S.heading, fontSize: 17, fontWeight: 800 }}>TOTAL</td>
              <td style={{ padding: "12px 14px", fontFamily: S.heading, fontSize: 16, color: S.success, fontWeight: 700 }}>{fmt(ti)}</td>
              <td style={{ padding: "12px 14px", fontFamily: S.heading, fontSize: 16, color: S.danger, fontWeight: 700 }}>{fmt(te)}</td>
              <td style={{ padding: "12px 14px", fontFamily: S.heading, fontSize: 16, color: S.accent, fontWeight: 700 }}>{fmt(rows.reduce((s, r) => s + r.sav, 0))}</td>
              <td></td>
              <td style={{ padding: "12px 14px", fontFamily: S.heading, fontSize: 20, fontWeight: 800, color: fc >= 0 ? S.success : S.danger }}>{fmt(fc)}</td>
              <td></td>
            </tr></tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}


// ── Salaires ──────────────────────────────────────────────────────────────────
function SalairesTab({ showToast: toast }: { showToast: (msg: string) => void }) {
  const [data, setData] = useState<{ years: number[]; months: { name: string; values: number[] }[]; totals: number[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const xpSal = useExpand();
  useEffect(() => { fetch("/api/budget/salary-history", { headers: getAuthHeaders() }).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  async function updateCell(mi: number, yi: number, value: number) {
    if (!data) return;
    const nd = { ...data, months: data.months.map((m, i) => i === mi ? { ...m, values: m.values.map((v, j) => j === yi ? value : v) } : m) };
    nd.totals = nd.years.map((_, yi2) => nd.months.reduce((s, m) => s + m.values[yi2], 0));
    setData(nd);
    try { await fetch("/api/budget/salary-history", { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(nd) }); toast("Salaire mis à jour"); } catch { toast("Erreur"); }
  }
  if (loading) return <Card style={{ textAlign: "center", padding: 40 }}><p style={{ color: S.muted }}>Chargement...</p></Card>;
  if (!data) return <Card style={{ textAlign: "center", padding: 40 }}><p style={{ color: S.danger }}>Erreur</p></Card>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <SLabel>Historique des salaires bruts</SLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: S.font, fontSize: 13, minWidth: 800 }}>
            <thead><tr>
              <th style={{ padding: "10px 14px", textAlign: "left", color: S.muted, fontWeight: 700, fontSize: 11, borderBottom: `2px solid ${S.border}`, position: "sticky", left: 0, background: S.surface, zIndex: 2 }}>MOIS</th>
              {data.years.map(y => (<th key={y} style={{ padding: "10px 12px", textAlign: "right", color: y === 2026 ? S.accent : S.muted, fontWeight: 700, fontSize: 12, borderBottom: `2px solid ${S.border}` }}>{y}</th>))}
            </tr></thead>
            <tbody>{data.months.map((m, mi) => (
              <tr key={m.name} className="row-h" style={{ borderBottom: `1px solid ${S.border}` }}>
                <td style={{ padding: "10px 14px", fontFamily: S.heading, fontSize: 15, color: S.text, fontWeight: 600, position: "sticky", left: 0, background: S.surface, zIndex: 1 }}>{m.name}</td>
                {m.values.map((v, yi) => (<td key={yi} style={{ padding: "8px 8px", textAlign: "right" }}>
                  <EditableAmt value={v} onChange={val => updateCell(mi, yi, val)} color={data.years[yi] === 2026 ? S.accent : S.text} size="sm" />
                </td>))}
              </tr>
            ))}</tbody>
            <tfoot><tr style={{ borderTop: `2px solid ${S.border}` }}>
              <td style={{ padding: "12px 14px", fontFamily: S.heading, fontSize: 16, fontWeight: 800, color: S.text, position: "sticky", left: 0, background: S.surface }}>TOTAL</td>
              {data.totals.map((t, yi) => (<td key={yi} style={{ padding: "12px 8px", textAlign: "right", fontFamily: S.heading, fontSize: 15, fontWeight: 800, color: data.years[yi] === 2026 ? S.accent : S.success }}>{fmt(t)}</td>))}
            </tr></tfoot>
          </table>
        </div>
      </Card>

      {/* Salary Evolution Chart */}
      <Card className="chart-expand" style={xpSal.st}>
        <ExpandBtn onClick={xpSal.toggle} />
        <SLabel>Evolution des salaires bruts annuels (% vs annee precedente)</SLabel>
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.years.map((y, i) => { const t = data.totals[i]; const prev = i < data.years.length - 1 ? data.totals[i+1] : 0; const pct = prev > 0 ? ((t - prev) / prev) * 100 : 0; return { year: String(y), total: t, pctChange: Math.round(pct * 10) / 10 }; }).reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: S.muted }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: S.muted }} tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v}%`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: S.accent }} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number, name: string) => [name === "pctChange" ? `${v > 0 ? "+" : ""}${v}%` : `${v.toLocaleString("fr-FR")} EUR`, name === "pctChange" ? "Variation" : "Total brut"]} contentStyle={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine yAxisId="left" y={0} stroke={S.muted} strokeDasharray="3 3" />
              <Bar yAxisId="left" dataKey="pctChange" fill={S.accent} radius={[4,4,0,0]} />
              <Line yAxisId="right" type="monotone" dataKey="total" stroke={S.primary} strokeWidth={2} dot={{ r: 3, fill: S.primary }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {(() => {
          const validTotals = data.totals.filter((t: number) => t > 0);
          const avgSalary = validTotals.length > 0 ? Math.round(validTotals.reduce((s: number, t: number) => s + t, 0) / validTotals.length) : 0;
          const pcts = data.years.map((y: number, i: number) => { const t = data.totals[i]; const prev = i < data.years.length - 1 ? data.totals[i+1] : 0; return prev > 0 ? ((t - prev) / prev) * 100 : 0; }).filter((p: number) => p !== 0);
          const avgPct = pcts.length > 0 ? Math.round((pcts.reduce((s: number, p: number) => s + p, 0) / pcts.length) * 10) / 10 : 0;
          return (<div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: "8px 20px", background: S.bg, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: S.muted, textTransform: "uppercase" as const }}>Variation annuelle moy.</div>
              <div style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 700, color: avgPct >= 0 ? S.accent : S.danger }}>{avgPct > 0 ? "+" : ""}{avgPct}% / an</div>
            </div>
            <div style={{ textAlign: "center", padding: "8px 20px", background: S.bg, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: S.muted, textTransform: "uppercase" as const }}>Salaire annuel moyen</div>
              <div style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 700, color: S.primary }}>{avgSalary.toLocaleString("fr-FR")} EUR</div>
            </div>
          </div>);
        })()}
      </Card>

      {/* Tax Simulator */}
      <TaxSimulator latestSalary={data.totals[0]} />
    </div>
  );
}

// ── Tax Simulator ──────────────────────────────────────────────────────────────
const TAX_BRACKETS = [
  { min: 0, max: 11497, rate: 0 },
  { min: 11498, max: 29315, rate: 0.11 },
  { min: 29316, max: 83823, rate: 0.30 },
  { min: 83824, max: 180294, rate: 0.41 },
  { min: 180295, max: Infinity, rate: 0.45 },
];
const SOCIAL_RATE = 0.25; // cadre ~25%
const SOCIAL_CONTRIB_INVESTMENT = 0.172; // 17.2% prelevements sociaux
const FLAT_TAX_RATE = 0.30; // PFU 30%

function calcIR(revenuImposable: number, parts: number): { tax: number; marginalRate: number; effectiveRate: number; byBracket: { bracket: string; amount: number; rate: number }[] } {
  const qi = revenuImposable / parts;
  let taxPerPart = 0;
  const byBracket: { bracket: string; amount: number; rate: number }[] = [];
  for (const b of TAX_BRACKETS) {
    if (qi <= b.min) break;
    const taxable = Math.min(qi, b.max) - b.min;
    const t = taxable * b.rate;
    taxPerPart += t;
    if (taxable > 0) byBracket.push({ bracket: `${b.min.toLocaleString("fr-FR")} - ${b.max === Infinity ? "+" : b.max.toLocaleString("fr-FR")} EUR`, amount: Math.round(t * parts), rate: b.rate });
  }
  const totalTax = Math.round(taxPerPart * parts);
  const marginalRate = TAX_BRACKETS.find(b => qi >= b.min && qi <= b.max)?.rate ?? 0;
  return { tax: totalTax, marginalRate, effectiveRate: revenuImposable > 0 ? totalTax / revenuImposable : 0, byBracket };
}

function getParts(situation: string, children: number): number {
  let parts = situation === "celibataire" ? 1 : 2;
  if (children >= 1) parts += 0.5;
  if (children >= 2) parts += 0.5;
  if (children >= 3) parts += children - 2; // 1 full part per child from 3rd
  return parts;
}

function TaxSimulator({ latestSalary }: { latestSalary: number }) {
  const [brutAnnuel, setBrutAnnuel] = useState(String(latestSalary || 72000));
  const [situation, setSituation] = useState<"celibataire" | "marie" | "pacse">("celibataire");
  const [children, setChildren] = useState(0);
  const [revImmo, setRevImmo] = useState("");
  const [revActions, setRevActions] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const brut = parseFloat(brutAnnuel) || 0;
  const cotisations = Math.round(brut * SOCIAL_RATE);
  const netAvantIR = brut - cotisations;
  const immo = parseFloat(revImmo) || 0;
  const actions = parseFloat(revActions) || 0;
  const flatTax = Math.round(actions * FLAT_TAX_RATE);
  const revenuImposable = Math.round(netAvantIR * 0.9 + immo * 0.7); // 10% abatement salaires, 30% abatement micro-foncier
  const parts = getParts(situation, children);
  const ir = calcIR(revenuImposable, parts);
  const socialImmo = Math.round(immo * SOCIAL_CONTRIB_INVESTMENT);
  const totalImpot = ir.tax + flatTax + socialImmo;
  const netApresImpot = netAvantIR + immo + actions - totalImpot;
  const netMensuel = Math.round(netApresImpot / 12);

  const barTotal = cotisations + totalImpot + netApresImpot;
  const pctCot = barTotal > 0 ? (cotisations / barTotal) * 100 : 0;
  const pctImp = barTotal > 0 ? (totalImpot / barTotal) * 100 : 0;
  const pctNet = 100 - pctCot - pctImp;

  return (
    <Card>
      <SLabel>Simulateur fiscal 2026</SLabel>
      <div className="expenses-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: S.muted, display: "block", marginBottom: 4, textTransform: "uppercase" as const }}>Salaire brut annuel</label>
          <input type="number" value={brutAnnuel} onChange={e => setBrutAnnuel(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 16, fontFamily: S.heading, fontWeight: 700, border: `1px solid ${S.border}`, borderRadius: 8, background: S.bg, color: S.accent, outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: S.muted, display: "block", marginBottom: 4, textTransform: "uppercase" as const }}>Situation</label>
          <div style={{ display: "flex", gap: 4 }}>
            {(["celibataire", "marie", "pacse"] as const).map(s => (
              <button key={s} onClick={() => setSituation(s)} style={{ flex: 1, padding: "9px 6px", fontSize: 11, fontWeight: 600, border: `1px solid ${situation === s ? S.accent : S.border}`, borderRadius: 6, background: situation === s ? `${S.accent}15` : "transparent", color: situation === s ? S.accent : S.muted, cursor: "pointer", textTransform: "capitalize" as const }}>{s === "celibataire" ? "Celibataire" : s === "marie" ? "Marie(e)" : "Pacse(e)"}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: S.muted, display: "block", marginBottom: 4, textTransform: "uppercase" as const }}>Enfants</label>
          <div style={{ display: "flex", gap: 4 }}>
            {[0,1,2,3,4].map(n => (
              <button key={n} onClick={() => setChildren(n)} style={{ width: 36, height: 36, fontSize: 14, fontWeight: 700, border: `1px solid ${children === n ? S.accent : S.border}`, borderRadius: 6, background: children === n ? `${S.accent}15` : "transparent", color: children === n ? S.accent : S.muted, cursor: "pointer" }}>{n}{n === 4 ? "+" : ""}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: S.muted, marginTop: 3 }}>{parts} part{parts > 1 ? "s" : ""} fiscale{parts > 1 ? "s" : ""}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: S.muted, display: "block", marginBottom: 4, textTransform: "uppercase" as const }}>Revenus immobiliers / an</label>
            <input type="number" value={revImmo} onChange={e => setRevImmo(e.target.value)} placeholder="0" style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: `1px solid ${S.border}`, borderRadius: 6, background: S.bg, color: S.text, outline: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: S.muted, display: "block", marginBottom: 4, textTransform: "uppercase" as const }}>Revenus financiers / an (flat tax)</label>
            <input type="number" value={revActions} onChange={e => setRevActions(e.target.value)} placeholder="0" style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: `1px solid ${S.border}`, borderRadius: 6, background: S.bg, color: S.text, outline: "none" }} />
          </div>
        </div>
      </div>

      {/* Repartition bar */}
      <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ width: `${pctCot}%`, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", transition: "width 0.3s" }}>{pctCot > 8 ? "Cotisations" : ""}</div>
        <div style={{ width: `${pctImp}%`, background: S.danger, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", transition: "width 0.3s" }}>{pctImp > 8 ? "Impots" : ""}</div>
        <div style={{ width: `${pctNet}%`, background: S.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", transition: "width 0.3s" }}>{pctNet > 8 ? "Net" : ""}</div>
      </div>

      {/* Results grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: S.bg, borderRadius: 10, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: S.muted, textTransform: "uppercase" as const, marginBottom: 4 }}>Net mensuel</div>
          <div style={{ fontFamily: S.heading, fontSize: 24, fontWeight: 800, color: S.accent }}>{netMensuel.toLocaleString("fr-FR")} EUR</div>
        </div>
        <div style={{ background: S.bg, borderRadius: 10, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: S.muted, textTransform: "uppercase" as const, marginBottom: 4 }}>Taux moyen</div>
          <div style={{ fontFamily: S.heading, fontSize: 24, fontWeight: 800, color: "#fbbf24" }}>{(ir.effectiveRate * 100).toFixed(1)}%</div>
        </div>
        <div style={{ background: S.bg, borderRadius: 10, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: S.muted, textTransform: "uppercase" as const, marginBottom: 4 }}>Taux marginal</div>
          <div style={{ fontFamily: S.heading, fontSize: 24, fontWeight: 800, color: S.danger }}>{(ir.marginalRate * 100).toFixed(0)}%</div>
        </div>
      </div>

      {/* Detail table */}
      <div style={{ fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}><span style={{ color: S.muted }}>Salaire brut annuel</span><span style={{ fontWeight: 600 }}>{brut.toLocaleString("fr-FR")} EUR</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}><span style={{ color: S.muted }}>Cotisations sociales (~25%)</span><span style={{ color: "#f97316", fontWeight: 600 }}>-{cotisations.toLocaleString("fr-FR")} EUR</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}><span style={{ color: S.muted }}>Net avant impot</span><span style={{ fontWeight: 600 }}>{netAvantIR.toLocaleString("fr-FR")} EUR</span></div>
        {immo > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}><span style={{ color: S.muted }}>Revenus immobiliers</span><span style={{ fontWeight: 600 }}>+{immo.toLocaleString("fr-FR")} EUR</span></div>}
        {actions > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}><span style={{ color: S.muted }}>Revenus financiers (flat tax 30%)</span><span style={{ color: S.danger, fontWeight: 600 }}>-{flatTax.toLocaleString("fr-FR")} EUR</span></div>}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}><span style={{ color: S.muted }}>Revenu imposable ({parts} parts)</span><span style={{ fontWeight: 600 }}>{revenuImposable.toLocaleString("fr-FR")} EUR</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}`, cursor: "pointer" }} onClick={() => setShowDetail(!showDetail)}><span style={{ color: S.muted }}>Impot sur le revenu {showDetail ? "▲" : "▼"}</span><span style={{ color: S.danger, fontWeight: 700 }}>-{ir.tax.toLocaleString("fr-FR")} EUR</span></div>
        {showDetail && ir.byBracket.map((b, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 4px 20px", fontSize: 11, color: S.muted }}><span>{b.bracket} ({(b.rate*100).toFixed(0)}%)</span><span>{b.amount.toLocaleString("fr-FR")} EUR</span></div>
        ))}
        {socialImmo > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}><span style={{ color: S.muted }}>Prelevements sociaux (immobilier 17.2%)</span><span style={{ color: S.danger, fontWeight: 600 }}>-{socialImmo.toLocaleString("fr-FR")} EUR</span></div>}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: `2px solid ${S.border}`, marginTop: 4 }}><span style={{ fontFamily: S.heading, fontWeight: 800, fontSize: 15 }}>Net annuel apres impot</span><span style={{ fontFamily: S.heading, fontWeight: 800, fontSize: 17, color: S.accent }}>{netApresImpot.toLocaleString("fr-FR")} EUR</span></div>
      </div>
    </Card>
  );
}


// ── Economies ─────────────────────────────────────────────────────────────────
const PORTFOLIO_CATEGORIES: { label: string; color: string; items: { key: keyof Savings; label: string }[] }[] = [
  { label: "Actions / Cryptos", color: "#16a34a", items: [{ key: "pea", label: "PEA" }, { key: "traderepublic", label: "TradeRepublic" }, { key: "degiro", label: "Degiro" }, { key: "bitstack", label: "Bitstack" }, { key: "swissborg", label: "Swissborg" }] },
  { label: "Assurances Vie", color: "#818cf8", items: [{ key: "swisslife", label: "Swisslife" }, { key: "assurance_vie_conservateur", label: "La Conservateur" }, { key: "uptimi", label: "Uptimi" }, { key: "esalia", label: "Esalia" }, { key: "bdl_investment", label: "BDL Investment" }] },
  { label: "RSU", color: "#F97316", items: [{ key: "etrade", label: "Etrade" }, { key: "shareworks", label: "Shareworks" }] },
  { label: "Livrets", color: "#0891b2", items: [{ key: "livret_a", label: "Livret A" }, { key: "epargne_revolut", label: "Epargne Revolut" }, { key: "ldd", label: "LDD" }, { key: "lel", label: "LEL" }] },
  { label: "Retraite & Autres", color: "#d97706", items: [{ key: "per", label: "PER" }, { key: "perco", label: "PERCO" }, { key: "irishlife", label: "Irishlife" }, { key: "montres_objets_luxe", label: "Montres / Objets luxe" }, { key: "tontine", label: "Tontine" }] },
];

function EconomiesTab({ months, currentIdx, onSavingsChange, onPortfolioValuesChange, onValidateExpense, onAddInvestment, isMobile }: {
  months: Month[]; currentIdx: number;
  onSavingsChange: (mk: string, u: Partial<Savings>) => void;
  onPortfolioValuesChange: (mk: string, u: Record<string, number>) => void;
  onValidateExpense?: (label: string, validated: boolean) => void;
  onAddInvestment?: (label: string, amount: number) => void; isMobile?: boolean;
}) {
  const m = months[currentIdx];
  const xpPort = useExpand();
  if (!m) return null;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({"Actions / Cryptos": true, "Assurances Vie": true, "RSU": true, "Livrets": true, "Retraite & Autres": true});
  const sav = m.savings;
  const pct = sav.cumulative_target > 0 ? Math.min(100, Math.round((sav.cumulative_actual / sav.cumulative_target) * 100)) : 0;
  const allItems = PORTFOLIO_CATEGORIES.flatMap(c => c.items);
  const totalInvested = allItems.reduce((s, p) => s + ((sav[p.key] as number) ?? 0), 0);
  const pv = m.portfolio_values || {};
  const totalValue = allItems.reduce((s, p) => s + ((pv[p.key as string] as number) ?? 0), 0);
  const totalPlusValue = totalValue - totalInvested;
  const portfolioChart = months.map(mo => {
    const inv = allItems.reduce((s, p) => s + ((mo.savings[p.key] as number) ?? 0), 0);
    const mpv = mo.portfolio_values || {};
    const val = allItems.reduce((s, p) => s + ((mpv[p.key as string] as number) ?? 0), 0);
    return { name: mo.month_name.slice(0, 3), "Investis": inv, "Valeur": val > 0 ? val : undefined, "Plus-value": val > 0 ? val - inv : undefined };
  });
  const savingsChart = months.map(mo => ({ name: mo.month_name.slice(0, 3), "Objectif": mo.savings.target_monthly, "Réalisé": mo.savings.actual_monthly }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Investissements mensuels */}
      <Card style={{ borderColor: `${S.accent}25` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SLabel>Investissements & épargne mensuels</SLabel>
          <span style={{ fontFamily: S.heading, fontSize: 15, fontWeight: 700, color: S.accent }}>{fmt(m.expenses.filter((e: Expense) => e.category === "investment").reduce((s: number, e: Expense) => s + e.amount, 0))}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
          {m.expenses.filter((e: Expense) => e.category === "investment").map((e: Expense) => (
            <div key={e.label} className="row-h" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: e.validated ? `${S.accent}12` : S.surface2, borderRadius: 10, border: `1px solid ${e.validated ? S.accent + "40" : S.border}` }}>
              <TrendingUp size={14} color={e.validated ? S.accent : S.muted} />
              <span style={{ flex: 1, fontSize: 13, color: e.validated ? S.text : S.muted, fontWeight: 600 }}>{e.label}</span>
              <span style={{ fontFamily: S.heading, fontSize: 14, fontWeight: 700, color: S.accent }}>{fmt(e.amount)}</span>
              <button onClick={() => onValidateExpense && onValidateExpense(e.label, !e.validated)} style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${e.validated ? S.accent : S.muted}`, background: e.validated ? S.accent : "transparent", color: e.validated ? "#fff" : S.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}><Check size={12} /></button>
              <button onClick={() => { const h = getAuthHeaders(); fetch(`/api/budget/month/${m.month_key}/expense?label=` + encodeURIComponent(e.label), { method: "DELETE", headers: h }).then(() => window.location.reload()); }} style={{ width: 22, height: 22, border: "none", background: "transparent", color: S.muted, cursor: "pointer", opacity: 0.4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Supprimer"><Trash2 size={10} /></button>
            </div>
          ))}
        </div>
        <button onClick={() => { const name = prompt("Nom de l'investissement :"); if (name) { const amt = parseFloat(prompt("Montant mensuel :") || "0"); if (amt > 0 && onAddInvestment) onAddInvestment(name, amt); } }} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, border: `1px dashed ${S.border}`, borderRadius: 8, background: "transparent", color: S.muted, cursor: "pointer", width: "100%", justifyContent: "center" }}><Plus size={12} /> Ajouter un investissement</button>
      </Card>


      {/* Totaux portefeuille */}
      {totalInvested > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[{ l: "Total investi", v: totalInvested, c: S.primary }, { l: "Valeur actuelle", v: totalValue, c: totalValue > 0 ? S.success : S.muted }, { l: "Plus-value totale", v: totalPlusValue, c: totalPlusValue >= 0 ? S.success : S.danger }].map(({ l, v, c }) => (
            <Card key={l} className="card-h" style={{ textAlign: "center" }}>
              <SLabel>{l}</SLabel>
              <p style={{ fontFamily: S.heading, fontSize: 22, fontWeight: 700, color: c, margin: 0 }}>{v > 0 || l === "Plus-value totale" ? fmt(v) : "—"}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Portfolio categories groupees */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap" as const, gap: 8 }}>
          <SLabel>Investissements effectues &amp; Valeur du portefeuille</SLabel>
          {totalValue > 0 && (
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ color: S.muted, fontSize: 12 }}>Investi: <strong style={{ color: S.primary }}>{fmt(totalInvested)}</strong></span>
              <span style={{ color: S.muted, fontSize: 12 }}>Valeur: <strong style={{ color: S.success }}>{fmt(totalValue)}</strong></span>
              <span style={{ color: S.muted, fontSize: 12 }}>+/-: <strong style={{ color: totalPlusValue >= 0 ? S.success : S.danger }}>{totalPlusValue >= 0 ? "+" : ""}{fmt(totalPlusValue)}</strong></span>
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 90px 90px" : "1fr 120px 120px 80px", gap: 8, padding: "0 12px 8px", borderBottom: `1px solid ${S.border}`, marginBottom: 12 }}>
          {(isMobile ? ["Ligne", "Investi", "Valeur"] : ["Ligne", "Investi", "Valeur actuelle", "+/-"]).map((h, i) => (
            <span key={h} style={{ color: S.muted, fontSize: 11, fontWeight: 700, textAlign: i > 0 ? "right" : "left" }}>{h}</span>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {PORTFOLIO_CATEGORIES.map((cat) => {
            const catInv = cat.items.reduce((s, p) => s + ((sav[p.key] as number) ?? 0), 0);
            const catVal = cat.items.reduce((s, p) => s + ((pv[p.key as string] as number) ?? 0), 0);
            const catDiff = catVal - catInv;
            return (
              <div key={cat.label} style={{ marginBottom: 14 }}>
                <div onClick={() => setCollapsed(p => ({ ...p, [cat.label]: !p[cat.label] }))} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 90px 90px" : "1fr 120px 120px 80px", gap: 8, padding: "8px 12px", background: `${cat.color}10`, borderRadius: 10, marginBottom: 5, borderLeft: `3px solid ${cat.color}`, cursor: "pointer" }}>
                  <span style={{ fontFamily: S.heading, fontSize: 15, fontWeight: 700, color: cat.color }}>{collapsed[cat.label] ? "▶" : "▼"} {cat.label}</span>
                  <span style={{ fontFamily: S.heading, fontSize: 14, color: cat.color, fontWeight: 700, textAlign: "right" }}>{fmt(catInv)}</span>
                  <span style={{ fontFamily: S.heading, fontSize: 14, color: catVal > 0 ? S.success : S.muted, fontWeight: 700, textAlign: "right" }}>{catVal > 0 ? fmt(catVal) : "—"}</span>
                  {!isMobile && <span style={{ fontFamily: S.heading, fontSize: 13, color: catVal > 0 ? (catDiff >= 0 ? S.success : S.danger) : S.muted, fontWeight: 700, textAlign: "right" }}>{catVal > 0 ? `${catDiff >= 0 ? "+" : ""}${fmt(catDiff)}` : "—"}</span>}
                </div>
                {!collapsed[cat.label] && <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 8 }}>
                  {cat.items.map((p) => {
                    const inv = (sav[p.key] as number) ?? 0;
                    const val = (pv[p.key as string] as number) ?? 0;
                    const diff = val - inv;
                    return (
                      <div key={p.key as string} className="row-h" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 90px 90px" : "1fr 120px 120px 80px", gap: 8, alignItems: "center", padding: "7px 12px", background: S.surface2, borderRadius: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, flexShrink: 0, opacity: 0.6 }} />
                          <span style={{ fontSize: 13, color: inv > 0 ? S.text : S.muted }}>{p.label}</span>
                        </div>
                        <div style={{ textAlign: "right" }}><EditableAmt value={inv} onChange={v => onSavingsChange(m.month_key, { [p.key]: v } as unknown as Partial<Savings>)} color={cat.color} size="sm" /></div>
                        <div style={{ textAlign: "right" }}><EditableAmt value={val} onChange={v => onPortfolioValuesChange(m.month_key, { [p.key as string]: v })} color={val > 0 ? S.success : S.muted} size="sm" /></div>
                        {!isMobile && <div style={{ textAlign: "right", fontFamily: S.heading, fontSize: 13, fontWeight: 700, color: val > 0 ? (diff >= 0 ? S.success : S.danger) : S.muted }}>{val > 0 ? `${diff >= 0 ? "+" : ""}${fmt(diff)}` : "—"}</div>}
                        {!isMobile && <button onClick={() => { onSavingsChange(m.month_key, { [p.key]: undefined } as unknown as Partial<Savings>); }} style={{ width: 20, height: 20, border: "none", background: "transparent", color: S.muted, cursor: "pointer", opacity: 0.4, display: "flex", alignItems: "center", justifyContent: "center" }} title="Supprimer"><Trash2 size={10} /></button>}
                      </div>
                    );
                  })}
                </div>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <Card>
          {xpPort.ex && <div onClick={xpPort.toggle} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}><div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "90vw", height: "80vh", padding: 24, position: "relative" }}><button onClick={xpPort.toggle} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>×</button><p style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Evolution portefeuille par mois</p><ResponsiveContainer width="100%" height="90%"><ComposedChart data={portfolioChart}><CartesianGrid stroke="rgba(0,0,0,0.05)" /><XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: S.muted, fontSize: 10, fontFamily: S.font }} axisLine={false} tickLine={false} width={50} /><Tooltip content={<ChartTip />} />{PORTFOLIO_CATEGORIES.map(cat => <Bar key={cat.label} dataKey={cat.label} fill={cat.color} radius={[3,3,0,0]} maxBarSize={12} />)}</ComposedChart></ResponsiveContainer></div></div>}
          <div style={{ position: "relative", display: "inline-block", float: "right" }}><ExpandBtn onClick={xpPort.toggle} /></div>
          <SLabel>Evolution portefeuille par mois</SLabel>
          <ResponsiveContainer width="100%" height={xpPort.ex ? "100%" : 220} key="port">
            <ComposedChart data={portfolioChart}>
              <CartesianGrid stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: S.muted, fontSize: 10, fontFamily: S.font }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: S.accent, fontSize: 10, fontFamily: S.font }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTip />} />
              <ReferenceLine yAxisId="right" y={0} stroke={S.muted} strokeDasharray="3 3" strokeWidth={1} />
              <Bar yAxisId="left" dataKey="Investis" fill={`${S.primary}45`} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar yAxisId="left" dataKey="Valeur" fill={`${S.success}45`} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Line yAxisId="right" type="monotone" dataKey="Plus-value" stroke={S.accent} strokeWidth={2.5} dot={{ fill: S.accent, r: 3, strokeWidth: 0 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Monthly +/- values by category */}
      <Card>
        <SLabel>Historique mensuel des plus/moins-values par categorie</SLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: S.font, fontSize: 13 }}>
            <thead><tr>
              <th style={{ padding: "8px 14px", textAlign: "left", color: S.muted, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${S.border}` }}>Mois</th>
              {PORTFOLIO_CATEGORIES.map(c => <th key={c.label} style={{ padding: "8px 10px", textAlign: "right", color: c.color, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${S.border}` }}>{c.label}</th>)}
              <th style={{ padding: "8px 14px", textAlign: "right", color: S.accent, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${S.border}` }}>Total</th>
            </tr></thead>
            <tbody>{months.map(mo => {
              const mpv = mo.portfolio_values || {};
              const catPVs = PORTFOLIO_CATEGORIES.map(c => {
                const inv = c.items.reduce((s, p) => s + ((mo.savings[p.key] as number) ?? 0), 0);
                const val = c.items.reduce((s, p) => s + ((mpv[p.key as string] as number) ?? 0), 0);
                return val > 0 ? val - inv : 0;
              });
              const totalPV = catPVs.reduce((s, v) => s + v, 0);
              const isCur = mo.month_key === m.month_key;
              return (<tr key={mo.month_key} className="row-h" style={{ borderBottom: `1px solid ${S.border}`, background: isCur ? `${S.accent}06` : "transparent" }}>
                <td style={{ padding: "9px 14px", fontFamily: S.heading, fontSize: 14, color: isCur ? S.accent : S.text, fontWeight: 600 }}>{mo.month_name}</td>
                {catPVs.map((pv2, ci) => <td key={ci} style={{ padding: "9px 10px", textAlign: "right", fontSize: 12, fontWeight: 600, color: pv2 > 0 ? S.success : pv2 < 0 ? S.danger : S.muted }}>{pv2 !== 0 ? `${pv2 > 0 ? "+" : ""}${fmt(pv2)}` : "-"}</td>)}
                <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: S.heading, fontSize: 14, fontWeight: 800, color: totalPV >= 0 ? S.accent : S.danger }}>{totalPV !== 0 ? `${totalPV > 0 ? "+" : ""}${fmt(totalPV)}` : "-"}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}



































































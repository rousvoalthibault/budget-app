"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Home, Shield, TrendingUp, TrendingDown, Wifi, Tv, Smartphone,
  CreditCard, ShoppingBag, ShoppingCart, Car, Train, Zap, Gift,
  Plane, Briefcase, Bot, Activity, PiggyBank, BarChart2, Bitcoin,
  UtensilsCrossed, ArrowLeft, ArrowRight, AlertTriangle, Check,
  RefreshCw, Pencil, Wallet, Plus, Trash2, X, Calendar,
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
interface ForecastMonth { month_key: string; month_name: string; income: number; expenses: number; savings_target: number; balance: number; alert_type: string; }
interface Alert { month_key: string; month_name: string; projected_balance: number; alert_type: string; message: string; }
interface Forecast { months: ForecastMonth[]; alerts: Alert[]; total_income: number; total_expenses: number; total_savings: number; }

// ── Design ────────────────────────────────────────────────────────────────────
const S = {
  bg: "#f8fafc", surface: "#ffffff", surface2: "#f1f5f9",
  border: "rgba(0,0,0,0.07)", borderLight: "rgba(0,0,0,0.12)",
  primary: "#2563EB", accent: "#F97316",
  success: "#16a34a", danger: "#dc2626", warning: "#d97706",
  text: "#0f172a", muted: "#64748b",
  font: "Outfit,sans-serif", heading: "Outfit,sans-serif",
};

const ICONS: Record<string, React.ElementType> = {
  Home, Shield, TrendingUp, Wifi, Tv, Smartphone, CreditCard, ShoppingBag,
  ShoppingCart, Car, Train, Zap, Gift, Plane, Briefcase, Bot, Activity,
  PiggyBank, BarChart2, Bitcoin, UtensilsCrossed,
};

const BUDGET_LABELS: Record<string, string> = {
  courses: "Courses", restaurants: "Restaurants", services: "Services",
  revolut: "Revolut", amex: "Amex", cera: "CERA",
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
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
    <span onClick={start} title="Cliquer pour modifier" style={{ cursor: "pointer", fontFamily: S.heading, fontSize: fs, fontWeight: 700, color: col, lineHeight: 1.1, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {fmt(value)}<Pencil size={Math.max(10, fs * 0.42)} style={{ opacity: 0.3, marginBottom: 1 }} />
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BudgetApp() {
  const [tab, setTab] = useState<"dashboard" | "depenses" | "projection" | "historique" | "economies">("dashboard");
  const [months, setMonths] = useState<Month[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok?: boolean } | null>(null);

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mr, fr] = await Promise.all([fetch("/api/budget/months"), fetch("/api/budget/forecast")]);
      const md = await mr.json(); const fd = await fr.json();
      const mths: Month[] = md.months || [];
      setMonths(mths); setForecast(fd);
      setIdx(i => Math.min(i, mths.length - 1));
    } catch { showToast("Erreur de chargement", false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [mr, fr] = await Promise.all([fetch("/api/budget/months"), fetch("/api/budget/forecast")]);
        const md = await mr.json(); const fd = await fr.json();
        const mths: Month[] = md.months || [];
        setMonths(mths); setForecast(fd);
        setIdx(Math.min(new Date().getMonth(), mths.length - 1));
      } catch { showToast("Erreur de chargement", false); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  async function patchExpense(mk: string, label: string, updates: Partial<Expense>) {
    setSaving(label);
    try {
      const r = await fetch(`/api/budget/month/${mk}/expense`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, ...updates }) });
      const d = await r.json();
      if (d.success) {
        setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, expenses: m.expenses.map(e => e.label === label ? { ...e, ...updates } : e) }));
        if (updates.validated !== undefined) showToast(updates.validated ? `${label} validee` : `${label} devalidee`);
        else showToast("Montant mis a jour");
        fetch("/api/budget/forecast").then(r => r.json()).then(setForecast);
      }
    } catch { showToast("Erreur", false); }
    finally { setSaving(null); }
  }

  async function addExpense(mk: string, label: string, amount: number, category: string) {
    setSaving("adding");
    try {
      const r = await fetch(`/api/budget/month/${mk}/expense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, amount, category, propagate: true }),
      });
      const d = await r.json();
      if (d.success) {
        showToast(`${label} ajoutee${d.propagated_to > 1 ? ` (${d.propagated_to} mois)` : ""}`);
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
      if (d.success) { setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, expenses: m.expenses.filter(e => e.label !== label) })); showToast(`${label} supprimee`); fetch("/api/budget/forecast").then(r => r.json()).then(setForecast); }
    } catch { showToast("Erreur", false); }
    finally { setSaving(null); }
  }

  async function patchIncome(mk: string, field: "income_salary" | "income_other", value: number) {
    setSaving("income");
    try {
      const body: Record<string, number> = {}; body[field] = value;
      const r = await fetch(`/api/budget/month/${mk}/income`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, [field]: value })); showToast("Revenu mis a jour"); fetch("/api/budget/forecast").then(r => r.json()).then(setForecast); }
    } catch { showToast("Erreur", false); }
    finally { setSaving(null); }
  }

  async function patchSavings(mk: string, updates: Partial<Savings>) {
    try {
      const r = await fetch(`/api/budget/month/${mk}/savings`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      const d = await r.json();
      if (d.success) { setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, savings: { ...m.savings, ...updates } })); showToast("Epargne mise a jour"); }
    } catch { showToast("Erreur", false); }
  }

  async function patchPortfolioValues(mk: string, updates: Record<string, number>) {
    try {
      const r = await fetch(`/api/budget/month/${mk}/portfolio-values`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      const d = await r.json();
      if (d.success) { setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, portfolio_values: { ...(m.portfolio_values || {}), ...updates } })); showToast("Valeur portefeuille mise a jour"); }
    } catch { showToast("Erreur", false); }
  }

  async function patchBudgetAlloc(mk: string, updates: { amounts?: Record<string, number>; validated?: Record<string, boolean> }) {
    try {
      const r = await fetch(`/api/budget/month/${mk}/budget-allocation`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      const d = await r.json();
      if (d.success) {
        setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, budget_allocation: updates.amounts ? { ...m.budget_allocation, ...updates.amounts } as BudgetAlloc : m.budget_allocation, budget_validated: updates.validated ? { ...(m.budget_validated || {}), ...updates.validated } : m.budget_validated }));
        showToast("Budget mis a jour");
        fetch("/api/budget/forecast").then(r => r.json()).then(setForecast);
      }
    } catch { showToast("Erreur", false); }
  }

  const m = months[idx];
  const validatedBudget = m ? Object.entries(m.budget_validated || {}).filter(([, v]) => v).reduce((sum, [k]) => sum + ((m.budget_allocation as unknown as Record<string, number>)[k] || 0), 0) : 0;
  const totalExp = m ? m.expenses.reduce((s, e) => s + e.amount, 0) + validatedBudget : 0;
  const netBal = m ? m.income_salary + m.income_other - totalExp - (m.savings?.target_monthly ?? 140) : 0;
  const validatedCnt = m ? m.expenses.filter(e => e.validated).length + Object.values(m.budget_validated || {}).filter(Boolean).length : 0;
  const totalItems = m ? m.expenses.length + Object.keys(m.budget_allocation).length : 0;

  const TABS = [
    { id: "dashboard", label: "Tableau de bord" },
    { id: "depenses", label: "Depenses" },
    { id: "projection", label: "Projection 12 mois" },
    { id: "historique", label: "Historique" },
    { id: "economies", label: "Economies" },
  ] as const;

  if (loading) return (
    <div style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: S.font }}>
      <div style={{ width: 48, height: 48, border: `3px solid ${S.primary}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: S.muted }}>Chargement...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: S.bg, minHeight: "100vh", color: S.text, fontFamily: S.font }}>
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
        .val-btn:hover{opacity:0.85!important}
        .val-btn{transition:all 0.2s}
        input:focus{outline:none!important}
        select{cursor:pointer}
        button{cursor:pointer}
      `}</style>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.ok ? S.surface : "#2a1010", border: `1px solid ${toast.ok ? S.accent : S.danger}`, borderRadius: 12, padding: "10px 20px", fontFamily: S.font, fontSize: 14, animation: "toastIn 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.ok ? <Check size={14} color={S.success} /> : <AlertTriangle size={14} color={S.danger} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div>
          <h1 style={{ fontFamily: S.heading, fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1, letterSpacing: "-0.3px" }}>Budget Personnel</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <Calendar size={11} color={S.muted} />
            <p style={{ color: S.muted, fontSize: 11, margin: 0 }}>{getDateFR()}</p>
          </div>
        </div>
        {m && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={{ background: "transparent", border: `1px solid ${S.border}`, color: idx === 0 ? S.muted : S.text, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.4 : 1 }}><ArrowLeft size={14} /></button>
            <div style={{ minWidth: 110, textAlign: "center" }}>
              <div style={{ fontFamily: S.heading, fontSize: 20, fontWeight: 700, color: S.accent, lineHeight: 1 }}>{m.month_name}</div>
              <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{validatedCnt}/{totalItems} valides</div>
            </div>
            <button onClick={() => setIdx(i => Math.min(months.length - 1, i + 1))} disabled={idx === months.length - 1} style={{ background: "transparent", border: `1px solid ${S.border}`, color: idx === months.length - 1 ? S.muted : S.text, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === months.length - 1 ? 0.4 : 1 }}><ArrowRight size={14} /></button>
          </div>
        )}
        <button onClick={loadData} title="Actualiser" style={{ background: "transparent", border: `1px solid ${S.border}`, color: S.muted, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><RefreshCw size={13} /></button>
      </header>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <nav style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "0 20px", display: "flex", position: "sticky", top: 65, zIndex: 49, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)} style={{ background: "none", border: "none", padding: "13px 16px", color: tab === t.id ? S.accent : S.muted, fontFamily: S.font, fontWeight: 600, fontSize: 14, borderBottom: tab === t.id ? `2px solid ${S.accent}` : "2px solid transparent", whiteSpace: "nowrap", transition: "color 0.15s" }}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Content ────────────────────────────────────────────────── */}
      <main key={tab} style={{ padding: "24px", maxWidth: 1200, margin: "0 auto", animation: "fadeUp 0.25s ease" }}>
        {tab === "dashboard" && m && (
          <DashboardTab month={m} netBalance={netBal} totalExpenses={totalExp} validatedBudget={validatedBudget} validatedCount={validatedCnt} totalCount={totalItems}
            onIncomeChange={(f, v) => patchIncome(m.month_key, f, v)}
            onValidate={(l, v) => patchExpense(m.month_key, l, { validated: v })} saving={saving} />
        )}
        {tab === "depenses" && m && (
          <DepensesTab month={m} monthKey={m.month_key}
            onValidate={(l, v) => patchExpense(m.month_key, l, { validated: v })}
            onAmountChange={(l, a) => patchExpense(m.month_key, l, { amount: a })}
            onIncomeChange={(f, v) => patchIncome(m.month_key, f, v)}
            onBudgetChange={(upd) => patchBudgetAlloc(m.month_key, upd)}
            onAddExpense={(label, amount, category) => addExpense(m.month_key, label, amount, category)}
            onDeleteExpense={(label) => deleteExpense(m.month_key, label)}
            saving={saving} isAdding={saving === "adding"} />
        )}
        {tab === "projection" && forecast && <ProjectionTab forecast={forecast} />}
        {tab === "historique" && months.length > 0 && <HistoriqueTab months={months} />}
        {tab === "economies" && months.length > 0 && (
          <EconomiesTab months={months} currentIdx={idx}
            onSavingsChange={(mk, u) => patchSavings(mk, u)}
            onPortfolioValuesChange={(mk, u) => patchPortfolioValues(mk, u)} />
        )}
      </main>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab({ month: m, netBalance, totalExpenses, validatedBudget, validatedCount, totalCount, onIncomeChange, onValidate, saving }: {
  month: Month; netBalance: number; totalExpenses: number; validatedBudget: number; validatedCount: number; totalCount: number;
  onIncomeChange: (f: "income_salary" | "income_other", v: number) => void;
  onValidate: (label: string, v: boolean) => void; saving: string | null;
}) {
  const income = m.income_salary + m.income_other;
  const balColor = netBalance >= 0 ? S.success : S.danger;
  const fixed = m.expenses.filter(e => e.category === "fixed");
  const invest = m.expenses.filter(e => e.category === "investment");
  const variable = m.expenses.filter(e => e.category === "variable");
  const pending = m.expenses.filter(e => !e.validated);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {[
          { label: "Salaire du mois", value: m.income_salary, color: S.success, editable: true, field: "income_salary" as const },
          { label: "Total depenses", value: totalExpenses, color: S.danger, editable: false, sub: validatedBudget > 0 ? `dont ${fmt(validatedBudget)} enveloppes` : undefined },
          { label: "Solde net", value: netBalance, color: balColor, editable: false },
          { label: "Objectif economies", value: m.savings?.target_monthly ?? 140, color: S.accent, editable: false, sub: `Cumul: ${fmt(m.savings?.cumulative_target ?? 0)}` },
        ].map(({ label, value, color, editable, field, sub }) => (
          <Card key={label} className="card-h" style={{ background: `linear-gradient(135deg, ${color}14, ${S.bg})`, borderColor: `${color}28` }}>
            <SLabel>{label}</SLabel>
            {editable && field ? <EditableAmt value={value} onChange={v => onIncomeChange(field, v)} color={color} size="lg" />
              : <p style={{ fontFamily: S.heading, fontSize: 30, fontWeight: 700, color, margin: 0 }}>{fmt(value)}</p>}
            {sub && <p style={{ color: S.muted, fontSize: 12, margin: "6px 0 0" }}>{sub}</p>}
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SLabel>Progression validation</SLabel>
          <span style={{ color: validatedCount === totalCount ? S.success : S.muted, fontSize: 13, fontWeight: 700 }}>{validatedCount === totalCount ? "Tout valide !" : `${validatedCount} / ${totalCount}`}</span>
        </div>
        <div style={{ background: S.surface2, borderRadius: 999, height: 10, overflow: "hidden" }}>
          <div style={{ background: `linear-gradient(90deg, ${S.success}, ${S.accent})`, height: "100%", width: `${totalCount > 0 ? (validatedCount / totalCount) * 100 : 0}%`, borderRadius: 999, transition: "width 0.6s ease" }} />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[{ label: "Depenses fixes", items: fixed, color: S.primary }, { label: "Investissements", items: invest, color: S.accent }, { label: "Variables", items: variable, color: S.warning }].map(({ label, items, color }) => {
          const total = items.reduce((s, e) => s + e.amount, 0);
          const pct = income > 0 ? Math.round((total / income) * 100) : 0;
          return (
            <Card key={label} className="card-h">
              <SLabel>{label} ({items.length})</SLabel>
              <p style={{ fontFamily: S.heading, fontSize: 26, fontWeight: 700, color, margin: "0 0 10px" }}>{fmt(total)}</p>
              <div style={{ background: S.surface2, borderRadius: 999, height: 6, overflow: "hidden", marginBottom: 5 }}>
                <div style={{ background: color, height: "100%", width: `${Math.min(pct, 100)}%`, borderRadius: 999, transition: "width 0.5s" }} />
              </div>
              <p style={{ color: S.muted, fontSize: 11, margin: 0 }}>{pct}% du revenu</p>
            </Card>
          );
        })}
      </div>

      <SwipeValidator expenses={m.expenses} onValidate={onValidate} saving={saving} />
    </div>
  );
}


function SwipeValidator({ expenses, onValidate, onAmountChange, saving }: { expenses: Expense[]; onValidate: (label: string, v: boolean) => void; onAmountChange?: (label: string, amount: number) => void; saving: string | null }) {
  const pending = expenses.filter(e => !e.validated);
  const [ci, setCi] = useState(0);
  const [ox, setOx] = useState(0);
  const [drag, setDrag] = useState(false);
  const sx = useRef(0);
  const [fly, setFly] = useState<"right"|"left"|null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const list = reviewMode ? pending.filter(e => skipped.includes(e.label)) : pending;
  const cur = list[ci];

  function hs(x: number) { setDrag(true); sx.current = x; setOx(0); }
  function hm(x: number) { if (drag) setOx(x - sx.current); }
  function he() {
    if (!drag) return; setDrag(false);
    if (ox > 80 && cur) {
      setFly("right"); onValidate(cur.label, true);
      setTimeout(() => { setCi(i => i+1); setOx(0); setFly(null); }, 350);
    } else if (ox < -80 && cur) {
      setFly("left");
      if (!reviewMode) setSkipped(s => [...s, cur.label]);
      setTimeout(() => { setCi(i => i+1); setOx(0); setFly(null); }, 350);
    } else setOx(0);
  }

  function startReview() { setReviewMode(true); setCi(0); }

  const done = ci >= list.length;

  function renderCard() {
    if (!pending.length) return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <Check size={36} color={S.success} style={{ margin: "0 auto 12px" }} />
        <p style={{ fontFamily: S.heading, fontSize: 24, fontWeight: 700, color: S.success, margin: 0 }}>Tout est valide !</p>
      </div>
    );
    if (done) return (
      <div style={{ textAlign: "center", padding: "32px 20px" }}>
        <Check size={36} color={S.success} style={{ margin: "0 auto 12px" }} />
        <p style={{ fontFamily: S.heading, fontSize: 22, fontWeight: 700, color: S.success, margin: 0 }}>Session terminee !</p>
        {skipped.length > 0 && !reviewMode && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: S.warning, fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>{skipped.length} depense{skipped.length > 1 ? "s" : ""} a revoir</p>
            <button onClick={startReview} style={{ background: S.warning, color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontFamily: S.font, fontWeight: 700 }}>Revoir maintenant</button>
          </div>
        )}
        {(skipped.length === 0 || reviewMode) && (
          <button onClick={() => { setCi(0); setSkipped([]); setReviewMode(false); }} style={{ marginTop: 12, background: S.primary, color: "#fff", border: "none", borderRadius: 10, padding: "8px 20px", fontSize: 14, fontFamily: S.font, fontWeight: 600 }}>Recommencer</button>
        )}
      </div>
    );

    const Ico = (cur.icon && ICONS[cur.icon]) ? ICONS[cur.icon] : CreditCard;
    const isR = ox > 50; const isL = ox < -50;
    const tx = fly === "right" ? 600 : fly === "left" ? -600 : ox;
    const rot = fly === "right" ? 25 : fly === "left" ? -25 : ox * 0.06;

    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 20px 20px", position: "relative", minHeight: fullscreen ? 280 : 180, touchAction: "none" }}>
        <div style={{ position: "absolute", left: fullscreen ? 40 : 20, top: "50%", transform: "translateY(-50%)", color: S.danger, opacity: isL ? 0.9 : 0.12, transition: drag ? "none" : "opacity 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><X size={fullscreen ? 36 : 28} /><span style={{ fontSize: fullscreen ? 14 : 11, fontWeight: 700 }}>Revoir</span></div>
        <div style={{ position: "absolute", right: fullscreen ? 40 : 20, top: "50%", transform: "translateY(-50%)", color: S.success, opacity: isR ? 0.9 : 0.12, transition: drag ? "none" : "opacity 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><Check size={fullscreen ? 36 : 28} /><span style={{ fontSize: fullscreen ? 14 : 11, fontWeight: 700 }}>Valider</span></div>
        <div onMouseDown={e => hs(e.clientX)} onMouseMove={e => hm(e.clientX)} onMouseUp={he} onMouseLeave={() => drag && he()} onTouchStart={e => hs(e.touches[0].clientX)} onTouchMove={e => hm(e.touches[0].clientX)} onTouchEnd={he}
          style={{ width: fullscreen ? 320 : 280, userSelect: "none", transform: `translateX(${tx}px) rotate(${rot}deg)`, transition: drag ? "none" : "all 0.35s cubic-bezier(0.4,0,0.2,1)", opacity: fly ? 0 : 1, cursor: "grab", background: isR ? `${S.success}10` : isL ? `${S.danger}08` : S.surface, border: `2px solid ${isR ? S.success : isL ? S.danger : S.border}`, borderRadius: 20, padding: fullscreen ? "32px 24px" : "24px 20px", textAlign: "center", boxShadow: drag ? "0 12px 40px rgba(0,0,0,0.15)" : "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ width: fullscreen ? 56 : 48, height: fullscreen ? 56 : 48, borderRadius: 16, background: `${S.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Ico size={fullscreen ? 28 : 24} color={S.accent} /></div>
          <p style={{ fontFamily: S.heading, fontSize: fullscreen ? 24 : 20, fontWeight: 700, color: S.text, margin: "0 0 6px" }}>{cur.label}</p>
          {onAmountChange ? (
            <div style={{ margin: "0 0 8px" }} onClick={e => e.stopPropagation()}>
              <EditableAmt value={cur.amount} onChange={v => onAmountChange(cur.label, v)} color={S.accent} size="lg" />
            </div>
          ) : (
            <p style={{ fontFamily: S.heading, fontSize: 30, fontWeight: 800, color: S.accent, margin: "0 0 8px" }}>{fmt(cur.amount)}</p>
          )}
          <span style={{ background: `${S.primary}10`, color: S.primary, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6 }}>{cur.category}</span>
          <p style={{ color: S.muted, fontSize: 12, marginTop: 16 }}>← Revoir · Glisser · Valider →</p>
        </div>
      </div>
    );
  }

  const inner = (
    <>
      <div style={{ padding: "12px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SLabel>{reviewMode ? "Revoir les depenses" : "Valider les depenses"} ({list.length - ci} restantes)</SLabel>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: S.muted, fontSize: 12, fontWeight: 600 }}>{Math.min(ci+1, list.length)}/{list.length}</span>
          <button onClick={() => setFullscreen(f => !f)} title={fullscreen ? "Reduire" : "Plein ecran"} style={{ background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: S.muted }}>
            {fullscreen ? <X size={14} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>}
          </button>
        </div>
      </div>
      {renderCard()}
    </>
  );

  if (fullscreen) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: `${S.bg}f0`, backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ maxWidth: 500, margin: "0 auto", width: "100%" }}>
        <Card style={{ border: "none", boxShadow: "0 8px 40px rgba(0,0,0,0.1)", borderRadius: 24 }}>{inner}</Card>
      </div>
    </div>
  );

  return <Card style={{ padding: 0, overflow: "hidden" }}>{inner}</Card>;
}


// ── Depenses ──────────────────────────────────────────────────────────────────
function DepensesTab({ month: m, monthKey, onValidate, onAmountChange, onIncomeChange, onBudgetChange, onAddExpense, onDeleteExpense, saving, isAdding }: {
  month: Month; monthKey: string;
  onValidate: (l: string, v: boolean) => void;
  onAmountChange: (l: string, a: number) => void;
  onIncomeChange: (f: "income_salary" | "income_other", v: number) => void;
  onBudgetChange: (upd: { amounts?: Record<string, number>; validated?: Record<string, boolean> }) => void;
  onAddExpense: (label: string, amount: number, category: string) => void;
  onDeleteExpense: (label: string) => void;
  saving: string | null; isAdding: boolean;
}) {
  const [addingTo, setAddingTo] = useState<"fixed" | "variable" | "investment" | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const labelRef = useRef<HTMLInputElement>(null);

  function openAdd(cat: "fixed" | "variable" | "investment") { setAddingTo(cat); setNewLabel(""); setNewAmount(""); setTimeout(() => labelRef.current?.focus(), 50); }
  function cancelAdd() { setAddingTo(null); setNewLabel(""); setNewAmount(""); }
  function submitAdd() { const a = parseFloat(newAmount); if (!newLabel.trim() || isNaN(a) || a < 0) return; onAddExpense(newLabel.trim(), a, addingTo!); setAddingTo(null); setNewLabel(""); setNewAmount(""); }

  const fixed = m.expenses.filter(e => e.category === "fixed");
  const invest = m.expenses.filter(e => e.category === "investment");
  const variable = m.expenses.filter(e => e.category === "variable");
  const budgetValidated = m.budget_validated || {};
  const validatedBudgetTotal = Object.entries(budgetValidated).filter(([, v]) => v).reduce((sum, [k]) => sum + ((m.budget_allocation as unknown as Record<string, number>)[k] || 0), 0);

  function ExpRow({ e, color }: { e: Expense; color: string }) {
    const Ico = (e.icon && ICONS[e.icon]) ? ICONS[e.icon] : CreditCard;
    const isSav = saving === e.label;
    return (
      <div className="row-h" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: e.validated ? `${color}12` : S.surface2, borderRadius: 10, border: `1px solid ${e.validated ? color + "40" : S.border}`, transition: "all 0.2s" }}>
        <Ico size={14} color={e.validated ? color : S.muted} />
        <span style={{ flex: 1, fontSize: 13, color: e.validated ? S.text : S.muted, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{e.label}</span>
        <EditableAmt value={e.amount} onChange={v => onAmountChange(e.label, v)} color={color} size="sm" />
        <button className="val-btn" onClick={() => onValidate(e.label, !e.validated)} disabled={isSav} style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${e.validated ? color : S.muted}`, background: e.validated ? color : "transparent", color: e.validated ? "#fff" : S.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: isSav ? 0.5 : 1 }} title={e.validated ? "Devalider" : "Valider"}>
          {isSav ? <div style={{ width: 10, height: 10, border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <Check size={12} />}
        </button>
        <button className="del-btn" onClick={() => onDeleteExpense(e.label)} title="Supprimer" style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: `${S.danger}20`, color: S.danger, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Trash2 size={11} />
        </button>
      </div>
    );
  }

  function AddRow({ category, color }: { category: "fixed" | "variable" | "investment"; color: string }) {
    if (addingTo !== category) return null;
    return (
      <div style={{ display: "flex", gap: 8, padding: "8px 12px", background: `${color}08`, borderRadius: 10, border: `1px dashed ${color}50`, alignItems: "center" }}>
        <input ref={labelRef} value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Nom de la depense" onKeyDown={e => { if (e.key === "Enter") submitAdd(); if (e.key === "Escape") cancelAdd(); }} style={{ flex: 1, minWidth: 100, background: S.surface2, border: `1px solid ${color}40`, borderRadius: 7, padding: "5px 10px", color: S.text, fontSize: 13, fontFamily: S.font }} />
        <input value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0 €" type="number" min="0" step="0.01" onKeyDown={e => { if (e.key === "Enter") submitAdd(); if (e.key === "Escape") cancelAdd(); }} style={{ width: 80, background: S.surface2, border: `1px solid ${color}40`, borderRadius: 7, padding: "5px 10px", color: S.text, fontSize: 13, fontFamily: S.font }} />
        <button onClick={submitAdd} disabled={isAdding} style={{ background: color, color: "#fff", border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 700, fontFamily: S.font, display: "flex", alignItems: "center", gap: 4, opacity: isAdding ? 0.6 : 1 }}>
          {isAdding ? <div style={{ width: 10, height: 10, border: "1.5px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <Check size={12} />}
          Ajouter
        </button>
        <button onClick={cancelAdd} style={{ background: "transparent", color: S.muted, border: `1px solid ${S.border}`, borderRadius: 7, padding: "5px 10px", fontSize: 12, fontFamily: S.font, display: "flex", alignItems: "center" }}><X size={12} /></button>
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
          <AddRow category={catKey} color={color} />
        </div>
        <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: S.muted, fontSize: 12 }}>Total ({items.length} lignes)</span>
          <span style={{ fontFamily: S.heading, fontSize: 20, color, fontWeight: 700 }}>{fmt(total)}</span>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ borderColor: `${S.success}30`, background: `linear-gradient(135deg, ${S.success}10, ${S.bg})` }}>
        <SLabel>Revenus du mois</SLabel>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" as const, alignItems: "center" }}>
          <div><p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Salaire principal</p><EditableAmt value={m.income_salary} onChange={v => onIncomeChange("income_salary", v)} color={S.success} size="lg" /></div>
          <div><p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Autres revenus</p><EditableAmt value={m.income_other} onChange={v => onIncomeChange("income_other", v)} color={S.muted} size="lg" /></div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}><p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Total</p><p style={{ fontFamily: S.heading, fontSize: 26, fontWeight: 700, color: S.success, margin: 0 }}>{fmt(m.income_salary + m.income_other)}</p></div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ColCard title="Depenses fixes" items={fixed} color={S.primary} catKey="fixed" />
        <ColCard title="Investissements & epargne" items={invest} color={S.accent} catKey="investment" />
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SLabel>Depenses variables</SLabel>
          <button onClick={() => addingTo === "variable" ? cancelAdd() : openAdd("variable")} style={{ background: addingTo === "variable" ? `${S.warning}30` : `${S.warning}20`, color: S.warning, border: `1px solid ${S.warning}40`, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }} title="Ajouter">
            {addingTo === "variable" ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
          {variable.map(e => <ExpRow key={e.label} e={e} color={S.warning} />)}
        </div>
        {addingTo === "variable" && <div style={{ marginTop: 8 }}><AddRow category="variable" color={S.warning} /></div>}
        <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 12, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: S.muted, fontSize: 12 }}>Total ({variable.length} lignes)</span>
          <span style={{ fontFamily: S.heading, fontSize: 20, color: S.warning, fontWeight: 700 }}>{fmt(variable.reduce((s, e) => s + e.amount, 0))}</span>
        </div>
      </Card>

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
                <span style={{ flex: 1, fontSize: 13, color: isValid ? S.text : S.muted, fontWeight: 600 }}>{BUDGET_LABELS[key] || key}</span>
                <EditableAmt value={amount as number} onChange={v => onBudgetChange({ amounts: { [key]: v } })} color={S.primary} size="sm" />
                <button className="val-btn" onClick={() => onBudgetChange({ validated: { [key]: !isValid } })} style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${isValid ? S.primary : S.muted}`, background: isValid ? S.primary : "transparent", color: isValid ? "#fff" : S.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title={isValid ? "Devalider" : "Valider"}>
                  <Check size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── Projection ─────────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1c1c1c", border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px 14px", fontFamily: S.font }}>
      <p style={{ fontFamily: S.heading, fontSize: 18, color: S.accent, margin: "0 0 8px", fontWeight: 700 }}>{label}</p>
      {payload.filter(p => p.value != null).map(p => <p key={p.name} style={{ color: p.color, fontSize: 13, margin: "2px 0" }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};


function ProjectionTab({ forecast: f }: { forecast: Forecast }) {
  const cmi = new Date().getMonth();
  const NAMES27 = ["Janvier 2027","Fevrier 2027","Mars 2027","Avril 2027","Mai 2027","Juin 2027","Juillet 2027","Aout 2027","Septembre 2027","Octobre 2027","Novembre 2027","Decembre 2027"];
  const fromCur = f.months.slice(cmi);
  const need = Math.max(0, 12 - fromCur.length);
  const lastM = f.months[f.months.length - 1] || f.months[0];
  type EM = typeof fromCur[number] & { is_projected?: boolean };
  const proj: EM[] = Array.from({ length: need }, (_, i) => ({ month_key: `2027-${String(i+1).padStart(2,"0")}`, month_name: NAMES27[i], income: lastM.income, expenses: lastM.expenses, savings_target: lastM.savings_target, balance: lastM.balance, alert_type: lastM.alert_type, is_projected: true }));
  const rolling: EM[] = [...fromCur, ...proj];

  let cumul = 0;
  const chartData = rolling.map(m => { cumul += m.balance; const ip = (m as EM).is_projected; return { name: m.month_name.slice(0,3) + (ip ? "*" : ""), full: m.month_name + (ip ? " (proj.)" : ""), "Revenu": m.income, "Depenses": m.expenses, "Solde mensuel": m.balance, "Solde cumule": cumul, isProj: ip }; });
  const alerts = rolling.filter(m => m.alert_type !== "ok");
  const ti = rolling.reduce((s, m) => s + m.income, 0);
  const te = rolling.reduce((s, m) => s + m.expenses, 0);
  const fc = chartData.length > 0 ? chartData[chartData.length-1]["Solde cumule"] : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
        {[{ l: "Revenus 12 mois", v: ti, c: S.success }, { l: "Depenses 12 mois", v: te, c: S.danger }, { l: "Solde cumule final", v: fc, c: fc >= 0 ? S.primary : S.danger }].map(({ l, v, c }) => (
          <Card key={l} className="card-h"><SLabel>{l}</SLabel><p style={{ fontFamily: S.heading, fontSize: 28, fontWeight: 700, color: c, margin: 0 }}>{fmt(v)}</p></Card>
        ))}
        <Card className="card-h" style={{ borderColor: alerts.length > 0 ? `${S.danger}40` : `${S.success}30` }}><SLabel>Mois a risque</SLabel><p style={{ fontFamily: S.heading, fontSize: 28, fontWeight: 700, color: alerts.length > 0 ? S.danger : S.success, margin: 0 }}>{alerts.length} mois</p></Card>
      </div>

      {alerts.length > 0 && alerts.map(a => (
        <div key={a.month_key} style={{ background: a.alert_type === "danger" ? `${S.danger}08` : `${S.warning}08`, border: `1px solid ${a.alert_type === "danger" ? S.danger : S.warning}40`, borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <AlertTriangle size={18} color={a.alert_type === "danger" ? S.danger : S.warning} />
          <span style={{ fontFamily: S.heading, fontSize: 17, color: S.accent, flexShrink: 0, fontWeight: 700 }}>{a.month_name}</span>
          <span style={{ fontSize: 13, color: S.text, flex: 1 }}>{a.message || (a.alert_type === "danger" ? "Solde negatif" : "Solde serre")}</span>
          <span style={{ fontFamily: S.heading, fontSize: 17, color: a.alert_type === "danger" ? S.danger : S.warning, fontWeight: 700, flexShrink: 0 }}>{fmt(a.balance)}</span>
        </div>
      ))}

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" as const, gap: 8 }}>
          <SLabel>Projection 12 mois — {rolling[0]?.month_name ?? ""} a {rolling[rolling.length-1]?.month_name ?? ""}</SLabel>
          {need > 0 && <span style={{ color: S.muted, fontSize: 11, background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 6, padding: "3px 8px" }}>* = estimation 2027</span>}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 12, fontFamily: S.font }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: S.accent, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine yAxisId="right" y={0} stroke={S.muted} strokeDasharray="4 4" strokeWidth={1} />
            <Bar yAxisId="left" dataKey="Revenu" fill={`${S.success}50`} radius={[4,4,0,0]} maxBarSize={26} />
            <Bar yAxisId="left" dataKey="Depenses" fill={`${S.danger}50`} radius={[4,4,0,0]} maxBarSize={26} />
            <Line yAxisId="right" type="monotone" dataKey="Solde mensuel" stroke={`${S.warning}80`} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="Solde cumule" stroke={S.accent} strokeWidth={3} dot={{ fill: S.accent, r: 4, strokeWidth: 0 }} activeDot={{ r: 7 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
          {[{ c: `${S.success}50`, l: "Revenu" }, { c: `${S.danger}50`, l: "Depenses" }, { c: `${S.warning}80`, l: "Solde mensuel" }, { c: S.accent, l: "Solde cumule" }].map(({ c, l }) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, background: c, borderRadius: 3 }} /><span style={{ color: S.muted, fontSize: 12 }}>{l}</span></div>
          ))}
        </div>
      </Card>

      <Card>
        <SLabel>Detail 12 mois avec solde cumule</SLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: S.font, fontSize: 13 }}>
            <thead><tr>{["Mois","Revenu","Depenses","Economies","Solde mensuel","Solde cumule","Statut"].map(h => <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: S.muted, fontWeight: 600, fontSize: 11, borderBottom: `2px solid ${S.border}` }}>{h}</th>)}</tr></thead>
            <tbody>{(() => { let rc = 0; return rolling.map(mo => { rc += mo.balance; const ac = mo.alert_type === "danger" ? S.danger : mo.alert_type === "warning" ? S.warning : S.success; const ip = (mo as EM).is_projected; return (
              <tr key={mo.month_key} className="row-h" style={{ borderBottom: `1px solid ${S.border}`, opacity: ip ? 0.7 : 1 }}>
                <td style={{ padding: "9px 14px", fontFamily: S.heading, fontSize: 16, color: ip ? S.muted : S.text, fontWeight: 600 }}>{mo.month_name}{ip && <span style={{ color: S.muted, fontSize: 10, marginLeft: 4 }}>(proj.)</span>}</td>
                <td style={{ padding: "9px 14px", color: S.success, fontWeight: 600 }}>{fmt(mo.income)}</td>
                <td style={{ padding: "9px 14px", color: S.danger, fontWeight: 600 }}>{fmt(mo.expenses)}</td>
                <td style={{ padding: "9px 14px", color: S.muted }}>{fmt(mo.savings_target)}</td>
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


// ── Economies ─────────────────────────────────────────────────────────────────
const PORTFOLIO_CATEGORIES: { label: string; color: string; items: { key: keyof Savings; label: string }[] }[] = [
  { label: "Actions / Cryptos", color: "#16a34a", items: [{ key: "pea", label: "PEA" }, { key: "traderepublic", label: "TradeRepublic" }, { key: "degiro", label: "Degiro" }, { key: "bitstack", label: "Bitstack" }, { key: "swissborg", label: "Swissborg" }] },
  { label: "Assurances Vie", color: "#818cf8", items: [{ key: "swisslife", label: "Swisslife" }, { key: "assurance_vie_conservateur", label: "La Conservateur" }, { key: "uptimi", label: "Uptimi" }, { key: "esalia", label: "Esalia" }, { key: "bdl_investment", label: "BDL Investment" }] },
  { label: "RSU", color: "#F97316", items: [{ key: "etrade", label: "Etrade" }, { key: "shareworks", label: "Shareworks" }] },
  { label: "Livrets", color: "#0891b2", items: [{ key: "livret_a", label: "Livret A" }, { key: "epargne_revolut", label: "Epargne Revolut" }, { key: "ldd", label: "LDD" }, { key: "lel", label: "LEL" }] },
  { label: "Retraite & Autres", color: "#d97706", items: [{ key: "per", label: "PER" }, { key: "perco", label: "PERCO" }, { key: "irishlife", label: "Irishlife" }, { key: "montres_objets_luxe", label: "Montres / Objets luxe" }, { key: "tontine", label: "Tontine" }] },
];

function EconomiesTab({ months, currentIdx, onSavingsChange, onPortfolioValuesChange }: {
  months: Month[]; currentIdx: number;
  onSavingsChange: (mk: string, u: Partial<Savings>) => void;
  onPortfolioValuesChange: (mk: string, u: Record<string, number>) => void;
}) {
  const m = months[currentIdx];
  if (!m) return null;
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
  const savingsChart = months.map(mo => ({ name: mo.month_name.slice(0, 3), "Objectif": mo.savings.target_monthly, "Realise": mo.savings.actual_monthly }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Objectifs editables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ borderColor: `${S.accent}30`, background: `linear-gradient(135deg, ${S.accent}06, ${S.bg})` }}>
          <SLabel>Objectif economies 2026 (annuel)</SLabel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" as const }}>
            <EditableAmt value={sav.cumulative_actual} onChange={v => onSavingsChange(m.month_key, { cumulative_actual: v })} color={S.accent} size="lg" />
            <span style={{ color: S.muted, fontSize: 13 }}>epargnes sur</span>
            <EditableAmt value={sav.cumulative_target} onChange={v => onSavingsChange(m.month_key, { cumulative_target: v })} color={S.primary} size="md" />
            <span style={{ color: S.muted, fontSize: 13 }}>objectif</span>
          </div>
          <div style={{ background: "rgba(0,0,0,0.06)", borderRadius: 999, height: 10, overflow: "hidden", marginTop: 14, marginBottom: 6 }}>
            <div style={{ background: `linear-gradient(90deg, ${S.success}, ${S.accent})`, height: "100%", width: `${pct}%`, borderRadius: 999, transition: "width 0.7s ease" }} />
          </div>
          <p style={{ fontFamily: S.heading, fontSize: 28, fontWeight: 800, color: pct >= 100 ? S.success : S.accent, margin: 0 }}>{pct}%</p>
        </Card>
        <Card>
          <SLabel>Objectif mensuel &amp; realise</SLabel>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" as const }}>
            <div><p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Objectif / mois</p><EditableAmt value={sav.target_monthly} onChange={v => onSavingsChange(m.month_key, { target_monthly: v })} color={S.accent} size="lg" /></div>
            <div><p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Realise ce mois</p><EditableAmt value={sav.actual_monthly} onChange={v => onSavingsChange(m.month_key, { actual_monthly: v })} color={S.success} size="lg" /></div>
          </div>
        </Card>
      </div>

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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 80px", gap: 8, padding: "0 12px 8px", borderBottom: `1px solid ${S.border}`, marginBottom: 12 }}>
          {["Ligne", "Investi", "Valeur actuelle", "+/-"].map((h, i) => (
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 80px", gap: 8, padding: "8px 12px", background: `${cat.color}10`, borderRadius: 10, marginBottom: 5, borderLeft: `3px solid ${cat.color}` }}>
                  <span style={{ fontFamily: S.heading, fontSize: 15, fontWeight: 700, color: cat.color }}>{cat.label}</span>
                  <span style={{ fontFamily: S.heading, fontSize: 14, color: cat.color, fontWeight: 700, textAlign: "right" }}>{fmt(catInv)}</span>
                  <span style={{ fontFamily: S.heading, fontSize: 14, color: catVal > 0 ? S.success : S.muted, fontWeight: 700, textAlign: "right" }}>{catVal > 0 ? fmt(catVal) : "—"}</span>
                  <span style={{ fontFamily: S.heading, fontSize: 13, color: catVal > 0 ? (catDiff >= 0 ? S.success : S.danger) : S.muted, fontWeight: 700, textAlign: "right" }}>{catVal > 0 ? `${catDiff >= 0 ? "+" : ""}${fmt(catDiff)}` : "—"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 8 }}>
                  {cat.items.map((p) => {
                    const inv = (sav[p.key] as number) ?? 0;
                    const val = (pv[p.key as string] as number) ?? 0;
                    const diff = val - inv;
                    return (
                      <div key={p.key as string} className="row-h" style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 80px", gap: 8, alignItems: "center", padding: "7px 12px", background: S.surface2, borderRadius: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, flexShrink: 0, opacity: 0.6 }} />
                          <span style={{ fontSize: 13, color: inv > 0 ? S.text : S.muted }}>{p.label}</span>
                        </div>
                        <div style={{ textAlign: "right" }}><EditableAmt value={inv} onChange={v => onSavingsChange(m.month_key, { [p.key]: v } as unknown as Partial<Savings>)} color={cat.color} size="sm" /></div>
                        <div style={{ textAlign: "right" }}><EditableAmt value={val} onChange={v => onPortfolioValuesChange(m.month_key, { [p.key as string]: v })} color={val > 0 ? S.success : S.muted} size="sm" /></div>
                        <div style={{ textAlign: "right", fontFamily: S.heading, fontSize: 13, fontWeight: 700, color: val > 0 ? (diff >= 0 ? S.success : S.danger) : S.muted }}>{val > 0 ? `${diff >= 0 ? "+" : ""}${fmt(diff)}` : "—"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <SLabel>Evolution portefeuille par mois</SLabel>
          <ResponsiveContainer width="100%" height={220}>
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
        <Card>
          <SLabel>Economies mensuelles</SLabel>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={savingsChart}>
              <CartesianGrid stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: S.muted, fontSize: 10, fontFamily: S.font }} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="Objectif" fill="rgba(0,0,0,0.08)" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="Realise" fill={S.success} radius={[3, 3, 0, 0]} maxBarSize={16} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Monthly recap */}
      <Card>
        <SLabel>Recapitulatif mensuel</SLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: S.font, fontSize: 13 }}>
            <thead><tr>{["Mois", "Objectif", "Realise", "Cumul obj.", "Cumul reel", "Ecart"].map(h => <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: S.muted, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${S.border}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {months.map(mo => {
                const ecart = mo.savings.cumulative_actual - mo.savings.cumulative_target;
                const isCur = mo.month_key === m.month_key;
                return (
                  <tr key={mo.month_key} className="row-h" style={{ borderBottom: `1px solid ${S.border}`, background: isCur ? `${S.accent}06` : "transparent" }}>
                    <td style={{ padding: "9px 14px", fontFamily: S.heading, fontSize: 16, color: isCur ? S.accent : S.text, fontWeight: 600 }}>{mo.month_name}{isCur ? " *" : ""}</td>
                    <td style={{ padding: "9px 14px", color: S.muted }}>{fmt(mo.savings.target_monthly)}</td>
                    <td style={{ padding: "9px 14px", color: S.success, fontWeight: 600 }}>{fmt(mo.savings.actual_monthly)}</td>
                    <td style={{ padding: "9px 14px", color: S.muted }}>{fmt(mo.savings.cumulative_target)}</td>
                    <td style={{ padding: "9px 14px", color: S.accent, fontWeight: 600 }}>{fmt(mo.savings.cumulative_actual)}</td>
                    <td style={{ padding: "9px 14px", color: ecart >= 0 ? S.success : S.danger, fontWeight: 700 }}>{ecart >= 0 ? "+" : ""}{fmt(ecart)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}




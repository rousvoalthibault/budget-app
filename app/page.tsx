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
  RefreshCw, Pencil, Wallet, Plus, Trash2, X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Expense { label: string; amount: number; category: string; validated: boolean; icon?: string; }
interface BudgetAlloc { courses: number; restaurants: number; services: number; revolut: number; amex: number; cera: number; }
interface Savings {
  target_monthly: number; actual_monthly: number;
  cumulative_target: number; cumulative_actual: number;
  epargne_revolut: number; pea: number; traderepublic: number;
  bitstack: number; swissborg: number; assurance_vie_conservateur: number;
  per: number; livret_a: number;
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
  bg: "#0a0a0a", surface: "#111111", surface2: "#181818",
  border: "rgba(255,255,255,0.08)", borderLight: "rgba(255,255,255,0.14)",
  primary: "#2563EB", accent: "#F97316",
  success: "#22c55e", danger: "#ef4444", warning: "#f59e0b",
  text: "#f1f5f9", muted: "#64748b",
  font: "Quicksand,sans-serif", heading: "Syne,sans-serif",
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

const CATEGORY_ICONS: Record<string, string[]> = {
  fixed: ["Home", "Shield", "Zap", "Wifi", "Tv", "Smartphone", "Bot", "CreditCard"],
  variable: ["ShoppingCart", "ShoppingBag", "Car", "Train", "Gift", "Plane", "Activity", "UtensilsCrossed", "CreditCard", "Briefcase"],
  investment: ["TrendingUp", "PiggyBank", "BarChart2", "Bitcoin", "Shield"],
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

// ── Shared ────────────────────────────────────────────────────────────────────
function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return <div className={className} style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 20, ...style }}>{children}</div>;
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ color: S.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0 0 12px", fontFamily: S.font }}>{children}</p>;
}

function EditableAmt({ value, onChange, color, size = "md" }: {
  value: number; onChange: (n: number) => void; color?: string; size?: "sm" | "md" | "lg";
}) {
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
  const [tab, setTab] = useState<"dashboard" | "depenses" | "projection" | "economies">("dashboard");
  const [months, setMonths] = useState<Month[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok?: boolean } | null>(null);

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 2800); }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mr, fr] = await Promise.all([fetch("/api/budget/months"), fetch("/api/budget/forecast")]);
      const md = await mr.json(); const fd = await fr.json();
      const mths: Month[] = md.months || [];
      setMonths(mths); setForecast(fd);
      setIdx(Math.min(new Date().getMonth(), mths.length - 1));
    } catch { showToast("Erreur de chargement", false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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

  async function addExpense(mk: string, label: string, amount: number, category: string, icon: string) {
    setSaving("adding");
    try {
      const r = await fetch(`/api/budget/month/${mk}/expense`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, amount, category, icon }) });
      const d = await r.json();
      if (d.success) {
        setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, expenses: d.data.expenses }));
        showToast(`${label} ajoutee`);
        fetch("/api/budget/forecast").then(r => r.json()).then(setForecast);
      }
    } catch { showToast("Erreur", false); }
    finally { setSaving(null); }
  }

  async function deleteExpense(mk: string, label: string) {
    setSaving(label);
    try {
      const r = await fetch(`/api/budget/month/${mk}/expense/${encodeURIComponent(label)}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) {
        setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, expenses: m.expenses.filter(e => e.label !== label) }));
        showToast(`${label} supprimee`);
        fetch("/api/budget/forecast").then(r => r.json()).then(setForecast);
      }
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
    { id: "economies", label: "Economies" },
  ] as const;

  if (loading) return (
    <div style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: S.font }}>
      <div style={{ width: 48, height: 48, border: `3px solid ${S.primary}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: S.muted }}>Chargement du budget...</p>
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
        button{cursor:pointer}
      `}</style>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.ok ? S.surface : "#2a1010", border: `1px solid ${toast.ok ? S.accent : S.danger}`, borderRadius: 12, padding: "10px 20px", fontFamily: S.font, fontSize: 14, animation: "toastIn 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.ok ? <Check size={14} color={S.success} /> : <AlertTriangle size={14} color={S.danger} />}
          {toast.msg}
        </div>
      )}

      <header style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div>
          <h1 style={{ fontFamily: S.heading, fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1, letterSpacing: "-0.5px" }}>Budget 2026</h1>
          <p style={{ color: S.muted, fontSize: 11, margin: "2px 0 0" }}>Thibault &amp; Celine</p>
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

      <nav style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "0 20px", display: "flex", position: "sticky", top: 61, zIndex: 49, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)} style={{ background: "none", border: "none", padding: "13px 16px", color: tab === t.id ? S.accent : S.muted, fontFamily: S.font, fontWeight: 600, fontSize: 14, borderBottom: tab === t.id ? `2px solid ${S.accent}` : "2px solid transparent", whiteSpace: "nowrap", transition: "color 0.15s" }}>
            {t.label}
          </button>
        ))}
      </nav>

      <main key={tab} style={{ padding: "24px", maxWidth: 1200, margin: "0 auto", animation: "fadeUp 0.25s ease" }}>
        {tab === "dashboard" && m && (
          <DashboardTab month={m} netBalance={netBal} totalExpenses={totalExp} validatedBudget={validatedBudget} validatedCount={validatedCnt} totalCount={totalItems}
            onIncomeChange={(f, v) => patchIncome(m.month_key, f, v)}
            onValidate={(l, v) => patchExpense(m.month_key, l, { validated: v })} saving={saving} />
        )}
        {tab === "depenses" && m && (
          <DepensesTab month={m}
            onValidate={(l, v) => patchExpense(m.month_key, l, { validated: v })}
            onAmountChange={(l, a) => patchExpense(m.month_key, l, { amount: a })}
            onIncomeChange={(f, v) => patchIncome(m.month_key, f, v)}
            onBudgetChange={(upd) => patchBudgetAlloc(m.month_key, upd)}
            onAddExpense={(label, amount, category, icon) => addExpense(m.month_key, label, amount, category, icon)}
            onDeleteExpense={(label) => deleteExpense(m.month_key, label)}
            saving={saving} />
        )}
        {tab === "projection" && forecast && <ProjectionTab forecast={forecast} />}
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

      {pending.length > 0 && (
        <Card>
          <SLabel>Depenses a valider ({pending.length})</SLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pending.slice(0, 8).map(e => {
              const Ico = (e.icon && ICONS[e.icon]) ? ICONS[e.icon] : CreditCard;
              return (
                <div key={e.label} className="row-h" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: S.surface2, borderRadius: 10 }}>
                  <Ico size={14} color={S.muted} />
                  <span style={{ flex: 1, fontSize: 13, color: S.muted }}>{e.label}</span>
                  <span style={{ fontFamily: S.heading, fontSize: 16, fontWeight: 700, color: S.text }}>{fmt(e.amount)}</span>
                  <button className="val-btn" onClick={() => onValidate(e.label, true)} disabled={saving === e.label} style={{ background: S.success, color: "#fff", border: "none", borderRadius: 7, padding: "4px 12px", fontSize: 12, fontFamily: S.font, fontWeight: 700, opacity: saving === e.label ? 0.5 : 1 }}>Valider</button>
                </div>
              );
            })}
            {pending.length > 8 && <p style={{ color: S.muted, fontSize: 12, textAlign: "center", margin: "4px 0 0" }}>+ {pending.length - 8} autres dans Depenses</p>}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Depenses ──────────────────────────────────────────────────────────────────
function DepensesTab({ month: m, onValidate, onAmountChange, onIncomeChange, onBudgetChange, onAddExpense, onDeleteExpense, saving }: {
  month: Month;
  onValidate: (label: string, v: boolean) => void;
  onAmountChange: (label: string, amount: number) => void;
  onIncomeChange: (f: "income_salary" | "income_other", v: number) => void;
  onBudgetChange: (updates: { amounts?: Record<string, number>; validated?: Record<string, boolean> }) => void;
  onAddExpense: (label: string, amount: number, category: string, icon: string) => void;
  onDeleteExpense: (label: string) => void;
  saving: string | null;
}) {
  const [addingTo, setAddingTo] = useState<"fixed" | "variable" | "investment" | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newIcon, setNewIcon] = useState("CreditCard");

  function submitAdd() {
    const amt = parseFloat(newAmount);
    if (!newLabel.trim() || isNaN(amt)) return;
    onAddExpense(newLabel.trim(), amt, addingTo!, newIcon);
    setAddingTo(null); setNewLabel(""); setNewAmount(""); setNewIcon("CreditCard");
  }

  function cancelAdd() { setAddingTo(null); setNewLabel(""); setNewAmount(""); }

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
        <button className="val-btn" onClick={() => onValidate(e.label, !e.validated)} disabled={isSav}
          style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${e.validated ? color : S.muted}`, background: e.validated ? color : "transparent", color: e.validated ? "#fff" : S.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: isSav ? 0.5 : 1 }}
          title={e.validated ? "Devalider" : "Valider"}>
          {isSav ? <div style={{ width: 10, height: 10, border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <Check size={12} />}
        </button>
        <button className="del-btn" onClick={() => onDeleteExpense(e.label)} title="Supprimer"
          style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: `${S.danger}20`, color: S.danger, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Trash2 size={11} />
        </button>
      </div>
    );
  }

  function AddForm({ category, color }: { category: "fixed" | "variable" | "investment"; color: string }) {
    const icons = CATEGORY_ICONS[category] || ["CreditCard"];
    return (
      <div style={{ display: "flex", gap: 8, padding: "8px 12px", background: `${color}08`, borderRadius: 10, border: `1px dashed ${color}50`, alignItems: "center", flexWrap: "wrap" as const }}>
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Nom de la depense" onKeyDown={e => e.key === "Enter" && submitAdd()} autoFocus style={{ flex: 1, minWidth: 120, background: S.surface2, border: `1px solid ${color}40`, borderRadius: 7, padding: "5px 10px", color: S.text, fontSize: 13, fontFamily: S.font }} />
        <input value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="Montant" type="number" min="0" step="0.01" onKeyDown={e => e.key === "Enter" && submitAdd()} style={{ width: 80, background: S.surface2, border: `1px solid ${color}40`, borderRadius: 7, padding: "5px 10px", color: S.text, fontSize: 13, fontFamily: S.font }} />
        <select value={newIcon} onChange={e => setNewIcon(e.target.value)} style={{ background: S.surface2, border: `1px solid ${color}40`, borderRadius: 7, padding: "5px 8px", color: S.text, fontSize: 12, fontFamily: S.font }}>
          {icons.map(ico => <option key={ico} value={ico}>{ico}</option>)}
        </select>
        <button onClick={submitAdd} style={{ background: color, color: "#fff", border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 700, fontFamily: S.font, display: "flex", alignItems: "center", gap: 4 }}><Check size={12} /> Ajouter</button>
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
          <button onClick={() => { setAddingTo(catKey); setNewIcon(CATEGORY_ICONS[catKey][0]); }} style={{ background: `${color}20`, color, border: `1px solid ${color}40`, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }} title="Ajouter une depense"><Plus size={14} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(e => <ExpRow key={e.label} e={e} color={color} />)}
          {addingTo === catKey && <AddForm category={catKey} color={color} />}
        </div>
        <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: S.muted, fontSize: 12 }}>Total</span>
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
          <button onClick={() => { setAddingTo("variable"); setNewIcon(CATEGORY_ICONS.variable[0]); }} style={{ background: `${S.warning}20`, color: S.warning, border: `1px solid ${S.warning}40`, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }} title="Ajouter"><Plus size={14} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
          {variable.map(e => <ExpRow key={e.label} e={e} color={S.warning} />)}
        </div>
        {addingTo === "variable" && <div style={{ marginTop: 8 }}><AddForm category="variable" color={S.warning} /></div>}
        <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 12, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: S.muted, fontSize: 12 }}>Total variables</span>
          <span style={{ fontFamily: S.heading, fontSize: 20, color: S.warning, fontWeight: 700 }}>{fmt(variable.reduce((s, e) => s + e.amount, 0))}</span>
        </div>
      </Card>

      <Card style={{ borderColor: `${S.primary}25` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SLabel>Budgets enveloppes — valider = comptes dans depenses</SLabel>
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
      <p style={{ fontFamily: S.heading, fontSize: 18, color: S.accent, margin: "0 0 8px" }}>{label}</p>
      {payload.filter(p => p.value !== null && p.value !== undefined).map(p => <p key={p.name} style={{ color: p.color, fontSize: 13, margin: "2px 0" }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

function ProjectionTab({ forecast: f }: { forecast: Forecast }) {
  const data = f.months.map(m => ({ name: m.month_name.slice(0, 3), "Revenu": m.income, "Depenses": m.expenses, "Solde": m.balance }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
        {[{ l: "Revenu annuel", v: f.total_income, c: S.success }, { l: "Depenses totales", v: f.total_expenses, c: S.danger }, { l: "Balance nette", v: f.total_income - f.total_expenses - f.total_savings, c: (f.total_income - f.total_expenses) > 0 ? S.primary : S.danger }].map(({ l, v, c }) => (
          <Card key={l} className="card-h"><SLabel>{l}</SLabel><p style={{ fontFamily: S.heading, fontSize: 30, fontWeight: 700, color: c, margin: 0 }}>{fmt(v)}</p></Card>
        ))}
        <Card className="card-h" style={{ borderColor: (f.alerts?.length ?? 0) > 0 ? `${S.danger}40` : `${S.success}30` }}>
          <SLabel>Mois a risque</SLabel>
          <p style={{ fontFamily: S.heading, fontSize: 30, fontWeight: 700, color: (f.alerts?.length ?? 0) > 0 ? S.danger : S.success, margin: 0 }}>{f.alerts?.length ?? 0} mois</p>
        </Card>
      </div>

      {(f.alerts?.length ?? 0) > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {f.alerts.map(a => (
            <div key={a.month_key} style={{ background: a.alert_type === "danger" ? `${S.danger}12` : `${S.warning}12`, border: `1px solid ${a.alert_type === "danger" ? S.danger : S.warning}50`, borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <AlertTriangle size={18} color={a.alert_type === "danger" ? S.danger : S.warning} />
              <span style={{ fontFamily: S.heading, fontSize: 18, color: S.accent, flexShrink: 0 }}>{a.month_name}</span>
              <span style={{ fontSize: 13, color: S.text, flex: 1 }}>{a.message}</span>
              <span style={{ fontFamily: S.heading, fontSize: 18, color: a.alert_type === "danger" ? S.danger : S.warning, fontWeight: 700, flexShrink: 0 }}>{fmt(a.projected_balance)}</span>
            </div>
          ))}
        </div>
      )}

      <Card>
        <SLabel>Revenu vs Depenses vs Solde — 12 mois</SLabel>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 12, fontFamily: S.font }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine y={0} stroke={S.muted} strokeDasharray="4 4" strokeWidth={1} />
            <Bar dataKey="Revenu" fill={`${S.success}65`} radius={[4, 4, 0, 0]} maxBarSize={26} />
            <Bar dataKey="Depenses" fill={`${S.danger}65`} radius={[4, 4, 0, 0]} maxBarSize={26} />
            <Line type="monotone" dataKey="Solde" stroke={S.accent} strokeWidth={2.5} dot={{ fill: S.accent, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 20, marginTop: 12, justifyContent: "center" }}>
          {[{ c: `${S.success}65`, l: "Revenu" }, { c: `${S.danger}65`, l: "Depenses" }, { c: S.accent, l: "Solde" }].map(({ c, l }) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, background: c, borderRadius: 3 }} /><span style={{ color: S.muted, fontSize: 12 }}>{l}</span></div>
          ))}
        </div>
      </Card>

      <Card>
        <SLabel>Detail mensuel</SLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: S.font, fontSize: 13 }}>
            <thead><tr>{["Mois", "Revenu", "Depenses", "Economies", "Solde", "Statut"].map(h => <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: S.muted, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${S.border}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {f.months.map(mo => {
                const ac = mo.alert_type === "danger" ? S.danger : mo.alert_type === "warning" ? S.warning : S.success;
                return (
                  <tr key={mo.month_key} className="row-h" style={{ borderBottom: `1px solid ${S.border}` }}>
                    <td style={{ padding: "9px 14px", fontFamily: S.heading, fontSize: 17, color: S.text }}>{mo.month_name}</td>
                    <td style={{ padding: "9px 14px", color: S.success, fontWeight: 600 }}>{fmt(mo.income)}</td>
                    <td style={{ padding: "9px 14px", color: S.danger, fontWeight: 600 }}>{fmt(mo.expenses)}</td>
                    <td style={{ padding: "9px 14px", color: S.accent }}>{fmt(mo.savings_target)}</td>
                    <td style={{ padding: "9px 14px", color: ac, fontWeight: 700 }}>{fmt(mo.balance)}</td>
                    <td style={{ padding: "9px 14px" }}><span style={{ background: `${ac}20`, color: ac, border: `1px solid ${ac}50`, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{mo.alert_type === "danger" ? "NEGATIF" : mo.alert_type === "warning" ? "SERRE" : "OK"}</span></td>
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

// ── Economies ─────────────────────────────────────────────────────────────────
function EconomiesTab({ months, currentIdx, onSavingsChange, onPortfolioValuesChange }: {
  months: Month[]; currentIdx: number;
  onSavingsChange: (mk: string, u: Partial<Savings>) => void;
  onPortfolioValuesChange: (mk: string, u: Record<string, number>) => void;
}) {
  const m = months[currentIdx];
  if (!m) return null;
  const sav = m.savings;
  const pct = sav.cumulative_target > 0 ? Math.min(100, Math.round((sav.cumulative_actual / sav.cumulative_target) * 100)) : 0;

  type PortItem = { key: keyof Savings; label: string; color: string };
  const portfolio: PortItem[] = [
    { key: "epargne_revolut", label: "Epargne Revolut", color: "#818cf8" },
    { key: "pea", label: "PEA", color: S.success },
    { key: "traderepublic", label: "TradeRepublic", color: "#a78bfa" },
    { key: "assurance_vie_conservateur", label: "Assurance Vie (Le Conservateur)", color: S.primary },
    { key: "per", label: "PER", color: S.accent },
    { key: "livret_a", label: "Livret A", color: "#22d3ee" },
    { key: "bitstack", label: "Bitstack", color: "#f59e0b" },
    { key: "swissborg", label: "Swissborg", color: "#34d399" },
  ];

  const portVals = portfolio.map(p => ({ ...p, invested: (sav[p.key] as number) ?? 0, value: (m.portfolio_values?.[p.key] as number) ?? 0 })).sort((a, b) => b.invested - a.invested);
  const totalInvested = portVals.reduce((s, p) => s + p.invested, 0);
  const totalValue = portVals.reduce((s, p) => s + p.value, 0);
  const totalPlusValue = totalValue - totalInvested;

  // Chart: investissements effectues + valeur + plus-value par mois
  const portfolioChart = months.map(mo => {
    const inv = portfolio.reduce((s, p) => s + ((mo.savings[p.key] as number) ?? 0), 0);
    const pv = mo.portfolio_values || {};
    const val = portfolio.reduce((s, p) => s + ((pv[p.key as string] as number) ?? 0), 0);
    return {
      name: mo.month_name.slice(0, 3),
      "Investis": inv,
      "Valeur": val > 0 ? val : undefined,
      "Plus-value": val > 0 ? val - inv : undefined,
    };
  });

  const savingsChart = months.map(mo => ({ name: mo.month_name.slice(0, 3), "Objectif": mo.savings.target_monthly, "Realise": mo.savings.actual_monthly }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Cumul hero */}
      <Card style={{ background: `linear-gradient(135deg, ${S.accent}12, ${S.bg})`, borderColor: `${S.accent}30` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 16, marginBottom: 20 }}>
          <div>
            <SLabel>Cumul economies 2026</SLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <EditableAmt value={sav.cumulative_actual} onChange={v => onSavingsChange(m.month_key, { cumulative_actual: v })} color={S.accent} size="lg" />
              <span style={{ color: S.muted, fontSize: 14 }}>/ {fmt(sav.cumulative_target)} objectif</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: S.heading, fontSize: 42, fontWeight: 800, color: pct >= 100 ? S.success : S.accent, margin: 0, lineHeight: 1 }}>{pct}%</p>
            <p style={{ color: S.muted, fontSize: 12, margin: "4px 0 0" }}>atteint</p>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 14, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ background: `linear-gradient(90deg, ${S.success}, ${S.accent})`, height: "100%", width: `${pct}%`, borderRadius: 999, transition: "width 0.7s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: S.muted }}>
          <span>{fmt(sav.cumulative_actual)} epargnes</span><span>Objectif annuel: {fmt(sav.cumulative_target)}</span>
        </div>
      </Card>

      {/* Monthly target */}
      <Card>
        <SLabel>Objectif mensuel &amp; realise</SLabel>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" as const, alignItems: "center" }}>
          <div><p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Objectif mensuel</p><EditableAmt value={sav.target_monthly} onChange={v => onSavingsChange(m.month_key, { target_monthly: v })} color={S.accent} size="lg" /></div>
          <div><p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Realise ce mois</p><EditableAmt value={sav.actual_monthly} onChange={v => onSavingsChange(m.month_key, { actual_monthly: v })} color={S.success} size="lg" /></div>
        </div>
      </Card>

      {/* Investissements effectues vs Valeur portefeuille — comparison table */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap" as const, gap: 8 }}>
          <SLabel>Investissements effectues &amp; Valeur du portefeuille</SLabel>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: S.muted, fontSize: 11, margin: "0 0 2px" }}>Total investi</p>
              <p style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 700, color: S.primary, margin: 0 }}>{fmt(totalInvested)}</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: S.muted, fontSize: 11, margin: "0 0 2px" }}>Valeur actuelle</p>
              <p style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 700, color: totalValue > 0 ? S.success : S.muted, margin: 0 }}>{totalValue > 0 ? fmt(totalValue) : "—"}</p>
            </div>
            {totalValue > 0 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: S.muted, fontSize: 11, margin: "0 0 2px" }}>Plus-value</p>
                <p style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 700, color: totalPlusValue >= 0 ? S.success : S.danger, margin: 0 }}>{totalPlusValue >= 0 ? "+" : ""}{fmt(totalPlusValue)}</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 90px", gap: 8, padding: "0 4px" }}>
            <span style={{ color: S.muted, fontSize: 11, fontWeight: 600 }}>Ligne</span>
            <span style={{ color: S.muted, fontSize: 11, fontWeight: 600, textAlign: "right" }}>Investi</span>
            <span style={{ color: S.muted, fontSize: 11, fontWeight: 600, textAlign: "right" }}>Valeur actuelle</span>
            <span style={{ color: S.muted, fontSize: 11, fontWeight: 600, textAlign: "right" }}>+/-</span>
          </div>
          {portVals.map(p => {
            const pv = p.value;
            const diff = pv - p.invested;
            const hasPv = pv > 0;
            return (
              <div key={p.key as string} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 90px", gap: 8, alignItems: "center", padding: "8px 12px", background: S.surface2, borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: p.invested > 0 ? S.text : S.muted }}>{p.label}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <EditableAmt value={p.invested} onChange={v => onSavingsChange(m.month_key, { [p.key]: v } as unknown as Partial<Savings>)} color={p.color} size="sm" />
                </div>
                <div style={{ textAlign: "right" }}>
                  <EditableAmt value={pv} onChange={v => onPortfolioValuesChange(m.month_key, { [p.key as string]: v })} color={hasPv ? S.success : S.muted} size="sm" />
                </div>
                <div style={{ textAlign: "right", fontFamily: S.heading, fontSize: 14, fontWeight: 700, color: hasPv ? (diff >= 0 ? S.success : S.danger) : S.muted }}>
                  {hasPv ? `${diff >= 0 ? "+" : ""}${fmt(diff)}` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Portfolio chart */}
      <Card>
        <SLabel>Evolution du portefeuille par mois</SLabel>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={portfolioChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 12, fontFamily: S.font }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine y={0} stroke={S.muted} strokeDasharray="3 3" strokeWidth={1} />
            <Bar dataKey="Investis" fill={`${S.primary}70`} radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="Valeur" fill={`${S.success}70`} radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Line type="monotone" dataKey="Plus-value" stroke={S.accent} strokeWidth={2.5} dot={{ fill: S.accent, r: 4, strokeWidth: 0 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 20, marginTop: 12, justifyContent: "center" }}>
          {[{ c: `${S.primary}70`, l: "Investissements effectues" }, { c: `${S.success}70`, l: "Valeur du portefeuille" }, { c: S.accent, l: "Plus-value" }].map(({ c, l }) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, background: c, borderRadius: 3 }} /><span style={{ color: S.muted, fontSize: 12 }}>{l}</span></div>
          ))}
        </div>
        <p style={{ color: S.muted, fontSize: 11, textAlign: "center", margin: "8px 0 0" }}>Entrez la valeur actuelle du portefeuille dans le tableau ci-dessus pour voir la courbe</p>
      </Card>

      {/* Savings chart */}
      <Card>
        <SLabel>Economies mensuelles</SLabel>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={savingsChart}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: S.muted, fontSize: 10, fontFamily: S.font }} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<ChartTip />} />
            <Bar dataKey="Objectif" fill="rgba(255,255,255,0.1)" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="Realise" fill={S.success} radius={[3, 3, 0, 0]} maxBarSize={18} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Monthly table */}
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
                  <tr key={mo.month_key} className="row-h" style={{ borderBottom: `1px solid ${S.border}`, background: isCur ? `${S.accent}08` : "transparent" }}>
                    <td style={{ padding: "9px 14px", fontFamily: S.heading, fontSize: 17, color: isCur ? S.accent : S.text }}>{mo.month_name}{isCur ? " *" : ""}</td>
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


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
  RefreshCw, CheckCircle2, Euro, Pencil,
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
  savings: Savings; balance_end_of_month: number; notes: string;
}
interface ForecastMonth {
  month_key: string; month_name: string;
  income: number; expenses: number; savings_target: number;
  balance: number; alert_type: string;
}
interface Alert { month_key: string; month_name: string; projected_balance: number; alert_type: string; message: string; }
interface Forecast { months: ForecastMonth[]; alerts: Alert[]; total_income: number; total_expenses: number; total_savings: number; }

// ── Design system ─────────────────────────────────────────────────────────────
const S = {
  bg: "#0a0a0a", surface: "#111111", surface2: "#181818",
  border: "rgba(255,255,255,0.08)", borderLight: "rgba(255,255,255,0.14)",
  primary: "#2563EB", accent: "#F97316",
  success: "#22c55e", danger: "#ef4444", warning: "#f59e0b",
  text: "#f1f5f9", muted: "#64748b",
  font: "Quicksand,sans-serif", heading: "Caveat,cursive",
};

const ICONS: Record<string, React.ElementType> = {
  Home, Shield, TrendingUp, Wifi, Tv, Smartphone, CreditCard, ShoppingBag,
  ShoppingCart, Car, Train, Zap, Gift, Plane, Briefcase, Bot, Activity,
  PiggyBank, BarChart2, Bitcoin, UtensilsCrossed,
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

// ── Shared components ─────────────────────────────────────────────────────────
function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={className} style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 20, ...style }}>
      {children}
    </div>
  );
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

  function start(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(value.toFixed(2));
    setEditing(true);
    setTimeout(() => { ref.current?.focus(); ref.current?.select(); }, 30);
  }
  function commit() {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0) onChange(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        style={{ width: size === "lg" ? 130 : 80, background: S.surface2, border: `1.5px solid ${col}`, borderRadius: 8, padding: "2px 8px", color: S.text, fontFamily: S.heading, fontSize: fs, fontWeight: 700, outline: "none" }}
      />
    );
  }
  return (
    <span
      onClick={start}
      title="Cliquer pour modifier"
      style={{ cursor: "pointer", fontFamily: S.heading, fontSize: fs, fontWeight: 700, color: col, lineHeight: 1.1, display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      {fmt(value)}
      <Pencil size={fs * 0.45} style={{ opacity: 0.3, marginBottom: 1 }} />
    </span>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function BudgetApp() {
  const [tab, setTab] = useState<"dashboard" | "depenses" | "projection" | "economies">("dashboard");
  const [months, setMonths] = useState<Month[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok?: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mr, fr] = await Promise.all([fetch("/api/budget/months"), fetch("/api/budget/forecast")]);
      const md = await mr.json();
      const fd = await fr.json();
      const mths: Month[] = md.months || [];
      setMonths(mths);
      setForecast(fd);
      const mi = new Date().getMonth();
      setIdx(Math.min(mi, mths.length - 1));
    } catch { showToast("Erreur de chargement", false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function patchExpense(mk: string, label: string, updates: Partial<Expense>) {
    setSaving(label);
    try {
      const r = await fetch(`/api/budget/month/${mk}/expense`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, ...updates }),
      });
      const d = await r.json();
      if (d.success) {
        setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, expenses: m.expenses.map(e => e.label === label ? { ...e, ...updates } : e) }));
        if (updates.validated !== undefined) showToast(updates.validated ? `✓ ${label} validée` : `${label} dévalidée`);
        else if (updates.amount !== undefined) showToast(`Montant mis à jour`);
        fetch("/api/budget/forecast").then(r => r.json()).then(setForecast);
      }
    } catch { showToast("Erreur", false); }
    finally { setSaving(null); }
  }

  async function patchIncome(mk: string, field: "income_salary" | "income_other", value: number) {
    setSaving("income");
    try {
      const body: Record<string, number> = {}; body[field] = value;
      const r = await fetch(`/api/budget/month/${mk}/income`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, [field]: value }));
        showToast("Revenu mis à jour");
        fetch("/api/budget/forecast").then(r => r.json()).then(setForecast);
      }
    } catch { showToast("Erreur", false); }
    finally { setSaving(null); }
  }

  async function patchSavings(mk: string, updates: Partial<Savings>) {
    try {
      const r = await fetch(`/api/budget/month/${mk}/savings`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates),
      });
      const d = await r.json();
      if (d.success) {
        setMonths(prev => prev.map(m => m.month_key !== mk ? m : { ...m, savings: { ...m.savings, ...updates } }));
        showToast("Épargne mise à jour");
      }
    } catch { showToast("Erreur", false); }
  }

  const m = months[idx];
  const totalExp = m ? m.expenses.reduce((s, e) => s + e.amount, 0) : 0;
  const netBal = m ? m.income_salary + m.income_other - totalExp - (m.savings?.target_monthly ?? 140) : 0;
  const validatedCnt = m ? m.expenses.filter(e => e.validated).length : 0;

  const TABS = [
    { id: "dashboard", label: "Tableau de bord" },
    { id: "depenses", label: "Dépenses" },
    { id: "projection", label: "Projection 12 mois" },
    { id: "economies", label: "Économies" },
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
        .tab-btn:hover{color:#f1f5f9!important;background:rgba(255,255,255,0.04)!important}
        .card-h:hover{border-color:rgba(255,255,255,0.15)!important}
        .card-h{transition:border-color 0.2s,transform 0.15s}
        .row-h:hover{background:#1e1e1e!important}
        .row-h{transition:background 0.15s}
        .val-btn:hover{opacity:0.85!important}
        .val-btn{transition:all 0.2s}
        input:focus{outline:none!important}
        button{cursor:pointer}
        a{color:inherit;text-decoration:none}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.ok ? S.surface : "#2a1010", border: `1px solid ${toast.ok ? S.accent : S.danger}`, borderRadius: 12, padding: "10px 20px", fontFamily: S.font, fontSize: 14, animation: "toastIn 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.ok ? <Check size={14} color={S.success} /> : <AlertTriangle size={14} color={S.danger} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div>
          <h1 style={{ fontFamily: S.heading, fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1 }}>Budget 2026</h1>
          <p style={{ color: S.muted, fontSize: 11, margin: "2px 0 0" }}>Thibault &amp; Céline · {m ? `${validatedCnt}/${m.expenses.length} dépenses validées` : ""}</p>
        </div>
        {m && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={{ background: "transparent", border: `1px solid ${S.border}`, color: idx === 0 ? S.muted : S.text, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.4 : 1 }}>
              <ArrowLeft size={14} />
            </button>
            <div style={{ minWidth: 110, textAlign: "center" }}>
              <div style={{ fontFamily: S.heading, fontSize: 22, fontWeight: 700, color: S.accent, lineHeight: 1 }}>{m.month_name}</div>
              <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{m.year}</div>
            </div>
            <button onClick={() => setIdx(i => Math.min(months.length - 1, i + 1))} disabled={idx === months.length - 1} style={{ background: "transparent", border: `1px solid ${S.border}`, color: idx === months.length - 1 ? S.muted : S.text, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === months.length - 1 ? 0.4 : 1 }}>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
        <button onClick={loadData} title="Actualiser" style={{ background: "transparent", border: `1px solid ${S.border}`, color: S.muted, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RefreshCw size={13} />
        </button>
      </header>

      {/* ── Tab nav ─────────────────────────────────────────────────────────── */}
      <nav style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "0 20px", display: "flex", position: "sticky", top: 61, zIndex: 49, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)} style={{ background: "none", border: "none", padding: "13px 16px", color: tab === t.id ? S.accent : S.muted, fontFamily: S.font, fontWeight: 600, fontSize: 14, borderBottom: tab === t.id ? `2px solid ${S.accent}` : "2px solid transparent", whiteSpace: "nowrap", transition: "color 0.15s", borderRadius: "4px 4px 0 0" }}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main key={tab} style={{ padding: "24px", maxWidth: 1200, margin: "0 auto", animation: "fadeUp 0.25s ease" }}>
        {tab === "dashboard" && m && (
          <DashboardTab month={m} netBalance={netBal} totalExpenses={totalExp} validatedCount={validatedCnt}
            onIncomeChange={(f, v) => patchIncome(m.month_key, f, v)}
            onValidate={(l, v) => patchExpense(m.month_key, l, { validated: v })} saving={saving} />
        )}
        {tab === "depenses" && m && (
          <DepensesTab month={m}
            onValidate={(l, v) => patchExpense(m.month_key, l, { validated: v })}
            onAmountChange={(l, a) => patchExpense(m.month_key, l, { amount: a })}
            onIncomeChange={(f, v) => patchIncome(m.month_key, f, v)} saving={saving} />
        )}
        {tab === "projection" && forecast && <ProjectionTab forecast={forecast} />}
        {tab === "economies" && months.length > 0 && (
          <EconomiesTab months={months} currentIdx={idx}
            onSavingsChange={(mk, u) => patchSavings(mk, u)} />
        )}
      </main>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ month: m, netBalance, totalExpenses, validatedCount, onIncomeChange, onValidate, saving }: {
  month: Month; netBalance: number; totalExpenses: number; validatedCount: number;
  onIncomeChange: (f: "income_salary" | "income_other", v: number) => void;
  onValidate: (label: string, v: boolean) => void; saving: string | null;
}) {
  const income = m.income_salary + m.income_other;
  const savTarget = m.savings?.target_monthly ?? 140;
  const balColor = netBalance >= 0 ? S.success : S.danger;
  const fixed = m.expenses.filter(e => e.category === "fixed");
  const invest = m.expenses.filter(e => e.category === "investment");
  const variable = m.expenses.filter(e => e.category === "variable");
  const pending = m.expenses.filter(e => !e.validated);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {[
          { label: "Salaire du mois", value: m.income_salary, color: S.success, editable: true, field: "income_salary" as const, sub: m.income_other > 0 ? `+ ${fmt(m.income_other)} autres` : undefined },
          { label: "Total dépenses", value: totalExpenses, color: S.danger, editable: false, sub: `${validatedCount}/${m.expenses.length} validées` },
          { label: "Solde net", value: netBalance, color: balColor, editable: false, sub: "Après économies" },
          { label: "Objectif économies", value: savTarget, color: S.accent, editable: false, sub: `Cumul : ${fmt(m.savings?.cumulative_target ?? 0)}` },
        ].map(({ label, value, color, editable, field, sub }) => (
          <Card key={label} className="card-h" style={{ background: `linear-gradient(135deg, ${color}14, ${S.bg})`, borderColor: `${color}28` }}>
            <SLabel>{label}</SLabel>
            {editable && field ? (
              <EditableAmt value={value} onChange={v => onIncomeChange(field, v)} color={color} size="lg" />
            ) : (
              <p style={{ fontFamily: S.heading, fontSize: 30, fontWeight: 700, color, margin: 0 }}>{fmt(value)}</p>
            )}
            {sub && <p style={{ color: S.muted, fontSize: 12, margin: "6px 0 0", fontFamily: S.font }}>{sub}</p>}
          </Card>
        ))}
      </div>

      {/* Validation progress */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SLabel>Validation des dépenses</SLabel>
          <span style={{ color: validatedCount === m.expenses.length ? S.success : S.muted, fontSize: 13, fontWeight: 700 }}>
            {validatedCount === m.expenses.length ? "✓ Tout validé !" : `${validatedCount} / ${m.expenses.length}`}
          </span>
        </div>
        <div style={{ background: S.surface2, borderRadius: 999, height: 10, overflow: "hidden" }}>
          <div style={{ background: `linear-gradient(90deg, ${S.success}, ${S.accent})`, height: "100%", width: `${m.expenses.length > 0 ? (validatedCount / m.expenses.length) * 100 : 0}%`, borderRadius: 999, transition: "width 0.6s ease" }} />
        </div>
      </Card>

      {/* Category breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Dépenses fixes", items: fixed, color: S.primary },
          { label: "Investissements", items: invest, color: S.accent },
          { label: "Dépenses variables", items: variable, color: S.warning },
        ].map(({ label, items, color }) => {
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

      {/* Budget allocations */}
      <Card>
        <SLabel>Budget reste à vivre par enveloppe</SLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
          {[
            ["courses", "Courses"], ["restaurants", "Restaurants"], ["services", "Services"],
            ["revolut", "Revolut"], ["amex", "Amex"], ["cera", "CERA"],
          ].map(([key, label]) => {
            const val = (m.budget_allocation as Record<string, number>)[key] ?? 0;
            return (
              <div key={key} style={{ background: S.surface2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${S.border}` }}>
                <p style={{ color: S.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 4px" }}>{label}</p>
                <p style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 700, color: S.text, margin: 0 }}>{fmt(val)}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Pending expenses */}
      {pending.length > 0 && (
        <Card>
          <SLabel>À valider ce mois ({pending.length})</SLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pending.slice(0, 8).map(e => {
              const Ico = (e.icon && ICONS[e.icon]) ? ICONS[e.icon] : CreditCard;
              return (
                <div key={e.label} className="row-h" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: S.surface2, borderRadius: 10 }}>
                  <Ico size={14} color={S.muted} />
                  <span style={{ flex: 1, fontSize: 13, color: S.muted }}>{e.label}</span>
                  <span style={{ fontFamily: S.heading, fontSize: 16, fontWeight: 700, color: S.text }}>{fmt(e.amount)}</span>
                  <button className="val-btn" onClick={() => onValidate(e.label, true)} disabled={saving === e.label} style={{ background: S.success, color: "#fff", border: "none", borderRadius: 7, padding: "4px 12px", fontSize: 12, fontFamily: S.font, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, opacity: saving === e.label ? 0.5 : 1 }}>
                    <Check size={11} /> Valider
                  </button>
                </div>
              );
            })}
            {pending.length > 8 && <p style={{ color: S.muted, fontSize: 12, textAlign: "center", margin: "4px 0 0" }}>+ {pending.length - 8} autres → onglet Dépenses</p>}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Dépenses Tab ──────────────────────────────────────────────────────────────
function DepensesTab({ month: m, onValidate, onAmountChange, onIncomeChange, saving }: {
  month: Month;
  onValidate: (label: string, v: boolean) => void;
  onAmountChange: (label: string, amount: number) => void;
  onIncomeChange: (f: "income_salary" | "income_other", v: number) => void;
  saving: string | null;
}) {
  const fixed = m.expenses.filter(e => e.category === "fixed");
  const invest = m.expenses.filter(e => e.category === "investment");
  const variable = m.expenses.filter(e => e.category === "variable");

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
          title={e.validated ? "Dévalider" : "Valider"}>
          {isSav ? <div style={{ width: 10, height: 10, border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <Check size={12} />}
        </button>
      </div>
    );
  }

  function ColCard({ title, items, color }: { title: string; items: Expense[]; color: string }) {
    const total = items.reduce((s, e) => s + e.amount, 0);
    return (
      <Card>
        <SLabel>{title}</SLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(e => <ExpRow key={e.label} e={e} color={color} />)}
        </div>
        <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: S.muted, fontSize: 12 }}>Total</span>
          <span style={{ fontFamily: S.heading, fontSize: 20, color, fontWeight: 700 }}>{fmt(total)}</span>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Income */}
      <Card style={{ borderColor: `${S.success}30`, background: `linear-gradient(135deg, ${S.success}10, ${S.bg})` }}>
        <SLabel>Revenus du mois</SLabel>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" as const, alignItems: "center" }}>
          <div>
            <p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Salaire principal</p>
            <EditableAmt value={m.income_salary} onChange={v => onIncomeChange("income_salary", v)} color={S.success} size="lg" />
          </div>
          <div>
            <p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Autres revenus</p>
            <EditableAmt value={m.income_other} onChange={v => onIncomeChange("income_other", v)} color={S.muted} size="lg" />
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Total mensuel</p>
            <p style={{ fontFamily: S.heading, fontSize: 26, fontWeight: 700, color: S.success, margin: 0 }}>{fmt(m.income_salary + m.income_other)}</p>
          </div>
        </div>
      </Card>

      {/* Fixed + Investment */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ColCard title="Dépenses fixes" items={fixed} color={S.primary} />
        <ColCard title="Investissements & épargne" items={invest} color={S.accent} />
      </div>

      {/* Variable */}
      <Card>
        <SLabel>Dépenses variables</SLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
          {variable.map(e => <ExpRow key={e.label} e={e} color={S.warning} />)}
        </div>
        <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 12, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: S.muted, fontSize: 12 }}>Total variables</span>
          <span style={{ fontFamily: S.heading, fontSize: 20, color: S.warning, fontWeight: 700 }}>{fmt(variable.reduce((s, e) => s + e.amount, 0))}</span>
        </div>
      </Card>

      {/* Budget envelopes */}
      <Card>
        <SLabel>Budgets par enveloppe</SLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {Object.entries(m.budget_allocation).map(([key, val]) => (
            <div key={key} style={{ background: S.surface2, borderRadius: 10, padding: "12px 14px", border: `1px solid ${S.border}` }}>
              <p style={{ color: S.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 6px" }}>{key}</p>
              <p style={{ fontFamily: S.heading, fontSize: 20, fontWeight: 700, color: S.text, margin: 0 }}>{fmt(val as number)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Projection Tab ─────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1c1c1c", border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px 14px", fontFamily: S.font }}>
      <p style={{ fontFamily: S.heading, fontSize: 20, color: S.accent, margin: "0 0 8px" }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color, fontSize: 13, margin: "2px 0" }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

function ProjectionTab({ forecast: f }: { forecast: Forecast }) {
  const data = f.months.map(m => ({
    name: m.month_name.slice(0, 3),
    "Revenu": m.income,
    "Dépenses": m.expenses,
    "Solde": m.balance,
    alert: m.alert_type,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
        {[
          { l: "Revenu annuel", v: f.total_income, c: S.success },
          { l: "Dépenses totales", v: f.total_expenses, c: S.danger },
          { l: "Balance nette", v: f.total_income - f.total_expenses - f.total_savings, c: (f.total_income - f.total_expenses) > 0 ? S.primary : S.danger },
        ].map(({ l, v, c }) => (
          <Card key={l} className="card-h">
            <SLabel>{l}</SLabel>
            <p style={{ fontFamily: S.heading, fontSize: 30, fontWeight: 700, color: c, margin: 0 }}>{fmt(v)}</p>
          </Card>
        ))}
        <Card className="card-h" style={{ borderColor: f.alerts?.length > 0 ? `${S.danger}40` : `${S.success}30` }}>
          <SLabel>Mois à risque</SLabel>
          <p style={{ fontFamily: S.heading, fontSize: 30, fontWeight: 700, color: f.alerts?.length > 0 ? S.danger : S.success, margin: 0 }}>
            {f.alerts?.length ?? 0} {(f.alerts?.length ?? 0) === 1 ? "mois" : "mois"}
          </p>
        </Card>
      </div>

      {/* Alerts */}
      {(f.alerts?.length ?? 0) > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {f.alerts.map(a => (
            <div key={a.month_key} style={{ background: a.alert_type === "danger" ? `${S.danger}12` : `${S.warning}12`, border: `1px solid ${a.alert_type === "danger" ? S.danger : S.warning}50`, borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <AlertTriangle size={18} color={a.alert_type === "danger" ? S.danger : S.warning} />
              <span style={{ fontFamily: S.heading, fontSize: 20, color: S.accent, flexShrink: 0 }}>{a.month_name}</span>
              <span style={{ fontSize: 13, color: S.text, flex: 1 }}>{a.message}</span>
              <span style={{ fontFamily: S.heading, fontSize: 20, color: a.alert_type === "danger" ? S.danger : S.warning, fontWeight: 700, flexShrink: 0 }}>{fmt(a.projected_balance)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <Card>
        <SLabel>Revenu vs Dépenses vs Solde — 12 mois</SLabel>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 12, fontFamily: S.font }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine y={0} stroke={S.muted} strokeDasharray="4 4" strokeWidth={1} />
            <Bar dataKey="Revenu" fill={`${S.success}65`} radius={[4, 4, 0, 0]} maxBarSize={26} />
            <Bar dataKey="Dépenses" fill={`${S.danger}65`} radius={[4, 4, 0, 0]} maxBarSize={26} />
            <Line type="monotone" dataKey="Solde" stroke={S.accent} strokeWidth={2.5} dot={{ fill: S.accent, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 20, marginTop: 12, justifyContent: "center" }}>
          {[{ c: `${S.success}65`, l: "Revenu" }, { c: `${S.danger}65`, l: "Dépenses" }, { c: S.accent, l: "Solde" }].map(({ c, l }) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, background: c, borderRadius: 3 }} />
              <span style={{ color: S.muted, fontSize: 12 }}>{l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Monthly table */}
      <Card>
        <SLabel>Détail mensuel</SLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: S.font, fontSize: 13 }}>
            <thead>
              <tr>
                {["Mois", "Revenu", "Dépenses", "Économies", "Solde", "Statut"].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: S.muted, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
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
                    <td style={{ padding: "9px 14px" }}>
                      <span style={{ background: `${ac}20`, color: ac, border: `1px solid ${ac}50`, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                        {mo.alert_type === "danger" ? "⚠ NÉGATIF" : mo.alert_type === "warning" ? "~ SERRÉ" : "✓ OK"}
                      </span>
                    </td>
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

// ── Économies Tab ─────────────────────────────────────────────────────────────
function EconomiesTab({ months, currentIdx, onSavingsChange }: {
  months: Month[]; currentIdx: number; onSavingsChange: (mk: string, u: Partial<Savings>) => void;
}) {
  const m = months[currentIdx];
  if (!m) return null;
  const sav = m.savings;
  const pct = sav.cumulative_target > 0 ? Math.min(100, Math.round((sav.cumulative_actual / sav.cumulative_target) * 100)) : 0;

  type PortItem = { key: keyof Savings; label: string; color: string };
  const portfolio: PortItem[] = [
    { key: "epargne_revolut", label: "Épargne Revolut", color: "#818cf8" },
    { key: "pea", label: "PEA", color: S.success },
    { key: "traderepublic", label: "TradeRepublic", color: "#a78bfa" },
    { key: "assurance_vie_conservateur", label: "Assurance Vie", color: S.primary },
    { key: "per", label: "PER", color: S.accent },
    { key: "livret_a", label: "Livret A", color: "#22d3ee" },
    { key: "bitstack", label: "Bitstack", color: "#f59e0b" },
    { key: "swissborg", label: "Swissborg", color: "#34d399" },
  ];

  const portVals = portfolio.map(p => ({ ...p, value: (sav[p.key] as number) ?? 0 })).filter(p => p.value > 0).sort((a, b) => b.value - a.value);
  const totalPort = portVals.reduce((s, p) => s + p.value, 0);

  const chartData = months.map(mo => ({
    name: mo.month_name.slice(0, 3),
    "Objectif": mo.savings.target_monthly,
    "Réalisé": mo.savings.actual_monthly,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero */}
      <Card style={{ background: `linear-gradient(135deg, ${S.accent}12, ${S.bg})`, borderColor: `${S.accent}30` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 16, marginBottom: 20 }}>
          <div>
            <SLabel>Cumul économies 2026</SLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <EditableAmt value={sav.cumulative_actual} onChange={v => onSavingsChange(m.month_key, { cumulative_actual: v })} color={S.accent} size="lg" />
              <span style={{ color: S.muted, fontSize: 14 }}>/ {fmt(sav.cumulative_target)} objectif</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: S.heading, fontSize: 42, fontWeight: 700, color: pct >= 100 ? S.success : S.accent, margin: 0, lineHeight: 1 }}>{pct}%</p>
            <p style={{ color: S.muted, fontSize: 12, margin: "4px 0 0" }}>atteint</p>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 14, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ background: `linear-gradient(90deg, ${S.success}, ${S.accent})`, height: "100%", width: `${pct}%`, borderRadius: 999, transition: "width 0.7s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: S.muted }}>
          <span>{fmt(sav.cumulative_actual)} épargnés</span>
          <span>Objectif annuel: {fmt(sav.cumulative_target)}</span>
        </div>
      </Card>

      {/* Monthly target */}
      <Card>
        <SLabel>Objectif mensuel &amp; réalisé</SLabel>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" as const, alignItems: "center" }}>
          <div>
            <p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Objectif mensuel</p>
            <EditableAmt value={sav.target_monthly} onChange={v => onSavingsChange(m.month_key, { target_monthly: v })} color={S.accent} size="lg" />
          </div>
          <div>
            <p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Réalisé ce mois</p>
            <EditableAmt value={sav.actual_monthly} onChange={v => onSavingsChange(m.month_key, { actual_monthly: v })} color={S.success} size="lg" />
          </div>
        </div>
      </Card>

      {/* Portfolio + chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <SLabel>Portefeuille total — {fmt(totalPort)}</SLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {portVals.map(p => {
              const pct2 = totalPort > 0 ? Math.round((p.value / totalPort) * 100) : 0;
              return (
                <div key={p.key as string}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: S.text }}>{p.label}</span>
                    <EditableAmt value={p.value} onChange={v => onSavingsChange(m.month_key, { [p.key]: v } as unknown as Partial<Savings>)} color={p.color} size="sm" />
                  </div>
                  <div style={{ background: S.surface2, borderRadius: 999, height: 5, overflow: "hidden" }}>
                    <div style={{ background: p.color, height: "100%", width: `${pct2}%`, borderRadius: 999, transition: "width 0.5s" }} />
                  </div>
                  <p style={{ color: S.muted, fontSize: 10, margin: "2px 0 0", textAlign: "right" }}>{pct2}%</p>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <SLabel>Économies mensuelles</SLabel>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: S.muted, fontSize: 10, fontFamily: S.font }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="Objectif" fill="rgba(255,255,255,0.1)" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="Réalisé" fill={S.success} radius={[3, 3, 0, 0]} maxBarSize={18} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Monthly table */}
      <Card>
        <SLabel>Récapitulatif mensuel</SLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: S.font, fontSize: 13 }}>
            <thead>
              <tr>
                {["Mois", "Objectif", "Réalisé", "Cumul obj.", "Cumul réel", "Écart"].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: S.muted, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map(mo => {
                const ecart = mo.savings.cumulative_actual - mo.savings.cumulative_target;
                const isCurrent = mo.month_key === m.month_key;
                return (
                  <tr key={mo.month_key} className="row-h" style={{ borderBottom: `1px solid ${S.border}`, background: isCurrent ? `${S.accent}08` : "transparent" }}>
                    <td style={{ padding: "9px 14px", fontFamily: S.heading, fontSize: 17, color: isCurrent ? S.accent : S.text }}>{mo.month_name}{isCurrent ? " ←" : ""}</td>
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


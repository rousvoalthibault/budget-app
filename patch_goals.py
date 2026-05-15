# -*- coding: utf-8 -*-
f = open('app/page.tsx', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# 1. Add savings goals state + API in EconomiesTab
# Find EconomiesTab and add state after the existing states
for i, line in enumerate(lines):
    if 'const xpPort = useExpand();' in line:
        # Add goals state after this line
        goals_state = '''  const [goals, setGoals] = useState<{id:string;name:string;target:number;current:number;target_date:string;color:string;validated_months:string[]}[]>([]);
  const [showGoalPopup, setShowGoalPopup] = useState(false);
  const [newGoal, setNewGoal] = useState({name:"",target:"",current:"",target_date:"",color:"#16a34a"});
  useEffect(() => { fetch("/api/budget/savings-goals", { headers: getAuthHeaders() }).then(r => r.json()).then(d => setGoals(d.goals || [])).catch(() => {}); }, []);
'''
        lines.insert(i + 1, goals_state)
        print(f'Goals state added at line {i+2}')
        break

# 2. Replace lines 1543-1565 (the old Objectifs editables block)
# After inserting lines above, the line numbers shifted. Find by content.
for i, line in enumerate(lines):
    if '{/* Objectifs editables */}' in line:
        start = i
        break

# Find the end of the block (the next {/* comment)
for i in range(start + 1, len(lines)):
    if '{/* Totaux portefeuille */}' in lines[i]:
        end = i
        break

print(f'Replacing lines {start+1} to {end}')

# Build the new goals block
new_block = '''      {/* Objectifs & Epargne */}
      <Card style={{ borderColor: `${S.primary}20` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, color: S.muted }}>Objectifs & \xc9pargne</div>
          <button onClick={() => setShowGoalPopup(true)} style={{ fontSize: 11, padding: "4px 10px", border: `1px solid ${S.border}`, borderRadius: 6, background: "transparent", color: S.muted, cursor: "pointer" }}>+ Ajouter</button>
        </div>
        {/* Monthly KPIs */}
        <div style={{ display: "flex", gap: 12, padding: 12, background: S.surface2, borderRadius: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 9, color: S.muted, textTransform: "uppercase" as const }}>Obj. / mois</div><div style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 800, color: S.accent }}>{fmt(sav.target_monthly + goals.reduce((s, g) => { const months = Math.max(1, Math.ceil((new Date(g.target_date + "-01").getTime() - Date.now()) / (30.44*24*60*60*1000))); return s + Math.round((g.target - g.current) / months); }, 0))}</div></div>
          <div style={{ width: 1, background: S.border }}></div>
          <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 9, color: S.muted, textTransform: "uppercase" as const }}>R\xe9alis\xe9</div><div style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 800, color: S.success }}>{fmt(sav.actual_monthly)}</div></div>
          <div style={{ width: 1, background: S.border }}></div>
          <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 9, color: S.muted, textTransform: "uppercase" as const }}>Annuel</div><div style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 800, color: S.primary }}>{fmt((sav.target_monthly + goals.reduce((s, g) => { const mo = Math.max(1, Math.ceil((new Date(g.target_date + "-01").getTime() - Date.now()) / (30.44*24*60*60*1000))); return s + Math.round((g.target - g.current) / mo); }, 0)) * 12)}</div></div>
          <div style={{ width: 1, background: S.border }}></div>
          <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 9, color: S.muted, textTransform: "uppercase" as const }}>Cumul</div><div style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 800, color: S.success }}>{fmt(sav.cumulative_actual + goals.reduce((s, g) => s + g.current, 0))}</div></div>
        </div>
        {/* Goal items with progress rings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {goals.map(g => {
            const pctG = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
            const circ = 2 * Math.PI * 22;
            const offset = circ - (pctG / 100) * circ;
            const monthsLeft = Math.max(1, Math.ceil((new Date(g.target_date + "-01").getTime() - Date.now()) / (30.44*24*60*60*1000)));
            const monthlyTarget = Math.round((g.target - g.current) / monthsLeft);
            const isValidated = g.validated_months?.includes(m.month_key);
            return (<div key={g.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: isValidated ? `${g.color}08` : S.surface2, borderRadius: 12, border: `1px solid ${isValidated ? g.color + "30" : S.border}` }}>
              <svg width={52} height={52} viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="none" stroke={S.surface2} strokeWidth={4}/><circle cx="26" cy="26" r="22" fill="none" stroke={g.color} strokeWidth={4} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 26 26)"/><text x="26" y="29" textAnchor="middle" fontSize="11" fontWeight="800" fill={g.color} fontFamily="Outfit">{pctG}%</text></svg>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{g.name}</div><div style={{ fontSize: 10, color: S.muted }}>{monthsLeft} mois restants</div><div style={{ fontSize: 11, marginTop: 2 }}><span style={{ color: g.color, fontWeight: 700 }}>{fmt(g.current)}</span> / {fmt(g.target)}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 9, color: S.muted, textTransform: "uppercase" as const }}>Obj./mois</div><div style={{ fontFamily: S.heading, fontSize: 15, fontWeight: 800, color: g.color }}>{fmt(monthlyTarget)}</div><button onClick={async () => { const mk = m.month_key; await fetch(`/api/budget/savings-goals/${g.id}`, { method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify(isValidated ? { unvalidate_month: mk } : { validate_month: mk, current: g.current + monthlyTarget }) }); const r = await fetch("/api/budget/savings-goals", { headers: getAuthHeaders() }); const d = await r.json(); setGoals(d.goals || []); }} style={{ marginTop: 4, width: 26, height: 26, borderRadius: 7, border: `1.5px solid ${isValidated ? g.color : S.muted}`, background: isValidated ? g.color : "transparent", color: isValidated ? "#fff" : S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginLeft: "auto", fontSize: 11 }}><Check size={12} /></button></div>
            </div>);
          })}
        </div>
      </Card>

      {/* Add goal popup */}
      {showGoalPopup && (<div onClick={() => setShowGoalPopup(false)} style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: S.surface, borderRadius: 14, width: 380, padding: 24, boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}>
          <div style={{ fontFamily: S.heading, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nouvel objectif</div>
          <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, fontWeight: 600, color: S.muted, display: "block", marginBottom: 4 }}>Nom</label><input value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} placeholder="Ex: Voyage au Japon" style={{ width: "100%", padding: "9px 12px", fontSize: 14, border: `1px solid ${S.border}`, borderRadius: 8, background: S.bg, color: S.text, outline: "none" }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: S.muted, display: "block", marginBottom: 4 }}>Cible (\u20ac)</label><input type="number" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})} placeholder="5000" style={{ width: "100%", padding: "9px 12px", fontSize: 14, border: `1px solid ${S.border}`, borderRadius: 8, background: S.bg, color: S.text, outline: "none" }} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: S.muted, display: "block", marginBottom: 4 }}>D\xe9j\xe0 \xe9pargn\xe9 (\u20ac)</label><input type="number" value={newGoal.current} onChange={e => setNewGoal({...newGoal, current: e.target.value})} placeholder="0" style={{ width: "100%", padding: "9px 12px", fontSize: 14, border: `1px solid ${S.border}`, borderRadius: 8, background: S.bg, color: S.text, outline: "none" }} /></div>
          </div>
          <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, fontWeight: 600, color: S.muted, display: "block", marginBottom: 4 }}>Date cible</label><input type="month" value={newGoal.target_date} onChange={e => setNewGoal({...newGoal, target_date: e.target.value})} style={{ width: "100%", padding: "9px 12px", fontSize: 14, border: `1px solid ${S.border}`, borderRadius: 8, background: S.bg, color: S.text, outline: "none" }} /></div>
          <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontWeight: 600, color: S.muted, display: "block", marginBottom: 4 }}>Couleur</label><div style={{ display: "flex", gap: 6 }}>{["#16a34a","#3b82f6","#f59e0b","#8b5cf6","#ec4899","#06b6d4"].map(cl => <div key={cl} onClick={() => setNewGoal({...newGoal, color: cl})} style={{ width: 28, height: 28, borderRadius: 6, background: cl, cursor: "pointer", border: newGoal.color === cl ? "2px solid " + cl : "2px solid transparent" }} />)}</div></div>
          {parseFloat(newGoal.target) > 0 && newGoal.target_date && <div style={{ background: `${S.success}10`, borderRadius: 8, padding: 10, marginBottom: 12 }}><div style={{ fontSize: 10, color: S.success, fontWeight: 600 }}>Aper\xe7u</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>Objectif mensuel : <span style={{ color: S.success, fontSize: 16 }}>{Math.round((parseFloat(newGoal.target) - parseFloat(newGoal.current || "0")) / Math.max(1, Math.ceil((new Date(newGoal.target_date + "-01").getTime() - Date.now()) / (30.44*24*60*60*1000))))} \u20ac/mois</span></div></div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowGoalPopup(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.muted, cursor: "pointer", fontSize: 13 }}>Annuler</button>
            <button onClick={async () => { const r = await fetch("/api/budget/savings-goals", { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ name: newGoal.name, target: parseFloat(newGoal.target) || 0, current: parseFloat(newGoal.current) || 0, target_date: newGoal.target_date, color: newGoal.color }) }); if (r.ok) { const gr = await fetch("/api/budget/savings-goals", { headers: getAuthHeaders() }); const gd = await gr.json(); setGoals(gd.goals || []); setShowGoalPopup(false); setNewGoal({name:"",target:"",current:"",target_date:"",color:"#16a34a"}); } }} style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: S.primary, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Cr\xe9er</button>
          </div>
        </div>
      </div>)}

'''

lines[start:end] = [new_block]
print(f'Replaced {end-start} lines with goals block')

f = open('app/page.tsx', 'w', encoding='utf-8')
f.writelines(lines)
f.close()
print('Done')


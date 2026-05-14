f = open('app/page.tsx', 'r')
c = f.read()
f.close()
orig = len(c)

# Find the header block
header_start = c.index('<header')
header_end = c.index('</header>') + len('</header>')
old_header = c[header_start:header_end]
print(f'Found header: {len(old_header)} chars')

# New Clean Split header matching the app's existing style (S.surface, S.border, S.accent, S.primary etc.)
new_header = '''<header style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "stretch", position: "sticky", top: 0, zIndex: 40 }}>
        {/* Brand */}
        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, borderRight: `1px solid ${S.border}` }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${S.primary}, ${S.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14, fontFamily: S.heading }}>B</div>
          <h1 style={{ fontFamily: S.heading, fontSize: 17, fontWeight: 800, color: S.text, margin: 0 }}>Budget Personnel</h1>
        </div>
        {/* Month navigation - center */}
        {m && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <button onClick={() => { if (idx === 0 && selectedYear > 2026) { const ny = selectedYear - 1; setSelectedYear(ny); setIdx(11); fetch(`/api/budget/months?year=${ny}`, { headers: getAuthHeaders() }).then(r => r.json()).then(md => setMonths(md.months || [])); } else { setIdx(i => Math.max(0, i - 1)); } }} disabled={idx === 0 && selectedYear <= 2026} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${S.border}`, background: S.bg, color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ArrowLeft size={13} /></button>
          <select
            value={`${selectedYear}-${String(idx + 1).padStart(2, "0")}`}
            onChange={(e) => { const [y, mo] = e.target.value.split("-").map(Number); setSelectedYear(y); setIdx(mo - 1); fetch(`/api/budget/months?year=${y}`, { headers: getAuthHeaders() }).then(r => r.json()).then(md => setMonths(md.months || [])); }}
            style={{ fontFamily: S.heading, fontSize: 14, fontWeight: 700, color: S.primary, background: `${S.accent}08`, border: `1px solid ${S.accent}30`, borderRadius: 8, padding: "7px 28px 7px 12px", cursor: "pointer", appearance: "none" as const, WebkitAppearance: "none" as const, textAlign: "center", outline: "none" }}>
            {YEARS.map(y => { const MN = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"]; return MN.map((mn, mi) => (<option key={`${y}-${mi}`} value={`${y}-${String(mi+1).padStart(2,"0")}`}>{mn} {y}</option>)); })}
          </select>
          <button onClick={() => { if (idx === months.length - 1 && selectedYear < 2036) { const ny = selectedYear + 1; setSelectedYear(ny); setIdx(0); fetch(`/api/budget/months?year=${ny}`, { headers: getAuthHeaders() }).then(r => r.json()).then(md => setMonths(md.months || [])); } else { setIdx(i => Math.min(months.length - 1, i + 1)); } }} disabled={idx === months.length - 1 && selectedYear >= 2036} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${S.border}`, background: S.bg, color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ArrowRight size={13} /></button>
          <span style={{ fontSize: 10, color: S.muted, fontWeight: 600 }}>{validatedCnt}/{totalItems} valides</span>
        </div>}
        {/* Tools */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 14px", borderLeft: `1px solid ${S.border}` }}>
          <button onClick={() => setNeedsOnboarding(true)} title="Aide" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${S.border}`, background: S.bg, color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>?</button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAlerts(!showAlerts)} title="Alertes" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${showAlerts ? S.accent : S.border}`, background: showAlerts ? `${S.accent}10` : S.bg, color: inAppAlerts.length > 0 ? S.danger : S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Bell size={13} />
              {inAppAlerts.length > 0 && <span style={{ position: "absolute", top: -3, right: -3, width: 14, height: 14, borderRadius: "50%", background: S.danger, color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${S.surface}` }}>{inAppAlerts.length}</span>}
            </button>
            {showAlerts && <div style={{ position: "absolute", top: 38, right: 0, width: 300, maxHeight: 380, overflowY: "auto", background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 100, padding: 8 }}>
              <div style={{ padding: "8px 10px 6px", fontFamily: S.heading, fontSize: 13, fontWeight: 700, borderBottom: `1px solid ${S.border}`, marginBottom: 4 }}>Alertes ({inAppAlerts.length})</div>
              {inAppAlerts.length === 0 && <div style={{ padding: "16px 10px", textAlign: "center", color: S.muted, fontSize: 12 }}>Aucune alerte</div>}
              {inAppAlerts.map((a, i) => (<div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "7px 10px", borderRadius: 8, marginBottom: 2, background: a.type === "danger" ? `${S.danger}08` : a.type === "warning" ? `${S.warning}08` : "transparent" }}><AlertTriangle size={13} style={{ marginTop: 2, flexShrink: 0 }} color={a.type === "danger" ? S.danger : a.type === "warning" ? S.warning : S.accent} /><div><div style={{ fontSize: 11, fontWeight: 600, color: a.type === "danger" ? S.danger : a.type === "warning" ? S.warning : S.text }}>{a.title}</div><div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>{a.detail}</div></div></div>))}
            </div>}
          </div>
          <button onClick={logout} title="Deconnexion" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${S.border}`, background: S.bg, color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg></button>
          <button onClick={loadData} title="Actualiser" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${S.border}`, background: S.bg, color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><RefreshCw size={12} /></button>
        </div>
      </header>'''

c = c[:header_start] + new_header + c[header_end:]

if len(c) < orig * 0.8:
    print('ERROR'); import sys; sys.exit(1)
f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print(f'Header replaced ({len(c)} bytes)')


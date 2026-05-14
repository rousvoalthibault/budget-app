f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# Replace the simple investment display in Epargne with full CRUD like Depenses
# The current simple block shows read-only items
old_invest_block = '''      {/* Investissements mensuels */}
      <Card style={{ borderColor: `${S.accent}25` }}>
        <SLabel>Investissements & \xe9pargne mensuels</SLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
          {m.expenses.filter(e => e.category === "investment").map(e => (
            <div key={e.label} className="row-h" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: S.surface2, borderRadius: 10, border: `1px solid ${S.border}` }}>
              <TrendingUp size={14} color={S.accent} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{e.label}</span>
              <span style={{ fontFamily: S.heading, fontSize: 14, fontWeight: 700, color: S.accent }}>{fmt(e.amount)}</span>
            </div>
          ))}
        </div>
        {m.expenses.filter(e => e.category === "investment").length > 0 && (
          <div style={{ marginTop: 8, textAlign: "right", fontFamily: S.heading, fontSize: 15, fontWeight: 700, color: S.accent }}>
            Total: {fmt(m.expenses.filter(e => e.category === "investment").reduce((s, e) => s + e.amount, 0))}
          </div>
        )}
      </Card>'''

new_invest_block = '''      {/* Investissements mensuels - full CRUD */}
      <Card style={{ borderColor: `${S.accent}25` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SLabel>Investissements & \xe9pargne mensuels</SLabel>
          <span style={{ fontFamily: S.heading, fontSize: 15, fontWeight: 700, color: S.accent }}>{fmt(m.expenses.filter(e => e.category === "investment").reduce((s, e) => s + e.amount, 0))}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
          {m.expenses.filter(e => e.category === "investment").map(e => (
            <div key={e.label} className="row-h" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: e.validated ? `${S.accent}12` : S.surface2, borderRadius: 10, border: `1px solid ${e.validated ? S.accent + "40" : S.border}`, transition: "all 0.2s" }}>
              <TrendingUp size={14} color={e.validated ? S.accent : S.muted} />
              <span style={{ flex: 1, fontSize: 13, color: e.validated ? S.text : S.muted, fontWeight: 600 }}>{e.label}</span>
              <EditableAmt value={e.amount} onChange={v => onSavingsChange(m.month_key, {} as Partial<Savings>)} color={S.accent} size="sm" />
              <button className="val-btn" onClick={() => { fetch(`/api/budget/month/${m.month_key}/expense`, { method: "PATCH", headers: { "Content-Type": "application/json", ...(() => { const t = typeof window !== "undefined" ? localStorage.getItem("budget_token") : null; return t ? { "x-user-token": t } : {}; })() }, body: JSON.stringify({ label: e.label, validated: !e.validated }) }); }} style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${e.validated ? S.accent : S.muted}`, background: e.validated ? S.accent : "transparent", color: e.validated ? "#fff" : S.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }} title={e.validated ? "Devalider" : "Valider"}><Check size={12} /></button>
            </div>
          ))}
        </div>
      </Card>'''

if old_invest_block in c:
    c = c.replace(old_invest_block, new_invest_block)
    print('Investment CRUD block replaced')
else:
    print('WARNING: old invest block not found')
    # Debug
    if 'Investissements & ' in c:
        idx = c.index('Investissements & ')
        print('Found at:', idx)
        print(c[idx-100:idx+100])

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('Done')


f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# Add investment expenses section before Objectifs editables in EconomiesTab
old = '      {/* Objectifs editables */}'
new = '''      {/* Investissements mensuels */}
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
      </Card>

      {/* Objectifs editables */}'''

c = c.replace(old, new)

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('Investment section added to Epargne tab')


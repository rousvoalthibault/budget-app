f = open('app/page.tsx', 'r')
c = f.read()
f.close()
orig = len(c)

# Define income sources with colors for the bar
REV_COLORS = '{sal: "#16a34a", rente: "#3b82f6", epargne: "#8b5cf6", actions: "#f59e0b", virements: "#06b6d4", autres: "#94a3b8", ajuste: "#ec4899"}'

# Find and replace the revenue Card (lines 1025-1037)
old_card_start = '      <Card style={{ borderColor: `${S.success}30`, background: `linear-gradient(135deg, ${S.success}10, ${S.bg})` }>'
old_card_end = '      </Card>'

# Find the exact positions
start = c.index('<Card style={{ borderColor: `${S.success}30`')
end = c.index('</Card>', start) + len('</Card>')
old_block = c[start:end]

# New Option C design
new_block = '''<Card style={{ borderColor: `${S.success}25` }}>
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
          const items = [{k:"income_salary",l:"Salaire principal",v:sal,c:RC.sal},{k:"income_rente",l:"Rente",v:rente,c:RC.rente},{k:"income_epargne",l:"\xc9pargne",v:ep,c:RC.epargne},{k:"income_actions",l:"Actions",v:act,c:RC.actions},{k:"income_virements",l:"Virements",v:vir,c:RC.virements},{k:"income_other",l:"Autres revenus",v:aut,c:RC.autres},{k:"income_solde_ajuste",l:"Solde ajust\xe9",v:adj,c:RC.ajuste}];
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
      </Card>'''

c = c[:start] + new_block + c[end:]

if len(c) < orig * 0.8:
    print('ERROR'); import sys; sys.exit(1)
f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print(f'Revenue design replaced ({len(c)} bytes)')


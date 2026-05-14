f = open('app/page.tsx', 'r')
c = f.read()
f.close()
orig = len(c)

# Find the DashboardTab KPI section
# The KPIs are rendered as a grid of cards in DashboardTab
# Look for the KPI array definition
kpi_search = '{ label: "Revenus du mois"'
if kpi_search in c:
    # Find the full KPI block - from the grid definition to the closing
    kpi_start = c.index('const kpis = [')
    kpi_end = c.index('];', kpi_start) + 2
    old_kpis = c[kpi_start:kpi_end]
    print(f'Found KPIs: {len(old_kpis)} chars')
    
    # Find the KPI rendering (the grid map)
    grid_start = c.index('gridTemplateColumns: "repeat(auto-fill', kpi_end - 500)
    # Actually let's find the div that wraps the KPI cards
    # Search for the kpis.map or the grid rendering
    map_start = c.index('{kpis.map(')
    # Find the parent div
    parent_start = c.rfind('<div style={{', 0, map_start)
    parent_end = c.index('</div>', map_start) + 6
    old_grid = c[parent_start:parent_end]
    print(f'Found KPI grid: {len(old_grid)} chars')
    
    # Replace with Option B strip design
    new_strip = '''<div style={{ display: "flex", gap: 0, background: S.surface, borderRadius: 14, border: `1px solid ${S.border}`, overflow: "hidden" }}>
          {kpis.map((k, i) => (
            <div key={k.label} style={{ flex: 1, padding: "14px 16px", borderRight: i < kpis.length - 1 ? `1px solid ${S.border}` : "none", textAlign: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 13, color: k.color }}>{["\u20ac", "\u2193", "\u25ce", "\u2197", "\u2605"][i] || "\u25cf"}</div>
              <div style={{ fontSize: 10, color: S.muted, textTransform: "uppercase" as const, fontWeight: 600, letterSpacing: 0.5 }}>{k.label}</div>
              <div style={{ fontFamily: S.heading, fontSize: 20, fontWeight: 800, color: k.color, margin: "2px 0" }}>{fmt(k.value)}</div>
              {k.sub && <div style={{ fontSize: 10, color: S.muted }}>{k.sub}</div>}
            </div>
          ))}
        </div>'''
    
    c = c[:parent_start] + new_strip + c[parent_end:]
    print('KPI strip replaced')
else:
    print('SKIP: KPIs not found')

# Now replace the category breakdown
# Find the old category section
old_cat_label = 'Repartition par categorie'
if old_cat_label in c:
    cat_start = c.rfind('<Card', 0, c.index(old_cat_label))
    cat_end = c.index('</Card>', c.index(old_cat_label)) + 7
    old_cat = c[cat_start:cat_end]
    print(f'Found category block: {len(old_cat)} chars')
    
    new_cat = '''<Card>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, color: S.muted, letterSpacing: 1, marginBottom: 12 }}>R\xe9partition des d\xe9penses</div>
          {[{n:"Fixes",v:m.expenses.filter((e:Expense)=>e.category==="fixed").reduce((s:number,e:Expense)=>s+e.amount,0),c:S.primary},{n:"Variables",v:m.expenses.filter((e:Expense)=>e.category==="variable").reduce((s:number,e:Expense)=>s+e.amount,0),c:S.warning},{n:"Enveloppes",v:Object.values(m.budget_allocation as unknown as Record<string,number>).reduce((s:number,v:number)=>s+v,0),c:S.muted}].map(cat => {
            const total = m.expenses.filter((e:Expense)=>e.category!=="investment").reduce((s:number,e:Expense)=>s+e.amount,0) + Object.values(m.budget_allocation as unknown as Record<string,number>).reduce((s:number,v:number)=>s+v,0);
            const pct = total > 0 ? Math.round((cat.v / total) * 100) : 0;
            return (<div key={cat.n} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ width: 90, fontSize: 12, fontWeight: 600, color: S.muted }}>{cat.n}</span>
              <div style={{ flex: 1, height: 20, background: `${S.border}40`, borderRadius: 6, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: cat.c, borderRadius: 6, display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 10, fontWeight: 700, color: "#fff", transition: "width 0.3s" }}>{pct > 10 ? `${pct}%` : ""}</div></div>
              <span style={{ width: 80, textAlign: "right", fontSize: 13, fontWeight: 700, color: cat.c }}>{fmt(cat.v)}</span>
            </div>);
          })}
        </Card>'''
    
    c = c[:cat_start] + new_cat + c[cat_end:]
    print('Category bars replaced')
else:
    print('SKIP: Category section not found')

if len(c) < orig * 0.8:
    print('ERROR'); import sys; sys.exit(1)
f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print(f'Done ({len(c)} bytes)')


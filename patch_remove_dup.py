f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# Remove the old standalone Depenses variables Card (lines 1051-1066)
old_var_card = '''      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SLabel>Depenses variables</SLabel>
          <button onClick={() => addingTo === "variable" ? cancelAdd() : openAdd("variable")} style={{ background: addingTo === "variable" ? `${S.warning}30` : `${S.warning}20`, color: S.warning, border: `1px solid ${S.warning}40`, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }} title="Ajouter">
            {addingTo === "variable" ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
          {variable.map(e => <ExpRow key={e.label} e={e} color={S.warning} />)}
        </div>
        {addingTo === "variable" && <div style={{ marginTop: 8 }}>{addRowForm({ category: "variable", color: S.warning })}</div>}
        <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 12, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: S.muted, fontSize: 12 }}>Total ({variable.length} lignes)</span>
          <span style={{ fontFamily: S.heading, fontSize: 20, color: S.warning, fontWeight: 700 }}>{fmt(variable.reduce((s, e) => s + e.amount, 0))}</span>
        </div>
      </Card>'''

if old_var_card in c:
    c = c.replace(old_var_card, '')
    print('Old Variables Card removed')
else:
    print('WARNING: old Variables Card not found')

f = open('app/page.tsx', 'w')
f.write(c)
f.close()


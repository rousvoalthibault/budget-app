f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# Add Solde ajuste after Autres revenus
old = '>Autres revenus</p><EditableAmt value={m.income_other} onChange={v => onIncomeChange("income_other", v)} color={S.muted} size="sm" /></div>'
new = old + '\n          <div><p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Solde ajust\xc3\xa9</p><EditableAmt value={(m as unknown as Record<string,number>).income_solde_ajuste ?? 0} onChange={v => onIncomeChange("income_solde_ajuste" as "income_other", v)} color={S.muted} size="sm" /></div>'

c = c.replace(old, new)

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('Solde ajuste added')


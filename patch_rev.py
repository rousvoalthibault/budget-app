f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# Add Autres revenus + Solde ajuste after the Virements line
old = '          <div><p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Virements</p><EditableAmt value={(m as unknown as Record<string,number>).income_virements ?? 0} onChange={v => onIncomeChange("income_virements" as "income_other", v)} color={S.muted} size="sm" /></div>'
new = old + '\n          <div><p style={{ color: S.muted, fontSize: 12, margin: "0 0 4px" }}>Autres revenus</p><EditableAmt value={m.income_other} onChange={v => onIncomeChange("income_other", v)} color={S.muted} size="sm" /></div>'

c = c.replace(old, new)

# Also rename Total to Revenu total
c = c.replace('>Total</p>', '>Revenu total</p>', 1)

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('Autres revenus + Revenu total added')


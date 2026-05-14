f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# 1. Add onValidateExpense and onAddExpense props to EconomiesTab
old_econ_props = 'onSavingsChange: (mk: string, u: Partial<Savings>) => void;\n  onPortfolioValuesChange: (mk: string, u: Record<string, number>) => void;'
new_econ_props = 'onSavingsChange: (mk: string, u: Partial<Savings>) => void;\n  onPortfolioValuesChange: (mk: string, u: Record<string, number>) => void;\n  onValidateExpense?: (label: string, validated: boolean) => void;\n  onAddInvestment?: (label: string, amount: number) => void;'
c = c.replace(old_econ_props, new_econ_props)
print('1. Props added')

# 2. Destructure new props in component
old_destr = 'onSavingsChange, onPortfolioValuesChange }'
new_destr = 'onSavingsChange, onPortfolioValuesChange, onValidateExpense, onAddInvestment }'
c = c.replace(old_destr, new_destr, 1)
print('2. Destructured')

# 3. Pass props from main component
old_pass = 'onSavingsChange={(mk, u) => patchSavings(mk, u)}\n            onPortfolioValuesChange={(mk, u) => patchPortfolioValues(mk, u)}'
new_pass = 'onSavingsChange={(mk, u) => patchSavings(mk, u)}\n            onPortfolioValuesChange={(mk, u) => patchPortfolioValues(mk, u)}\n            onValidateExpense={(label, v) => patchExpense(months[idx].month_key, label, { validated: v })}\n            onAddInvestment={(label, amount) => addExpense(months[idx].month_key, label, amount, "investment")}'
c = c.replace(old_pass, new_pass)
print('3. Props passed')

# 4. Update the investment block to use validation + add
old_block_end = '''              {e.validated && <Check size={12} color={S.accent} />}
            </div>
          ))}
        </div>
      </Card>'''

new_block_end = '''              <button onClick={() => onValidateExpense && onValidateExpense(e.label, !e.validated)} style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${e.validated ? S.accent : S.muted}`, background: e.validated ? S.accent : "transparent", color: e.validated ? "#fff" : S.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}><Check size={12} /></button>
            </div>
          ))}
        </div>
        <button onClick={() => { const name = prompt("Nom de l\'investissement :"); if (name) { const amt = parseFloat(prompt("Montant mensuel :") || "0"); if (amt > 0 && onAddInvestment) onAddInvestment(name, amt); } }} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, border: `1px dashed ${S.border}`, borderRadius: 8, background: "transparent", color: S.muted, cursor: "pointer", width: "100%", justifyContent: "center" }}><Plus size={12} /> Ajouter un investissement</button>
      </Card>'''

c = c.replace(old_block_end, new_block_end)
print('4. Block updated with validate + add')

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('All done')


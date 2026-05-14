f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# In the main component, the totalExp calculation includes ALL expenses
# We need to exclude investment category from totalExp and add to savings
# Current: const totalExp = m ? m.expenses.reduce((s, e) => s + e.amount, 0) + validatedBudget : 0;
# New: exclude investment category

old_exp = 'm.expenses.reduce((s, e) => s + e.amount, 0)'
new_exp = 'm.expenses.filter(e => e.category !== "investment").reduce((s, e) => s + e.amount, 0)'

count = c.count(old_exp)
c = c.replace(old_exp, new_exp)
print(f'Replaced {count} occurrences of expense calculation')

# In HistoriqueTab, same fix
old_hist = 'm.expenses.reduce((s, e) => s + e.amount, 0)'
# Already replaced above with replace all

# Also in the prevCumul calculation for Projection
old_prev = 'mo.expenses.reduce((s, e) => s + e.amount, 0)'
new_prev = 'mo.expenses.filter(e => e.category !== "investment").reduce((s, e) => s + e.amount, 0)'
c = c.replace(old_prev, new_prev)
print('Projection prevCumul fixed')

# In Depenses tab income calculation
old_dep = 'month.expenses.reduce((s, e) => s + e.amount, 0)'
new_dep = 'month.expenses.filter(e => e.category !== "investment").reduce((s, e) => s + e.amount, 0)'
c = c.replace(old_dep, new_dep)

# Fix mi2 version too
old_mi2 = 'mi2.expenses.reduce((s, e) => s + e.amount, 0)'
new_mi2 = 'mi2.expenses.filter(e => e.category !== "investment").reduce((s, e) => s + e.amount, 0)'
c = c.replace(old_mi2, new_mi2)

# m2 version
old_m2 = 'm2.expenses.reduce((s2: number, e2: Expense) => s2 + e2.amount, 0)'
new_m2 = 'm2.expenses.filter((e2: Expense) => e2.category !== "investment").reduce((s2: number, e2: Expense) => s2 + e2.amount, 0)'
c = c.replace(old_m2, new_m2)

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('Investment exclusion done')


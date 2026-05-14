f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# 1. Dashboard KPI: add investment total to Objectif économies
old_kpi = '{ label: "Objectif \xe9conomies", value: m.savings?.target_monthly ?? 140, color: S.accent, sub: `Cumul: ${fmt(m.savings?.cumulative_target ?? 0)}` }'
new_kpi = '{ label: "Objectif \xe9conomies", value: (m.savings?.target_monthly ?? 140) + m.expenses.filter((e: Expense) => e.category === "investment").reduce((s: number, e: Expense) => s + e.amount, 0), color: S.accent, sub: `Cumul: ${fmt((m.savings?.cumulative_target ?? 0) + months.slice(0, idx + 1).reduce((s: number, mo: Month) => s + mo.expenses.filter((e: Expense) => e.category === "investment").reduce((s2: number, e2: Expense) => s2 + e2.amount, 0), 0))}` }'
c = c.replace(old_kpi, new_kpi)
print('1. Dashboard KPI updated')

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('Done')


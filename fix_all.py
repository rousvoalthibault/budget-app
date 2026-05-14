f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# 1. Remove non-functional ExpandBtn from salary and portfolio charts
c = c.replace(
    '<ExpandBtn onClick={() => {}} />\n        <SLabel>Evolution des salaires bruts',
    '<SLabel>Evolution des salaires bruts'
)
c = c.replace(
    '<ExpandBtn onClick={() => {}} />\n          <SLabel>Evolution portefeuille par mois',
    '<SLabel>Evolution portefeuille par mois'
)

# 2. Fix accent on Epargne in revenue inputs
c = c.replace(
    '>Epargne</p>',
    '>\xc9pargne</p>'
)

# 3. Clean up dashboard income sub text
c = c.replace(
    "sub: m.income_other > 0 ? `${fmt(m.income_salary)} + ${fmt(m.income_other)} autres` : undefined",
    "sub: undefined"
)

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('All fixes applied')


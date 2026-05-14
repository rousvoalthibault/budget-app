f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# 1. Remove Investissements from Dashboard category breakdown
# Change the categories array to exclude Investissements
old_cats = '{ label: "D\xe9penses fixes", items: fixed, color: S.primary }, { label: "Investissements", items: invest, color: S.accent }, { label: "Variables", items: variable, color: S.warning }'
new_cats = '{ label: "D\xe9penses fixes", items: fixed, color: S.primary }, { label: "Variables", items: variable, color: S.warning }'
c = c.replace(old_cats, new_cats)
print('1. Removed Investissements from Dashboard')

# 2. Remove the Investissements column from Depenses tab
old_invest_col = '        {ColCard({ title: "Investissements & epargne", items: invest, color: S.accent, catKey: "investment" })}'
c = c.replace(old_invest_col, '')
print('2. Removed Investissements column from Depenses')

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('Done')


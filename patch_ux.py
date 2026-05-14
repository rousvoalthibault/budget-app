f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# Put Variables next to Fixes in the same grid
old = '''      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {ColCard({ title: "D\xe9penses fixes", items: fixed, color: S.primary, catKey: "fixed" })}

      </div>'''

new = '''      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {ColCard({ title: "D\xe9penses fixes", items: fixed, color: S.primary, catKey: "fixed" })}
        {ColCard({ title: "D\xe9penses variables", items: variable, color: S.warning, catKey: "variable" })}
      </div>'''

if old in c:
    c = c.replace(old, new)
    print('1. Variables added next to Fixes')
else:
    print('WARNING: grid not found')

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('Done')


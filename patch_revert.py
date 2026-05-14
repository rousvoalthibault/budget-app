# -*- coding: utf-8 -*-
f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# 1. Revert mobile responsive inline changes
c = c.replace(
    'gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))"',
    'gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))"'
)
c = c.replace(
    'gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))"',
    'gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))"'
)
c = c.replace(
    'gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 20',
    'gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20'
)
c = c.replace(
    'gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>',
    'gridTemplateColumns: "1fr 1fr", gap: 16 }}>',
    1
)
c = c.replace(
    'padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 8',
    'padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between"'
)
c = c.replace(
    'padding: "16px", maxWidth: 1200',
    'padding: "24px", maxWidth: 1200'
)
print('1. Mobile inline styles reverted')

f = open('app/page.tsx', 'w')
f.write(c)
f.close()

# 2. Revert mobile CSS from globals.css
f = open('app/globals.css', 'r')
css = f.read()
f.close()
if '/* Mobile Responsive */' in css:
    idx = css.index('/* Mobile Responsive */')
    css = css[:idx].rstrip()
    f = open('app/globals.css', 'w')
    f.write(css + '\n')
    f.close()
    print('2. Mobile CSS removed from globals.css')

print('All reverts done')


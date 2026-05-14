f = open('app/page.tsx', 'r')
c = f.read()
f.close()
orig = len(c)

# 1. Add close (X) button to onboarding wizard
old_wizard = '            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>'
new_wizard = '            <button onClick={() => setNeedsOnboarding(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#999", lineHeight: 1 }}>x</button>\n            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>'
if old_wizard in c:
    c = c.replace(old_wizard, new_wizard, 1)
    print('1. Close button added to wizard')

# Also make the wizard Card have position:relative for the X
old_card = 'boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>'
new_card = 'boxShadow: "0 20px 60px rgba(0,0,0,0.15)", position: "relative" as const }}>'
if old_card in c:
    c = c.replace(old_card, new_card, 1)
    print('2. Wizard card positioned')

if len(c) < orig * 0.9:
    print('ERROR'); import sys; sys.exit(1)
f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print(f'Done ({len(c)} bytes)')


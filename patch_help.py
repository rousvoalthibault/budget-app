f = open('app/page.tsx', 'r')
c = f.read()
f.close()
orig = len(c)

# 1. Add help button (?) in header that triggers onboarding
# Find the alert bell button area and add before it
old_bell = '        <div style={{ position: "relative" }}>\n          <button onClick={() => setShowAlerts(!showAlerts)}'
new_bell = '        <button onClick={() => setNeedsOnboarding(true)} title="Aide / Onboarding" style={{ background: "transparent", border: `1px solid ${S.border}`, color: S.muted, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>?</button>\n        <div style={{ position: "relative" }}>\n          <button onClick={() => setShowAlerts(!showAlerts)}'
if old_bell in c:
    c = c.replace(old_bell, new_bell, 1)
    print('1. Help button added')
else:
    print('1. SKIP: bell pattern not found')

# Safety
if len(c) < orig * 0.9:
    print('ERROR: file shrank')
    import sys; sys.exit(1)

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print(f'Done ({len(c)} bytes)')


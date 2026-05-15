# -*- coding: utf-8 -*-
f = open('app/page.tsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# 1. Remove ? button from Progression validation
old_btn = '<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><SLabel>Progression validation</SLabel><button onClick={() => setShowSwipeTutorial(true)} style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${S.border}`, background: "transparent", color: S.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>?</button></div>'
c = c.replace(old_btn, '<SLabel>Progression validation</SLabel>')
print('1. Removed ? from Progression validation')

# 2. Find 'Valider ses depenses' title in SwipeValidator and add ? next to it
idx = c.index('function SwipeValidator')
valider_idx = c.index('Valider', idx)
context = c[valider_idx-50:valider_idx+100]
print(f'Context around Valider: {context[:120]}')

# Find the exact SLabel or title containing 'Valider'
# Search for the pattern
import re
match = re.search(r'<SLabel>([^<]*Valider[^<]*)</SLabel>', c[idx:])
if match:
    old_label = f'<SLabel>{match.group(1)}</SLabel>'
    new_label = f'<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><SLabel>{match.group(1)}</SLabel><button onClick={{() => setShowSwipeTutorial(true)}} style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${{S.border}}`, background: "transparent", color: S.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>?</button></div>'
    # But SwipeValidator doesn't have access to setShowSwipeTutorial...
    # It's defined in DashboardTab. Need to pass it as prop or move it.
    # Actually, the SwipeValidator is called from DashboardTab.
    # Let me just add the ? button BEFORE the SwipeValidator call in DashboardTab.
    print(f'Found label: {old_label}')
    print('NOTE: SwipeValidator doesnt have access to setShowSwipeTutorial')
    print('Will add ? button before SwipeValidator call instead')

# 3. Add ? button before SwipeValidator call in DashboardTab
old_swipe_call = '<SwipeValidator expenses={m.expenses}'
new_swipe_call = '<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ fontFamily: S.heading, fontSize: 14, fontWeight: 700 }}>Valider ses d\xe9penses</span><button onClick={() => setShowSwipeTutorial(true)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${S.border}`, background: "transparent", color: S.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>?</button></div>\n      <SwipeValidator expenses={m.expenses}'
c = c.replace(old_swipe_call, new_swipe_call, 1)
print('3. Added "Valider ses depenses" title with ? button before SwipeValidator')

f = open('app/page.tsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print('Done')


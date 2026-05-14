import sys
f = open('app/page.tsx', 'r')
c = f.read()
f.close()
original_len = len(c)

# 1. Wrap Projection ExpandBtn with a positioned div
old1 = '<ExpandBtn onClick={() => setExpandedChart(!expandedChart)} />\n          <SLabel>Projection 12 mois'
new1 = '<div style={{ position: "relative", display: "inline-block", float: "right" }}><ExpandBtn onClick={() => setExpandedChart(!expandedChart)} /></div>\n          <SLabel>Projection 12 mois'
if old1 in c:
    c = c.replace(old1, new1, 1)
    print('1. Projection expand wrapper added')
else:
    print('1. SKIP: Projection pattern not found')

# 2. Wrap Portfolio ExpandBtn
old2 = '<ExpandBtn onClick={xpPort.toggle} />\n          <SLabel>Evolution portefeuille par mois'
new2 = '<div style={{ position: "relative", display: "inline-block", float: "right" }}><ExpandBtn onClick={xpPort.toggle} /></div>\n          <SLabel>Evolution portefeuille par mois'
if old2 in c:
    c = c.replace(old2, new2, 1)
    print('2. Portfolio expand wrapper added')
else:
    print('2. SKIP: Portfolio pattern not found')

# 3. Delete button for investments in Epargne
old3 = '{e.validated && <Check size={12} color={S.accent} />}\n            </div>\n          ))}'
new3 = '{e.validated && <Check size={12} color={S.accent} />}\n              <button onClick={async () => { try { await fetch(`/api/budget/month/${m.month_key}/expense/${encodeURIComponent(e.label)}`, { method: "DELETE", headers: getAuthHeaders() }); window.location.reload(); } catch {} }} style={{ width: 20, height: 20, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", opacity: 0.5, display: "flex", alignItems: "center", justifyContent: "center" }} title="Supprimer"><Trash2 size={10} /></button>\n            </div>\n          ))}'
if old3 in c:
    c = c.replace(old3, new3, 1)
    print('3. Investment delete button added')
else:
    print('3. SKIP: Investment pattern not found')

# Safety check
if len(c) < original_len * 0.9:
    print('ERROR: file shrank too much, not writing')
    sys.exit(1)

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print(f'File: {len(c)} bytes (was {original_len})')


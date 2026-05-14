f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# 1. Fix Projection chart: wrap the chart Card with position relative
# The ExpandBtn at L1136 needs a parent with position relative
# Let's just modify the ExpandBtn to use a wrapper div instead
c = c.replace(
    '          <ExpandBtn onClick={() => setExpandedChart(!expandedChart)} />',
    ''
)
# Add a relative-positioned wrapper around the chart section
c = c.replace(
    '<SLabel>Projection 12 mois',
    '<div style={{ position: "relative" }}><ExpandBtn onClick={() => setExpandedChart(!expandedChart)} /></div>\n          <SLabel>Projection 12 mois'
)
print('1. Projection expand fixed')

# 2. Fix Portfolio chart expand
c = c.replace(
    '          <ExpandBtn onClick={xpPort.toggle} />',
    ''
)
c = c.replace(
    '<SLabel>Evolution portefeuille par mois',
    '<div style={{ position: "relative" }}><ExpandBtn onClick={xpPort.toggle} /></div>\n          <SLabel>Evolution portefeuille par mois'
)
print('2. Portfolio expand fixed')

# 3. Add delete button to each investment in Epargne tab
# Find the investment row and add a Trash2 button after the Check icon
old_invest_check = '''              {e.validated && <Check size={12} color={S.accent} />}
            </div>'''
new_invest_check = '''              {e.validated && <Check size={12} color={S.accent} />}
              <button onClick={async () => { try { await fetch(`/api/budget/month/${m.month_key}/expense/${encodeURIComponent(e.label)}`, { method: "DELETE", headers: getAuthHeaders() }); window.location.reload(); } catch {} }} style={{ width: 20, height: 20, border: "none", background: "transparent", color: S.muted, cursor: "pointer", opacity: 0.4, display: "flex", alignItems: "center", justifyContent: "center" }} title="Supprimer"><Trash2 size={10} /></button>
            </div>'''
c = c.replace(old_invest_check, new_invest_check, 1)
print('3. Delete button added to investments')

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('All final fixes applied')


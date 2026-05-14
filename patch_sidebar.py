f = open('app/page.tsx', 'r')
c = f.read()
f.close()
orig = len(c)

# 1. Add sidebar state + Menu icon import
c = c.replace(
    'RefreshCw, Pencil, Wallet, Plus, Trash2, X, Calendar, Bell, Maximize2,',
    'RefreshCw, Pencil, Wallet, Plus, Trash2, X, Calendar, Bell, Maximize2, Menu, LayoutDashboard, Receipt, LineChart, History, PiggyBank, Briefcase,'
)
print('1. Icons imported')

# 2. Add sidebarOpen state
c = c.replace(
    'const [tab, setTab] = useState',
    'const [sidebarOpen, setSidebarOpen] = useState(true);\n  const [tab, setTab] = useState'
)
print('2. Sidebar state added')

# 3. Define TABS with icons for the sidebar
old_tabs = '''  const TABS = [
    { id: "dashboard", label: "Tableau de bord" },
    { id: "depenses", label: "D\xe9penses" },
    { id: "projection", label: "Projection 12 mois" },
    { id: "historique", label: "Historique" },
    { id: "economies", label: "\xc9pargne" },
    { id: "salaires", label: "Salaires" },
  ] as const;'''

new_tabs = '''  const TABS = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "depenses", label: "D\xe9penses", icon: Receipt },
    { id: "projection", label: "Projection", icon: LineChart },
    { id: "historique", label: "Historique", icon: History },
    { id: "economies", label: "\xc9pargne", icon: PiggyBank },
    { id: "salaires", label: "Salaires", icon: Briefcase },
  ] as const;'''
c = c.replace(old_tabs, new_tabs)
print('3. TABS with icons')

# 4. Replace the horizontal tabs + main layout with sidebar layout
# Find the nav bar and replace with sidebar
old_nav = '''      {/* \u2500\u2500 Tabs \u2500'''
if old_nav in c:
    # Find the full nav block
    nav_start = c.index(old_nav)
    # Find where the tab buttons end (look for the closing nav tag area)
    # The nav renders TABS.map buttons. After that comes the main content
    # Let's find it by looking for the pattern
    pass

# Instead of trying to replace the nav, let's wrap the entire return in a flex layout
# Find the return statement's opening div
old_return_start = '<div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font }}>'
new_return_start = '<div style={{ display: "flex", minHeight: "100vh", background: S.bg, fontFamily: S.font }}>'
c = c.replace(old_return_start, new_return_start, 1)
print('4. Flex layout wrapper')

# 5. Replace the tab nav with a sidebar
old_tab_nav = '''      {/* \u2500\u2500 Tabs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <nav style={{ padding: "0 24px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 0, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "12px 18px", fontSize: 14, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? S.primary : S.muted, background: "transparent", border: "none", borderBottom: tab === t.id ? `2.5px solid ${S.primary}` : "2.5px solid transparent", cursor: "pointer", whiteSpace: "nowrap", fontFamily: S.font }}>{t.label}</button>
        ))}
      </nav>'''

new_sidebar_and_nav = '''      {/* \u2500\u2500 Sidebar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <aside style={{ width: sidebarOpen ? 220 : 56, minHeight: "100vh", background: S.surface, borderRight: `1px solid ${S.border}`, transition: "width 0.2s ease", flexShrink: 0, display: "flex", flexDirection: "column", padding: "12px 8px" }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", color: S.text, width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 16 }}><Menu size={20} /></button>
        {sidebarOpen && <div style={{ fontFamily: S.heading, fontSize: 16, fontWeight: 800, color: S.primary, padding: "0 8px", marginBottom: 20 }}>Budget TC</div>}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: sidebarOpen ? "10px 12px" : "10px 0", justifyContent: sidebarOpen ? "flex-start" : "center", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? S.primary : S.muted, background: active ? `${S.primary}10` : "transparent", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: S.font, transition: "all 0.15s", width: "100%" }}>
                <Icon size={18} />
                {sidebarOpen && <span>{t.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>
      <div style={{ flex: 1, overflow: "auto" }}>'''

if old_tab_nav in c:
    c = c.replace(old_tab_nav, new_sidebar_and_nav)
    print('5. Sidebar navigation replaced tabs')
else:
    print('5. SKIP: tab nav pattern not found')
    # Debug: find the nav
    if 'Tabs' in c:
        idx = c.index('Tabs')
        print('Found Tabs at:', idx, c[idx:idx+100])

# 6. Close the flex container div at the end of the component
# We opened a <div style={{ flex: 1, overflow: "auto" }}> in the sidebar
# We need to close it before the outer closing div
# Find the last </div> that closes the main container
old_end = '''    </div>
  );
}'''
new_end = '''    </div></div>
  );
}'''
# Only replace the LAST occurrence
last_idx = c.rfind(old_end)
if last_idx >= 0:
    c = c[:last_idx] + new_end + c[last_idx + len(old_end):]
    print('6. Closing div added')

# Safety check
if len(c) < orig * 0.9:
    print('ERROR: file shrank too much')
    import sys; sys.exit(1)

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print(f'Done ({len(c)} bytes, was {orig})')


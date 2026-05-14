f = open('app/page.tsx', 'r')
lines = f.readlines()
f.close()
orig_count = len(lines)

# Also add imports and state if not already there
content = ''.join(lines)
if 'Menu,' not in content:
    content = content.replace(
        'RefreshCw, Pencil, Wallet, Plus, Trash2, X, Calendar, Bell, Maximize2,',
        'RefreshCw, Pencil, Wallet, Plus, Trash2, X, Calendar, Bell, Maximize2, Menu, LayoutDashboard, Receipt, LineChart as LCIcon, History as HIcon, PiggyBank, Briefcase,'
    )
    lines = content.split('\n')
    lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]
    print('Icons imported')

# Add sidebar state if not there
content = ''.join(lines)
if 'sidebarOpen' not in content:
    content = content.replace(
        'const [tab, setTab] = useState',
        'const [sidebarOpen, setSidebarOpen] = useState(true);\n  const [tab, setTab] = useState'
    )
    lines = content.split('\n')
    lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]
    print('Sidebar state added')

# Add icons to TABS if not there
content = ''.join(lines)
if 'icon: ' not in content.split('TABS')[1][:500] if 'TABS' in content else True:
    content = content.replace(
        '{ id: "dashboard", label: "Tableau de bord" }',
        '{ id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard }'
    )
    content = content.replace(
        '{ id: "depenses", label: "D\xe9penses" }',
        '{ id: "depenses", label: "D\xe9penses", icon: Receipt }'
    )
    content = content.replace(
        '{ id: "projection", label: "Projection 12 mois" }',
        '{ id: "projection", label: "Projection", icon: LCIcon }'
    )
    content = content.replace(
        '{ id: "historique", label: "Historique" }',
        '{ id: "historique", label: "Historique", icon: HIcon }'
    )
    content = content.replace(
        '{ id: "economies", label: "\xc9pargne" }',
        '{ id: "economies", label: "\xc9pargne", icon: PiggyBank }'
    )
    content = content.replace(
        '{ id: "salaires", label: "Salaires" }',
        '{ id: "salaires", label: "Salaires", icon: Briefcase }'
    )
    lines = content.split('\n')
    lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]
    print('Icons added to TABS')

# Replace lines 538-545 (0-indexed: 537-544) with sidebar
sidebar_lines = '''      <aside style={{ width: sidebarOpen ? 220 : 60, minHeight: "100vh", background: S.surface, borderRight: `1px solid ${S.border}`, transition: "width 0.2s ease", flexShrink: 0, display: "flex", flexDirection: "column", padding: "12px 8px", position: "fixed", left: 0, top: 0, zIndex: 50 }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", color: S.text, width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 8 }}><Menu size={20} /></button>
        {sidebarOpen && <div style={{ fontFamily: S.heading, fontSize: 17, fontWeight: 800, color: S.primary, padding: "0 10px", marginBottom: 20 }}>Budget TC</div>}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {TABS.map(t => { const Icon = t.icon; const active = tab === t.id; return (<button key={t.id} onClick={() => setTab(t.id)} title={t.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: sidebarOpen ? "10px 12px" : "10px 0", justifyContent: sidebarOpen ? "flex-start" : "center", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? S.primary : S.muted, background: active ? `${S.primary}12` : "transparent", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: S.font, transition: "all 0.15s", width: "100%" }}><Icon size={18} />{sidebarOpen && <span>{t.label}</span>}</button>); })}
        </nav>
      </aside>
      <div style={{ marginLeft: sidebarOpen ? 220 : 60, transition: "margin-left 0.2s ease", flex: 1 }}>
'''

lines[537:545] = [sidebar_lines]
print('Sidebar replaced lines 538-545')

# Add flex to outer div
content2 = ''.join(lines)
content2 = content2.replace(
    'minHeight: "100vh", background: S.bg',
    'display: "flex", minHeight: "100vh", background: S.bg'
)

# Close the sidebar content div at the very end  
# Find the last </div> before the closing return
last_close = content2.rfind('    </div>\n  );\n}')
if last_close >= 0:
    content2 = content2[:last_close] + '    </div></div>\n  );\n}' + content2[last_close + len('    </div>\n  );\n}'):]
    print('Closing div added')

f = open('app/page.tsx', 'w')
f.write(content2)
f.close()
print(f'Done ({len(content2)} bytes)')


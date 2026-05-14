f = open('app/page.tsx', 'r')
c = f.read()
f.close()
orig = len(c)

# Replace the tab nav (lines 539-546) with sidebar
old_nav = '''      {/* \u2500\u2500 Tabs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <nav style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "0 20px", display: "flex", position: "sticky", top: 65, zIndex: 49, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)} style={{ background: "none", border: "none", padding: "13px 16px", color: tab === t.id ? S.accent : S.muted, fontFamily: S.font, fontWeight: 600, fontSize: 14, borderBottom: tab === t.id ? `2px solid ${S.accent}` : "2px solid transparent", whiteSpace: "nowrap", transition: "color 0.15s" }}>
            {t.label}
          </button>
        ))}
      </nav>'''

new_sidebar = '''      {/* \u2500\u2500 Sidebar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <aside style={{ width: sidebarOpen ? 220 : 60, minHeight: "100vh", background: S.surface, borderRight: `1px solid ${S.border}`, transition: "width 0.2s ease", flexShrink: 0, display: "flex", flexDirection: "column", padding: "12px 8px", position: "fixed", left: 0, top: 0, zIndex: 50 }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", color: S.text, width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 8 }}><Menu size={20} /></button>
        {sidebarOpen && <div style={{ fontFamily: S.heading, fontSize: 17, fontWeight: 800, color: S.primary, padding: "0 10px", marginBottom: 20 }}>Budget TC</div>}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} title={t.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: sidebarOpen ? "10px 12px" : "10px 0", justifyContent: sidebarOpen ? "flex-start" : "center", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? S.primary : S.muted, background: active ? `${S.primary}12` : "transparent", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: S.font, transition: "all 0.15s", width: "100%" }}>
                <Icon size={18} />
                {sidebarOpen && <span>{t.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>
      <div style={{ marginLeft: sidebarOpen ? 220 : 60, transition: "margin-left 0.2s ease", flex: 1 }}>'''

if old_nav in c:
    c = c.replace(old_nav, new_sidebar)
    print('Sidebar replaced tabs!')
else:
    print('SKIP: nav not found')

if len(c) < orig * 0.9:
    print('ERROR'); import sys; sys.exit(1)
f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print(f'Done ({len(c)} bytes)')


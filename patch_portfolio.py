f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# Add delete button to each portfolio item row (after the plus-value display)
old_pv = '''<div style={{ textAlign: "right", fontFamily: S.heading, fontSize: 13, fontWeight: 700, color: val > 0 ? (diff >= 0 ? S.success : S.danger) : S.muted }}>{val > 0 ? `${diff >= 0 ? "+" : ""}${fmt(diff)}` : "\u2014"}</div>
                      </div>'''
new_pv = '''<div style={{ textAlign: "right", fontFamily: S.heading, fontSize: 13, fontWeight: 700, color: val > 0 ? (diff >= 0 ? S.success : S.danger) : S.muted }}>{val > 0 ? `${diff >= 0 ? "+" : ""}${fmt(diff)}` : "\u2014"}</div>
                        <button onClick={() => { onSavingsChange(m.month_key, { [p.key]: undefined } as unknown as Partial<Savings>); }} style={{ width: 20, height: 20, border: "none", background: "transparent", color: S.muted, cursor: "pointer", opacity: 0.4, display: "flex", alignItems: "center", justifyContent: "center" }} title="Supprimer"><Trash2 size={10} /></button>
                      </div>'''
c = c.replace(old_pv, new_pv)

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('Portfolio CRUD patched')


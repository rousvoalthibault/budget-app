f = open('app/page.tsx', 'r')
c = f.read()
f.close()
orig = len(c)

# Add calculator popup state and component
# The EditableAmt component currently handles inline editing
# We'll modify it to open a calculator popup when clicked

# Add calcPopup state to the main component
c = c.replace(
    'const [showAlerts, setShowAlerts] = useState(false);',
    'const [showAlerts, setShowAlerts] = useState(false);\n  const [calcPopup, setCalcPopup] = useState<{ value: number; lines: string[]; onChange: (v: number) => void } | null>(null);'
)
print('1. Calculator state added')

# Add the calculator popup JSX right after the onboarding wizard
calc_popup = '''      {/* Calculator Popup */}
      {calcPopup && (
        <div onClick={() => setCalcPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: S.surface, borderRadius: 14, width: 320, padding: 20, boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}>
            <div style={{ fontFamily: S.heading, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Calculette</div>
            {calcPopup.lines.map((line, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {i > 0 && <span style={{ color: S.accent, fontWeight: 700, fontSize: 16 }}>+</span>}
                <input type="number" value={line} onChange={e => { const nl = [...calcPopup.lines]; nl[i] = e.target.value; setCalcPopup({ ...calcPopup, lines: nl }); }} style={{ flex: 1, padding: "8px 12px", fontSize: 15, border: `1px solid ${S.border}`, borderRadius: 8, background: S.bg, color: S.text, outline: "none", fontFamily: S.heading, fontWeight: 600, textAlign: "right" }} autoFocus={i === calcPopup.lines.length - 1} />
                {calcPopup.lines.length > 1 && <button onClick={() => { const nl = calcPopup.lines.filter((_, j) => j !== i); setCalcPopup({ ...calcPopup, lines: nl }); }} style={{ width: 24, height: 24, border: "none", background: "transparent", color: S.danger, cursor: "pointer", fontSize: 16 }}>x</button>}
              </div>
            ))}
            <button onClick={() => setCalcPopup({ ...calcPopup, lines: [...calcPopup.lines, ""] })} style={{ width: "100%", padding: "6px", fontSize: 12, border: `1px dashed ${S.border}`, borderRadius: 6, background: "transparent", color: S.muted, cursor: "pointer", marginTop: 4, marginBottom: 12 }}>+ Ajouter une ligne</button>
            <div style={{ borderTop: `2px solid ${S.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: S.heading, fontSize: 20, fontWeight: 800, color: S.accent }}>{calcPopup.lines.reduce((s, l) => s + (parseFloat(l) || 0), 0).toFixed(0)} EUR</span>
              <button onClick={() => { calcPopup.onChange(calcPopup.lines.reduce((s, l) => s + (parseFloat(l) || 0), 0)); setCalcPopup(null); }} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 700, background: S.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Valider</button>
            </div>
          </div>
        </div>
      )}

'''

# Insert calc popup before the header
c = c.replace(
    '      {/* \u2500\u2500 Sidebar',
    calc_popup + '      {/* \u2500\u2500 Sidebar'
)
print('2. Calculator popup JSX added')

# Now modify EditableAmt to open the calculator when double-clicked
# Find the EditableAmt component and add onDoubleClick prop
old_editable = 'function EditableAmt({ value, onChange, color'
new_editable = 'function EditableAmt({ value, onChange, color, onCalc'
c = c.replace(old_editable, new_editable)

# The EditableAmt renders a span that when clicked becomes an input
# We need to pass the calcPopup setter through. Since EditableAmt is used everywhere,
# let's just make the expense rows in Depenses pass an onCalc prop.
# For now, let's not modify EditableAmt deeply. Instead, make the expense rows
# open the calculator on double-click on the amount.

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print(f'Done ({len(c)} bytes)')


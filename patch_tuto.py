# -*- coding: utf-8 -*-
f = open('app/page.tsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# 1. Add showSwipeTutorial state to SwipeValidator
idx = c.index('function SwipeValidator')
first_state = c.index('useState', idx)
c = c[:first_state] + 'useState(true);\n  const [showSwipeTutorial, setShowSwipeTutorial] = ' + c[first_state:]
print('1. State added')

# 2. Add tutorial overlay before Progression validation
tutorial = '''      {showSwipeTutorial && (
        <div onClick={() => setShowSwipeTutorial(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, cursor: "pointer" }}>
          <div style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 40, marginBottom: 16 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 28 }}>\u2190</div><div style={{ fontSize: 14, fontWeight: 600, color: "#f87171" }}>Rejeter</div></div>
              <div style={{ width: 120, height: 70, background: "rgba(255,255,255,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed rgba(255,255,255,0.3)", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>D\xe9pense</div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 28 }}>\u2192</div><div style={{ fontSize: 14, fontWeight: 600, color: "#4ade80" }}>Valider</div></div>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Swipez pour valider vos d\xe9penses</p>
            <p style={{ fontSize: 12, opacity: 0.6 }}>Glissez \xe0 droite pour valider, \xe0 gauche pour rejeter</p>
            <button onClick={(e) => { e.stopPropagation(); setShowSwipeTutorial(false); }} style={{ marginTop: 16, padding: "10px 28px", background: "#4ade80", color: "#000", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>J\u2019ai compris !</button>
          </div>
        </div>
      )}
'''

c = c.replace(
    '<SLabel>Progression validation</SLabel>',
    tutorial + '      <SLabel>Progression validation</SLabel>',
    1
)
print('2. Tutorial overlay added')

f = open('app/page.tsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print('Done')


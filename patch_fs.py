f = open('app/page.tsx', 'r')
c = f.read()
f.close()
orig = len(c)

# Replace ExpandBtn with native browser fullscreen API
# New ExpandBtn that uses element.requestFullscreen()
old_btn = '''function ExpandBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} title="Agrandir" style={{ position: "absolute", top: 8, right: 8, background: `${S.bg}cc`, border: `1px solid ${S.border}`, color: S.muted, width: 24, height: 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}><Maximize2 size={10} /></button>;
}'''

new_btn = '''function ExpandBtn({ onClick }: { onClick: () => void }) {
  const handleClick = (e: React.MouseEvent) => {
    const card = (e.target as HTMLElement).closest(".chart-expand");
    if (card) {
      if (document.fullscreenElement) { document.exitFullscreen(); }
      else { card.requestFullscreen().catch(() => {}); }
    } else { onClick(); }
  };
  return <button onClick={handleClick} title="Agrandir" style={{ position: "absolute", top: 8, right: 8, background: `${S.bg}cc`, border: `1px solid ${S.border}`, color: S.muted, width: 24, height: 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}><Maximize2 size={10} /></button>;
}'''

if old_btn in c:
    c = c.replace(old_btn, new_btn, 1)
    print('1. ExpandBtn uses native fullscreen API')
else:
    print('1. SKIP')

# Add className chart-expand to the portfolio chart Card
old_port_slabel = '<SLabel>Evolution portefeuille par mois</SLabel>'
if old_port_slabel in c:
    # Find the Card wrapping the portfolio chart - search backward
    idx = c.index(old_port_slabel)
    # Search backward for <Card
    search_start = max(0, idx - 500)
    before = c[search_start:idx]
    card_idx = before.rfind('<Card')
    if card_idx >= 0:
        abs_idx = search_start + card_idx
        # Add className to the Card
        c = c[:abs_idx] + c[abs_idx:].replace('<Card', '<Card className="chart-expand"', 1)
        print('2. Portfolio Card has chart-expand class')

# Add className to salary chart Card too
old_sal = '<SLabel>Evolution des salaires bruts'
if old_sal in c:
    idx = c.index(old_sal)
    search_start = max(0, idx - 500)
    before = c[search_start:idx]
    card_idx = before.rfind('<Card')
    if card_idx >= 0:
        abs_idx = search_start + card_idx
        old_card = c[abs_idx:abs_idx+200]
        if 'chart-expand' not in old_card:
            c = c[:abs_idx] + c[abs_idx:].replace('<Card', '<Card className="chart-expand"', 1)
            print('3. Salary Card has chart-expand class')

if len(c) < orig * 0.9:
    print('ERROR'); import sys; sys.exit(1)
f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print(f'Done ({len(c)} bytes)')


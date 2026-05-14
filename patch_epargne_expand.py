f = open('app/page.tsx', 'r')
c = f.read()
f.close()
orig = len(c)

# The issue: xpPort.st applies position:fixed to the CARD, making everything fullscreen
# Fix: only the chart container should go fullscreen, not the Card
# Replace the useExpand style for portfolio - apply to the chart div, not the Card

# Remove xpPort from the Card that wraps the chart
# Find the portfolio chart Card and its ExpandBtn
# Instead of using useExpand on the Card, use a dedicated fullscreen div around just the chart

# Current: the ExpandBtn is inside a div with position:relative
# When clicked, we want ONLY the chart to go fullscreen
# Solution: wrap the ResponsiveContainer in a div that gets xpPort.st

old_chart = '<ResponsiveContainer width="100%" height={220} key="port">'
new_chart = '<ResponsiveContainer width="100%" height={xpPort.ex ? "100%" : 220} key="port">'
if old_chart in c:
    c = c.replace(old_chart, new_chart, 1)
    print('1. Portfolio chart height dynamic')
elif '<ResponsiveContainer width="100%" height={220}>' in c:
    c = c.replace('<ResponsiveContainer width="100%" height={220}>', '<ResponsiveContainer width="100%" height={xpPort.ex ? "100%" : 220}>', 1)
    print('1b. Portfolio chart height dynamic (alt)')
else:
    print('1. SKIP')

# Wrap just the chart div with xpPort.st
old_wrap = '<div style={{ position: "relative" }}><ExpandBtn onClick={xpPort.toggle} /></div>\n          <SLabel>Evolution portefeuille par mois'
new_wrap = '<div style={{ position: "relative", display: "inline-block", float: "right" }}><ExpandBtn onClick={xpPort.toggle} /></div>\n          <SLabel>Evolution portefeuille par mois'
# Actually the wrap approach won't work for fullscreen. Let me use a different method:
# When expanded, render a fixed overlay with just the chart

# Add a fullscreen overlay for the chart when expanded
old_chart_area = '<div style={{ position: "relative", display: "inline-block", float: "right" }}><ExpandBtn onClick={xpPort.toggle} /></div>\n          <SLabel>Evolution portefeuille par mois</SLabel>'
new_chart_area = '{xpPort.ex && <div onClick={xpPort.toggle} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}><div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "90vw", height: "80vh", padding: 24, position: "relative" }}><button onClick={xpPort.toggle} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>\u00d7</button><p style={{ fontFamily: S.heading, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Evolution portefeuille par mois</p><ResponsiveContainer width="100%" height="90%"><ComposedChart data={portfolioChart}><CartesianGrid stroke="rgba(0,0,0,0.05)" /><XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 11, fontFamily: S.font }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: S.muted, fontSize: 10, fontFamily: S.font }} axisLine={false} tickLine={false} width={50} /><Tooltip content={<ChartTip />} />{PORTFOLIO_CATEGORIES.map(cat => <Bar key={cat.label} dataKey={cat.label} fill={cat.color} radius={[3,3,0,0]} maxBarSize={12} />)}</ComposedChart></ResponsiveContainer></div></div>}\n          <div style={{ position: "relative", display: "inline-block", float: "right" }}><ExpandBtn onClick={xpPort.toggle} /></div>\n          <SLabel>Evolution portefeuille par mois</SLabel>'

if old_chart_area in c:
    c = c.replace(old_chart_area, new_chart_area, 1)
    print('2. Portfolio fullscreen overlay added')
else:
    print('2. SKIP: chart area not found')

if len(c) < orig * 0.9:
    print('ERROR: file shrank'); import sys; sys.exit(1)

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print(f'Done ({len(c)} bytes)')


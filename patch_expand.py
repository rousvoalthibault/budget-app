f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# 1. Projection chart - already has expandedChart state, just need to wire it
# The xp = useExpand() is already there from earlier
# Find the Projection chart Card and add style + ExpandBtn
old_proj = '<SLabel>Projection 12 mois'
if '<ExpandBtn' not in c.split(old_proj)[0][-200:] if old_proj in c else True:
    c = c.replace(old_proj, '<ExpandBtn onClick={xp.toggle} />\n          <SLabel>Projection 12 mois', 1)
    print('1. Projection ExpandBtn added')

# 2. Salary chart - add local state to SalairesTab
old_sal_fn = 'function SalairesTab(\n'
if old_sal_fn not in c:
    # try inline version
    old_sal_fn2 = 'function SalairesTab({'
    if old_sal_fn2 in c:
        c = c.replace(old_sal_fn2, 'function SalairesTab({', 1)

# Add xpSal state after const [data in SalairesTab
old_sal_data = 'if (!data) return'
if 'xpSal' not in c:
    c = c.replace(old_sal_data, 'const xpSal = useExpand();\n  if (!data) return', 1)
    print('2. SalairesTab useExpand added')

# Add ExpandBtn to salary chart
old_sal_chart = '<SLabel>Evolution des salaires bruts'
if '<ExpandBtn' not in c.split(old_sal_chart)[0][-200:]:
    c = c.replace(old_sal_chart, '<ExpandBtn onClick={xpSal.toggle} />\n        <SLabel>Evolution des salaires bruts', 1)
    print('3. Salary ExpandBtn added')

# Wrap salary chart Card with expand style
old_sal_card = '      <Card>\n        <ExpandBtn onClick={xpSal.toggle}'
if old_sal_card in c:
    c = c.replace(old_sal_card, '      <Card style={xpSal.st}>\n        <ExpandBtn onClick={xpSal.toggle}')
    print('4. Salary Card expand style')

# 3. Portfolio chart - add to EconomiesTab
old_econ_null = 'if (!m) return null;\n  const [collapsed'
if 'xpPort' not in c:
    c = c.replace(old_econ_null, 'const xpPort = useExpand();\n  if (!m) return null;\n  const [collapsed')
    print('5. EconomiesTab useExpand added')

# Add ExpandBtn to portfolio chart
old_port_chart = '<SLabel>Evolution portefeuille par mois'
if '<ExpandBtn' not in c.split(old_port_chart)[0][-200:]:
    c = c.replace(old_port_chart, '<ExpandBtn onClick={xpPort.toggle} />\n          <SLabel>Evolution portefeuille par mois', 1)
    print('6. Portfolio ExpandBtn added')

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('All expand patches done')


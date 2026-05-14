f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# Find the Card wrapping the Projection chart and add position relative
# Look for the Card just before ExpandBtn onClick={() => setExpandedChart
lines = c.split('\n')
for i, line in enumerate(lines):
    if 'ExpandBtn onClick={() => setExpandedChart' in line:
        # Search backward for the nearest <Card
        for j in range(i-1, max(0, i-20), -1):
            if '<Card' in lines[j] and 'position' not in lines[j]:
                lines[j] = lines[j].replace('<Card>', '<Card style={{ position: "relative" as const }}>')
                lines[j] = lines[j].replace('<Card ', '<Card style={{ position: "relative" as const }} ') if '<Card>' not in lines[j] else lines[j]
                print(f'Fixed Projection Card at line {j+1}')
                break
    if 'ExpandBtn onClick={xpPort.toggle}' in line:
        for j in range(i-1, max(0, i-20), -1):
            if '<Card' in lines[j] and 'position' not in lines[j]:
                lines[j] = lines[j].replace('<Card>', '<Card style={{ position: "relative" as const }}>')
                print(f'Fixed Portfolio Card at line {j+1}')
                break

c = '\n'.join(lines)
f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('Position relative added to chart Cards')


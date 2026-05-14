f = open('app/page.tsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Fix broken accent
c = c.replace('Solde ajust\xc3\xa9', 'Solde ajuste')
c = c.replace('Solde ajuste', 'Solde ajust\u00e9')

f = open('app/page.tsx', 'w', encoding='utf-8')
f.write(c)
f.close()

# Verify
f = open('app/page.tsx', 'r', encoding='utf-8')
c2 = f.read()
f.close()
if 'Solde ajust\u00e9' in c2:
    print('Accent fixed correctly')
else:
    print('WARNING: accent not found')


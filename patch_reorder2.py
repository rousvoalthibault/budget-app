# -*- coding: utf-8 -*-
f = open('app/page.tsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Current order in Dashboard return:
# A: <AiAnalysis .../>
# B: {showSwipeTutorial ...} + <Card>Progression validation...</Card>
# C: <Card>R\xe9partition des d\xe9penses...</Card>  
# D: <div>Valider ses d\xe9penses + ?</div> + <SwipeValidator .../>
#
# Desired: A, C, B, D

# Find block boundaries
ai_end = c.index('<AiAnalysis')
ai_end = c.index('/>', ai_end) + 2

# Block B: tutorial + progression
b_start = c.index('{showSwipeTutorial', ai_end)
b_prog_card_end = c.index('</Card>', b_start) + 7
block_B = c[b_start:b_prog_card_end].strip()

# Block C: repartition
c_start = c.index('R\xe9partition des d\xe9penses', b_prog_card_end)
c_card_start = c.rfind('<Card', b_prog_card_end, c_start)
c_card_end = c.index('</Card>', c_start) + 7
block_C = c[c_card_start:c_card_end].strip()

# Block D: valider title + swipevalidator
d_start = c.index('Valider ses d\xe9penses', c_card_end)
d_div_start = c.rfind('<div', c_card_end, d_start)
d_swipe_end = c.index('/>', c.index('<SwipeValidator', d_div_start)) + 2
block_D = c[d_div_start:d_swipe_end].strip()

# Now remove B, C, D from after AiAnalysis and reinsert as C, B, D
# Everything between ai_end and after block_D is what we need to replace
after_D = d_swipe_end
before_blocks = ai_end

# Get everything after the blocks (the closing </div> etc)
rest = c[after_D:]

# Rebuild
new_section = f'''\n\n      {block_C}\n\n      {block_B}\n\n      {block_D}'''

c_new = c[:before_blocks+1] + c[before_blocks+1:ai_end] + new_section + rest

# Verify no truncation
if len(c_new) < len(c) * 0.8:
    print('ERROR: file shrank too much')
    import sys; sys.exit(1)

f = open('app/page.tsx', 'w', encoding='utf-8')
f.write(c_new)
f.close()
print(f'Reordered! ({len(c_new)} bytes, was {len(c)})')


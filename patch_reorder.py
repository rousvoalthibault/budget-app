# -*- coding: utf-8 -*-
f = open('app/page.tsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# The Dashboard return currently has this order:
# 1. KPI strip
# 2. AiAnalysis  
# 3. Progression validation + tutorial overlay
# 4. R\xe9partition des d\xe9penses
# 5. "Valider ses d\xe9penses" title + ? button
# 6. SwipeValidator
#
# Desired order:
# 1. KPI strip
# 2. AiAnalysis
# 3. R\xe9partition des d\xe9penses  
# 4. Progression validation
# 5. "Valider ses d\xe9penses" + ? (inline)
# 6. SwipeValidator

# Step 1: Find the blocks
# The Progression validation Card
prog_start = c.index('{showSwipeTutorial &&')
# Find the Card before it that contains Progression validation
prog_card_start = c.rfind('<Card', 0, prog_start)
prog_section_end = c.index('</Card>', prog_card_start) + 7
prog_block = c[prog_card_start:prog_section_end]
print(f'Progression block: {len(prog_block)} chars')

# The tutorial overlay (between showSwipeTutorial and <SLabel>Progression)
tutorial_start = prog_start
tutorial_end = c.index('<SLabel>Progression validation', prog_start)
tutorial_block = c[tutorial_start:tutorial_end]
print(f'Tutorial block: {len(tutorial_block)} chars')

# The full progression section (tutorial + Card)
full_prog_start = prog_start  # starts with tutorial
full_prog = tutorial_block + prog_block[prog_block.index('<SLabel>'):]

# The R\xe9partition Card
rep_start = c.index('R\xe9partition des d\xe9penses', prog_section_end)
rep_card_start = c.rfind('<Card', 0, rep_start)
rep_card_end = c.index('</Card>', rep_start) + 7
rep_block = c[rep_card_start:rep_card_end]
print(f'Repartition block: {len(rep_block)} chars')

# The "Valider ses depenses" title + SwipeValidator
valider_start = c.index('Valider ses d\xe9penses', rep_card_end)
valider_line_start = c.rfind('<div', 0, valider_start)
swipe_end = c.index('</SwipeValidator>', valider_line_start) + len('</SwipeValidator>')
# Actually SwipeValidator is self-closing
swipe_idx = c.index('<SwipeValidator', valider_line_start)
swipe_end_idx = c.index('/>', swipe_idx) + 2
valider_and_swipe = c[valider_line_start:swipe_end_idx]
print(f'Valider + SwipeValidator: {len(valider_and_swipe)} chars')

# Now rebuild: remove all these blocks from their current positions
# and reinsert in the right order

# Remove from bottom to top to preserve indices
# 1. Remove valider + swipe
c2 = c[:valider_line_start] + c[swipe_end_idx:]
# 2. Remove repartition (recalculate position)
rep_start2 = c2.index('R\xe9partition des d\xe9penses')
rep_card_start2 = c2.rfind('<Card', 0, rep_start2)
rep_card_end2 = c2.index('</Card>', rep_start2) + 7
c2 = c2[:rep_card_start2] + c2[rep_card_end2:]
# 3. Remove progression + tutorial (recalculate)
tut_start2 = c2.index('{showSwipeTutorial &&')
prog_label2 = c2.index('<SLabel>Progression validation', tut_start2)
prog_card_start2 = c2.rfind('<Card', 0, prog_label2)
# But the tutorial overlay is BEFORE the Card
# Remove from tutorial start to Card end
prog_card_end2 = c2.index('</Card>', prog_card_start2) + 7
c2 = c2[:tut_start2] + c2[prog_card_end2:]

# Now find where to insert (after AiAnalysis)
ai_end = c2.index('</AiAnalysis>') + len('</AiAnalysis>')
# Or find it differently - after the AiAnalysis call
ai_search = c2.index('AiAnalysis month=')
ai_line_end = c2.index('/>', ai_search) + 2

# Insert in order: Repartition, then Progression+tutorial, then Valider+Swipe
insert = f'''\n\n      {rep_block}\n\n      {tutorial_block}{prog_block}\n\n      {valider_and_swipe}'''

c2 = c2[:ai_line_end] + insert + c2[ai_line_end:]

f = open('app/page.tsx', 'w', encoding='utf-8')
f.write(c2)
f.close()
print('Blocks reordered!')


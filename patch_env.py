import re
f = open('app/page.tsx', 'r')
c = f.read()
f.close()

# 1. Add rename + delete to budget envelope rows
# Replace the label span with an editable input approach
old_label = '''<span style={{ flex: 1, fontSize: 13, color: isValid ? S.text : S.muted, fontWeight: 600 }}>{BUDGET_LABELS[key] || key}</span>'''
new_label = '''<input defaultValue={BUDGET_LABELS[key] || key} onBlur={e => { if (e.target.value !== key) onBudgetChange({ rename: { old: key, new: e.target.value } }); }} style={{ flex: 1, fontSize: 13, color: isValid ? S.text : S.muted, fontWeight: 600, background: "transparent", border: "none", outline: "none", padding: 0, fontFamily: "inherit" }} />'''
c = c.replace(old_label, new_label)

# 2. Add delete button after validate button
old_validate_end = '''                  <Check size={12} />
                </button>
              </div>'''
new_validate_end = '''                  <Check size={12} />
                </button>
                <button onClick={() => onBudgetChange({ delete_key: key })} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: S.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.5 }} title="Supprimer"><Trash2 size={11} /></button>
              </div>'''
c = c.replace(old_validate_end, new_validate_end, 1)

# 3. Add "Ajouter enveloppe" button after the grid
old_grid_end = '''        </div>
      </Card>
    </div>
  );
}'''
new_grid_end = '''        </div>
        <button onClick={() => { const name = prompt("Nom de la nouvelle enveloppe :"); if (name) onBudgetChange({ add_key: name, add_amount: 0 }); }} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, border: `1px dashed ${S.border}`, borderRadius: 8, background: "transparent", color: S.muted, cursor: "pointer", width: "100%", justifyContent: "center" }}><Plus size={12} /> Ajouter une enveloppe</button>
      </Card>
    </div>
  );
}'''
c = c.replace(old_grid_end, new_grid_end, 1)

f = open('app/page.tsx', 'w')
f.write(c)
f.close()
print('Budget envelope CRUD patched')


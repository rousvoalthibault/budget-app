# Guide de split composants — page.tsx

## Situation actuelle
- `app/page.tsx` = 185 KB, ~2000 lignes
- Tout dans un seul fichier : auth, layout, 6 tabs, modales, utils

## Structure cible

```
app/
  page.tsx              <- Main layout + routing (200 lignes)
  components/
    auth/
      LoginPage.tsx     <- Page de connexion
      AuthProvider.tsx  <- Context auth + token management
    layout/
      Sidebar.tsx       <- Sidebar + profil menu
      Header.tsx        <- Header + month selector + tools
      MobileTabBar.tsx  <- Bottom tab bar mobile
    tabs/
      DashboardTab.tsx  <- Dashboard + KPIs + validation swipe
      DepensesTab.tsx   <- Revenus + depenses + enveloppes
      ProjectionTab.tsx <- Graphe projection + table
      HistoriqueTab.tsx <- Graphe historique + table + CSV export
      EconomiesTab.tsx  <- Investissements + portefeuille
      SalairesTab.tsx   <- Historique salaires + simulateur fiscal
    shared/
      Card.tsx          <- Composant Card reutilisable
      EditableAmt.tsx   <- Montant editable avec crayon
      SLabel.tsx        <- Label de section
      Toast.tsx         <- Notification toast
      Notifications.tsx <- Dropdown notifications Revolut
      ProfileModal.tsx  <- Modale profil
      SettingsModal.tsx <- Modale parametres
      WelcomeTour.tsx   <- Tour guide 5 etapes
      OnboardingWizard.tsx <- Wizard 3 etapes
  lib/
    types.ts            <- Interfaces Month, Expense, Savings, etc.
    themes.ts           <- LIGHT + DARK themes
    utils.ts            <- fmt(), getAuthHeaders(), getDateFR()
    api.ts              <- Fonctions fetch : loadData, patchExpense, etc.
```

## Ordre recommande pour le split

1. **lib/types.ts** + **lib/themes.ts** + **lib/utils.ts** (extraire les types et utils)
2. **lib/api.ts** (extraire toutes les fonctions fetch)
3. **components/shared/** (Card, EditableAmt, SLabel, Toast)
4. **components/auth/** (LoginPage, AuthProvider context)
5. **components/layout/** (Sidebar, Header, MobileTabBar)
6. **components/tabs/** (un par un, du plus simple au plus complexe)
7. **page.tsx** final = juste le routing + composition

## Points d'attention

- Le state est partage entre les tabs via props (months, idx, etc.)
- Utiliser un React Context pour : user, theme, isMobile, hints
- Les fonctions de patch (patchExpense, patchIncome, etc.) sont dans le main - les extraire dans lib/api.ts
- Le CSS est en inline styles + quelques classes CSS dans un <style> tag -> migrer vers Tailwind classes
- Les icones Lucide sont importees globalement -> importer par composant

## Estimation
- Temps: 4-6 heures en IDE
- Complexite: moyenne (beaucoup de props a tracer)
- Risque: faible si fait composant par composant avec tests manuels entre chaque


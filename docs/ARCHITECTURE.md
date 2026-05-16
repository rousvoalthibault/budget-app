# BudgetApp - Architecture

## Vue d'ensemble
Application de gestion budgetaire personnelle avec multi-user auth,
projection 12 mois, portefeuille d'investissements et simulateur fiscal.

## Stack technique

### Frontend
- **Framework**: Next.js 16 + TypeScript + Tailwind CSS + Recharts
- **Heberge sur**: Vercel (budget-tc-app.codewords.run)
- **Fichier principal**: `app/page.tsx` (~160KB, monolithique)
- **Proxy API**: `app/api/budget/[...path]/route.ts`
- **Auth**: JWT stocke dans localStorage
- **Design**: Light/Dark mode, Outfit font, responsive mobile

### Backend
- **Framework**: Python FastAPI + Redis
- **Heberge sur**: CodeWords Runtime
- **Service ID**: `budget_app_api_b2ecbb91`
- **Auth**: JWT (PyJWT), tokens 30 jours
- **Database**: Redis (cles scopees par utilisateur)
- **Code source**: `backend/budget_app_api.py`

## Endpoints API

| Methode | Route | Description |
|---------|-------|-------------|
| POST | /auth/register | Inscription |
| POST | /auth/login | Connexion |
| GET | /auth/me | Verifier auth |
| GET | /months?year=2026 | Tous les mois d'une annee |
| GET | /month/{mk} | Un mois specifique |
| PUT | /month/{mk} | Mettre a jour un mois |
| PATCH | /month/{mk}/expense | Modifier une depense |
| POST | /month/{mk}/expense | Ajouter (avec propagation) |
| DELETE | /month/{mk}/expense/{label} | Supprimer |
| PATCH | /month/{mk}/income | Modifier un revenu |
| PATCH | /month/{mk}/savings | Modifier epargne |
| PATCH | /month/{mk}/portfolio-values | Valeurs portefeuille |
| PATCH | /month/{mk}/budget-allocation | Enveloppes budget |
| GET | /forecast | Projection 12 mois glissants |
| GET | /stats?year=2026 | Stats annuelles |
| GET | /salary-history | Historique salaires 2015-2026 |
| PATCH | /salary-history | Modifier une cellule |
| POST | /onboarding | Wizard configuration initiale |
| GET | /savings-goals | Objectifs epargne |
| POST | /savings-goals | Ajouter objectif |
| PATCH | /savings-goals/{id} | Modifier objectif |
| DELETE | /savings-goals/{id} | Supprimer objectif |

## Structure des donnees (par mois)

```json
{
  "month_key": "2026-01",
  "month_name": "Janvier",
  "year": 2026,
  "income_salary": 5437,
  "income_other": 0,
  "income_rente": 0,
  "income_epargne": 0,
  "income_actions": 0,
  "income_virements": 0,
  "income_solde_ajuste": 0,
  "expenses": [
    { "label": "Loyer", "amount": 1433, "category": "fixed", "validated": true, "icon": "Home" }
  ],
  "budget_allocation": { "courses": 703, "restaurants": 436 },
  "budget_validated": { "courses": true, "restaurants": false },
  "savings": { "target_monthly": 140, "pea": 11194, "livret_a": 23502 },
  "portfolio_values": { "pea": 12500, "livret_a": 23600 }
}
```

## Formules cles (Frontend)

- **Revenus** = salary + other + rente + epargne + actions + virements + solde_ajuste
- **Depenses** = expenses(non-invest) + budget_envelopes(valides)
- **Il vous reste** = Revenus - Depenses - Investissements
- **Cumul depuis janvier** = somme(Il vous reste) de jan a mois courant
- **Epargne** = total investissements mensuels (category=investment)

## Fonctionnalites

1. **Tableau de bord**: 5 KPIs + repartition + validation swipe + analyse IA
2. **Depenses**: revenus color-coded, fixes/variables/enveloppes, calculatrice
3. **Projection**: graphe ComposedChart 12 mois + alertes danger/warning
4. **Historique**: graphe evolution + tableau mois par mois
5. **Epargne**: investissements mensuels + portefeuille par categorie
6. **Salaires**: historique 2015-2026 + graphe + simulateur fiscal IR
7. **Auth**: register/login JWT multi-user
8. **Mobile responsive**: bottom tab bar, header compact, grilles adaptees
9. **Onboarding**: wizard config + welcome tour 5 etapes
10. **Dark/Light mode**

## Multi-annee
Donnees de 2026 a 2036 (132 mois). Seed data Excel pour 2026.

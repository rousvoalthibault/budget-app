export interface Expense {
  label: string;
  amount: number;
  category: string;
  validated: boolean;
  icon?: string;
}

export interface BudgetAlloc {
  courses: number;
  restaurants: number;
  services: number;
  revolut: number;
  amex: number;
  cera: number;
}

export interface Savings {
  target_monthly: number;
  actual_monthly: number;
  cumulative_target: number;
  cumulative_actual: number;
  pea: number;
  traderepublic: number;
  degiro: number;
  bitstack: number;
  swissborg: number;
  swisslife: number;
  assurance_vie_conservateur: number;
  uptimi: number;
  esalia: number;
  bdl_investment: number;
  etrade: number;
  shareworks: number;
  livret_a: number;
  epargne_revolut: number;
  ldd: number;
  lel: number;
  per: number;
  perco: number;
  irishlife: number;
  montres_objets_luxe: number;
  tontine: number;
}

export interface Month {
  month_key: string;
  month_name: string;
  year: number;
  income_salary: number;
  income_other: number;
  expenses: Expense[];
  budget_allocation: BudgetAlloc;
  budget_validated?: Record<string, boolean>;
  savings: Savings;
  portfolio_values?: Record<string, number>;
  balance_end_of_month: number;
  notes: string;
}

export interface ForecastMonth {
  month_key: string;
  month_name: string;
  income: number;
  expenses: number;
  savings_target: number;
  balance: number;
  alert_type: string;
  message?: string;
}

export interface Alert {
  month_key: string;
  month_name: string;
  projected_balance: number;
  alert_type: string;
  message: string;
}

export interface Forecast {
  months: ForecastMonth[];
  alerts: Alert[];
  total_income: number;
  total_expenses: number;
  total_savings: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  target_date: string;
  color: string;
  validated_months: any[];
}


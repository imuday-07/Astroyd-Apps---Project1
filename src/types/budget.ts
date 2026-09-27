export type TransactionType = 'income' | 'expense';

export type IncomeCategory = 'Salary' | 'Freelance' | 'Other Income';

export type ExpenseCategory =
  | 'Rent'
  | 'Food'
  | 'Travel'
  | 'Shopping'
  | 'Bills'
  | 'Entertainment'
  | 'EMI'
  | 'Other';

export type CategoryName = IncomeCategory | ExpenseCategory;

export interface CategoryMeta {
  name: CategoryName;
  type: TransactionType;
  icon: string;
  color: string;
  bgGlow: string;
  shortCode: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: CategoryName;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface CategoryBudgetMap {
  Rent: number;
  Food: number;
  Travel: number;
  Shopping: number;
  Bills: number;
  Entertainment: number;
  EMI: number;
  Other: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface BudgetRecord {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  month: string;
}

export interface FinancialGoal {
  id: string;
  user_id?: string;
  name: string;
  target: number;
  current_amount: number;
}

export interface BudgetState {
  monthlyBudgetLimit: number;
  categoryLimits: CategoryBudgetMap;
  transactions: Transaction[];
  financialGoals?: FinancialGoal[];
  currencySymbol: string;
  currencyCode: string;
}

export type ActiveTab = 'dashboard' | 'budgets' | 'transactions' | 'reports';
export type LayoutMode = 'responsive' | 'mobile-preview';

import {
  AVAILABLE_MONTHS,
  INITIAL_BUDGET_STATE,
  INITIAL_TRANSACTIONS,
} from '../data/initialData';
import {
  CATEGORY_META,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../theme/boostlabTheme';
import {
  CategoryBudgetMap,
  ExpenseCategory,
  IncomeCategory,
  Transaction,
} from '../types/budget';

const DUMMY_TX_PREFIXES = ['tx-sep-', 'tx-aug-', 'tx-jul-', 'tx-jun-'];

export function isDummyTransaction(tx: Transaction): boolean {
  return DUMMY_TX_PREFIXES.some((prefix) => String(tx.id).startsWith(prefix));
}

export function isDummyPresetLimits(
  monthlyLimit: number,
  categoryLimits: CategoryBudgetMap
): boolean {
  return (
    monthlyLimit === 6000 &&
    categoryLimits?.Rent === 2000 &&
    categoryLimits?.Food === 750 &&
    categoryLimits?.Travel === 600
  );
}

const ZERO_CATEGORY_LIMITS: CategoryBudgetMap = {
  Rent: 0,
  Food: 0,
  Travel: 0,
  Shopping: 0,
  Bills: 0,
  Entertainment: 0,
  EMI: 0,
  Other: 0,
};

// Immediately sanitize INITIAL_TRANSACTIONS, INITIAL_BUDGET_STATE, and localStorage
// at module load time so even if initialData.ts is re-saved by an open editor tab,
// all dummy seed data is completely erased.
(() => {
  try {
    if (Array.isArray(INITIAL_TRANSACTIONS) && INITIAL_TRANSACTIONS.length > 0) {
      INITIAL_TRANSACTIONS.splice(0, INITIAL_TRANSACTIONS.length);
    }
    if (INITIAL_BUDGET_STATE) {
      INITIAL_BUDGET_STATE.transactions = [];
      INITIAL_BUDGET_STATE.monthlyBudgetLimit = 0;
      if (INITIAL_BUDGET_STATE.categoryLimits) {
        (Object.keys(ZERO_CATEGORY_LIMITS) as ExpenseCategory[]).forEach(
          (k) => {
            INITIAL_BUDGET_STATE.categoryLimits[k] = 0;
          }
        );
      }
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const legacyKeys = [
        'boostlab_budget_mvp_v1',
        'budget_studio_clean_v2',
        'budget_studio_clean_v3',
        'budget_studio_clean_v4',
      ];
      for (const key of legacyKeys) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const txs: Transaction[] = Array.isArray(parsed?.transactions)
          ? parsed.transactions
          : [];
        const hasDummyTxs = txs.some(isDummyTransaction);
        const hasDummyCaps = isDummyPresetLimits(
          parsed?.monthlyBudgetLimit,
          parsed?.categoryLimits
        );
        if (hasDummyTxs || hasDummyCaps) {
          const cleanedTxs = txs.filter((t) => !isDummyTransaction(t));
          window.localStorage.setItem(
            key,
            JSON.stringify({
              transactions: cleanedTxs,
              monthlyBudgetLimit: hasDummyCaps ? 0 : parsed.monthlyBudgetLimit || 0,
              categoryLimits: hasDummyCaps
                ? ZERO_CATEGORY_LIMITS
                : parsed.categoryLimits || ZERO_CATEGORY_LIMITS,
              currencySymbol: parsed?.currencySymbol || '$',
            })
          );
        }
      }
    }
  } catch (_e) {
    // ignore storage errors
  }
})();

export function formatCurrency(
  amount: number,
  symbol: string = '$',
  compact: boolean = false
): string {
  const absVal = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (compact && absVal >= 1000) {
    return `${sign}${symbol}${(absVal / 1000).toFixed(1)}k`;
  }
  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: absVal % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${symbol}${formatted}`;
}

export interface CategoryExpenseSummary {
  category: ExpenseCategory;
  icon: string;
  color: string;
  bgGlow: string;
  shortCode: string;
  spent: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  shareOfExpenses: number;
  transactionCount: number;
}

export interface CategoryIncomeSummary {
  category: IncomeCategory;
  icon: string;
  color: string;
  bgGlow: string;
  shortCode: string;
  earned: number;
  shareOfIncome: number;
  transactionCount: number;
}

export interface MonthlySummary {
  monthKey: string;
  totalIncome: number;
  totalExpenses: number;
  remainingBalance: number;
  savings: number;
  savingsPercentage: number;
  monthlyBudget: number;
  remainingBudget: number;
  budgetPercentageUsed: number;
  expenseSummaries: CategoryExpenseSummary[];
  incomeSummaries: CategoryIncomeSummary[];
  monthTransactions: Transaction[];
}

export function calculateMonthlySummary(
  transactions: Transaction[],
  monthKey: string,
  monthlyBudgetLimit: number,
  categoryLimits: CategoryBudgetMap
): MonthlySummary {
  // Strip any dummy seed transactions and preset dummy limits
  const userTransactions = transactions.filter((tx) => !isDummyTransaction(tx));
  const useZeroLimits = isDummyPresetLimits(monthlyBudgetLimit, categoryLimits);
  const effectiveMonthlyLimit = useZeroLimits ? 0 : monthlyBudgetLimit;
  const effectiveCategoryLimits = useZeroLimits
    ? ZERO_CATEGORY_LIMITS
    : categoryLimits;

  const monthTransactions = userTransactions
    .filter((tx) => tx.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalIncome = monthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = monthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const remainingBalance = totalIncome - totalExpenses;
  const savings = Math.max(0, remainingBalance);
  const savingsPercentage =
    totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const remainingBudget = effectiveMonthlyLimit - totalExpenses;
  const budgetPercentageUsed =
    effectiveMonthlyLimit > 0
      ? (totalExpenses / effectiveMonthlyLimit) * 100
      : 0;

  const expenseSummaries: CategoryExpenseSummary[] = EXPENSE_CATEGORIES.map(
    (cat) => {
      const catTxs = monthTransactions.filter(
        (tx) => tx.type === 'expense' && tx.category === cat
      );
      const spent = catTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const limit = effectiveCategoryLimits[cat] || 0;
      const remaining = limit - spent;
      const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;
      const shareOfExpenses =
        totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0;
      const meta = CATEGORY_META[cat];

      return {
        category: cat,
        icon: meta.icon,
        color: meta.color,
        bgGlow: meta.bgGlow,
        shortCode: meta.shortCode,
        spent,
        limit,
        remaining,
        percentUsed,
        shareOfExpenses,
        transactionCount: catTxs.length,
      };
    }
  );

  const incomeSummaries: CategoryIncomeSummary[] = INCOME_CATEGORIES.map(
    (cat) => {
      const catTxs = monthTransactions.filter(
        (tx) => tx.type === 'income' && tx.category === cat
      );
      const earned = catTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const shareOfIncome = totalIncome > 0 ? (earned / totalIncome) * 100 : 0;
      const meta = CATEGORY_META[cat];

      return {
        category: cat,
        icon: meta.icon,
        color: meta.color,
        bgGlow: meta.bgGlow,
        shortCode: meta.shortCode,
        earned,
        shareOfIncome,
        transactionCount: catTxs.length,
      };
    }
  );

  return {
    monthKey,
    totalIncome,
    totalExpenses,
    remainingBalance,
    savings,
    savingsPercentage,
    monthlyBudget: effectiveMonthlyLimit,
    remainingBudget,
    budgetPercentageUsed,
    expenseSummaries,
    incomeSummaries,
    monthTransactions,
  };
}

export interface MonthlyTrendPoint {
  monthKey: string;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}

export function calculateTrendSeries(
  transactions: Transaction[]
): MonthlyTrendPoint[] {
  const userTransactions = transactions.filter((tx) => !isDummyTransaction(tx));
  return [...AVAILABLE_MONTHS].reverse().map((m) => {
    const txs = userTransactions.filter((tx) => tx.date.startsWith(m.key));
    const income = txs
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const expenses = txs
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    return {
      monthKey: m.key,
      label: m.label.split(' ')[0],
      income,
      expenses,
      savings,
      savingsRate,
    };
  });
}

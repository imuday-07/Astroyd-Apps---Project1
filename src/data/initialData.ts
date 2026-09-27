import { BudgetState, Transaction } from '../types/budget';

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_BUDGET_STATE: BudgetState = {
  monthlyBudgetLimit: 0,
  categoryLimits: {
    Rent: 0,
    Food: 0,
    Travel: 0,
    Shopping: 0,
    Bills: 0,
    Entertainment: 0,
    EMI: 0,
    Other: 0,
  },
  transactions: [],
  currencySymbol: '₹',
  currencyCode: 'INR',
};

export const AVAILABLE_MONTHS = [
  { key: '2026-09', label: 'Sep 2026', fullLabel: 'September 2026' },
  { key: '2026-08', label: 'Aug 2026', fullLabel: 'August 2026' },
  { key: '2026-07', label: 'Jul 2026', fullLabel: 'July 2026' },
  { key: '2026-06', label: 'Jun 2026', fullLabel: 'June 2026' },
];


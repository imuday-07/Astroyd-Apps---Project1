import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { INITIAL_BUDGET_STATE } from '../data/initialData';
import { getSupabaseClient } from '../lib/supabase';
import { EXPENSE_CATEGORIES } from '../theme/boostlabTheme';
import {
  CategoryBudgetMap,
  CategoryName,
  ExpenseCategory,
  FinancialGoal,
  Transaction,
  TransactionType,
  UserProfile,
} from '../types/budget';

export const MONTHLY_TOTAL_BUDGET_CATEGORY = '__MONTHLY_TOTAL__';

export interface CloudBudgetSnapshot {
  userProfile: UserProfile | null;
  transactions: Transaction[];
  monthlyBudgetLimit: number;
  categoryLimits: CategoryBudgetMap;
  financialGoals: FinancialGoal[];
  currencySymbol: string;
  hasRemoteSettings: boolean;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  requiresEmailConfirmation: boolean;
}

/**
 * Financial Security Guardrail:
 * Never allow or store Bank passwords, UPI PINs, Credit/Debit card PINs,
 * full 12-19 digit card numbers, or Banking OTPs in ledger descriptions/notes.
 */
export function validateNoSensitiveBankingSecrets(text: string): string | null {
  if (!text) return null;
  const normalized = text.toLowerCase();

  // Detect explicit PIN / OTP / Banking Password keywords paired with digits
  if (
    /\b(upi\s*pin|card\s*pin|atm\s*pin|deb(it)?\s*pin|cred(it)?\s*pin|bank\s*password|netbanking\s*password|banking\s*otp|otp\s*code|cvv)\b/i.test(
      normalized
    )
  ) {
    return 'Security Alert: Never enter Bank passwords, UPI PINs, Card PINs/CVVs, or Banking OTPs in Budget Studio.';
  }

  // Detect 13-19 digit credit/debit card number patterns
  const digitsOnly = text.replace(/[\s-]/g, '');
  if (/\b\d{13,19}\b/.test(digitsOnly)) {
    return 'Security Alert: Please do not enter full credit or debit card numbers.';
  }

  return null;
}

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured yet. Add your Project URL and Publishable Key in Cloud Settings or .env.local.'
    );
  }
  return client;
}

export async function getCurrentSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) return null;
  return data.session;
}

export function subscribeToAuthChanges(
  callback: (session: Session | null) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => {
    subscription.unsubscribe();
  };
}

export async function ensureUserProfileRow(
  user: User,
  customName?: string,
  currencySymbol?: string
): Promise<UserProfile> {
  const client = requireClient();
  const email = user.email || '';
  const resolvedName =
    customName?.trim() ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    email.split('@')[0] ||
    'User';

  const payload: Record<string, any> = {
    id: user.id,
    name: resolvedName,
    email,
  };
  if (currencySymbol) {
    payload.currency_symbol = currencySymbol;
  }

  await client.from('users').upsert(payload, { onConflict: 'id' });

  return {
    id: user.id,
    name: resolvedName,
    email,
  };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<AuthResult> {
  const client = requireClient();
  const cleanName = (name || '').trim() || email.trim().split('@')[0];

  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: cleanName,
        name: cleanName,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user && data.session) {
    await ensureUserProfileRow(data.user, cleanName).catch(() => {});
  }

  return {
    user: data.user,
    session: data.session,
    requiresEmailConfirmation: Boolean(data.user && !data.session),
  };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    throw new Error(error.message);
  }

  if (data.user) {
    await ensureUserProfileRow(data.user).catch(() => {});
  }

  return {
    user: data.user,
    session: data.session,
    requiresEmailConfirmation: false,
  };
}

export async function signInWithOAuthProvider(
  provider: 'google' | 'apple'
): Promise<void> {
  const client = requireClient();
  const redirectTo =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : undefined;

  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOutUser(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchCloudBudgetSnapshot(
  userId: string,
  monthKey = 'ALL'
): Promise<CloudBudgetSnapshot> {
  const client = requireClient();

  // Ensure user row exists in public.users for foreign key integrity
  const sessionRes = await client.auth.getUser();
  if (sessionRes.data?.user) {
    await ensureUserProfileRow(sessionRes.data.user).catch(() => {});
  }

  const [userRes, txRes, budgetsRes, goalsRes] = await Promise.all([
    client
      .from('users')
      .select('id, name, email, currency_symbol')
      .eq('id', userId)
      .maybeSingle(),
    client
      .from('transactions')
      .select('id, user_id, type, amount, category, date, description, notes')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    client
      .from('budgets')
      .select('id, user_id, category, amount, month')
      .eq('user_id', userId)
      .in('month', ['ALL', monthKey]),
    client
      .from('financial_goals')
      .select('id, user_id, name, target, current_amount')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);

  if (txRes.error) {
    throw new Error(`transactions query failed: ${txRes.error.message}`);
  }
  if (budgetsRes.error) {
    throw new Error(`budgets query failed: ${budgetsRes.error.message}`);
  }
  if (goalsRes.error) {
    throw new Error(`financial_goals query failed: ${goalsRes.error.message}`);
  }

  const userProfile: UserProfile | null = userRes.data
    ? {
        id: String(userRes.data.id),
        name: String(userRes.data.name || ''),
        email: String(userRes.data.email || ''),
      }
    : null;

  const transactions: Transaction[] = (txRes.data || []).map((row: any) => ({
    id: String(row.id),
    title: String(row.description || row.title || 'Entry'),
    amount: Number(row.amount) || 0,
    type: (row.type === 'income' ? 'income' : 'expense') as TransactionType,
    category: row.category as CategoryName,
    date: String(row.date),
    notes: row.notes ? String(row.notes) : '',
  }));

  const budgetRows = budgetsRes.data || [];
  const hasRemoteSettings = budgetRows.length > 0;

  let monthlyBudgetLimit = INITIAL_BUDGET_STATE.monthlyBudgetLimit;
  const categoryLimits: CategoryBudgetMap = {
    ...INITIAL_BUDGET_STATE.categoryLimits,
  };

  for (const row of budgetRows) {
    const cat = String(row.category);
    const amt = Number(row.amount) || 0;
    if (cat === MONTHLY_TOTAL_BUDGET_CATEGORY) {
      monthlyBudgetLimit = amt;
    } else if ((EXPENSE_CATEGORIES as string[]).includes(cat)) {
      categoryLimits[cat as ExpenseCategory] = amt;
    }
  }

  const financialGoals: FinancialGoal[] = (goalsRes.data || []).map(
    (g: any) => ({
      id: String(g.id),
      user_id: String(g.user_id),
      name: String(g.name),
      target: Number(g.target) || 0,
      current_amount: Number(g.current_amount) || 0,
    })
  );

  const currencySymbol =
    typeof userRes.data?.currency_symbol === 'string' &&
    userRes.data.currency_symbol.trim().length > 0
      ? userRes.data.currency_symbol.trim()
      : INITIAL_BUDGET_STATE.currencySymbol;

  return {
    userProfile,
    transactions,
    monthlyBudgetLimit,
    categoryLimits,
    financialGoals,
    currencySymbol,
    hasRemoteSettings,
  };
}

export async function upsertCloudTransaction(
  userId: string,
  tx: Transaction
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('transactions').upsert(
    {
      id: tx.id,
      user_id: userId,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      date: tx.date,
      description: tx.title,
      notes: tx.notes || '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,id' }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteCloudTransaction(
  userId: string,
  txId: string
): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .eq('id', txId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertCloudBudgetSettings(
  userId: string,
  monthlyBudgetLimit: number,
  categoryLimits: CategoryBudgetMap,
  currencySymbol: string,
  month = 'ALL'
): Promise<void> {
  const client = requireClient();

  // Update currency preference on public.users
  await client
    .from('users')
    .update({ currency_symbol: currencySymbol })
    .eq('id', userId);

  // Upsert overall monthly budget + category-wise budgets in public.budgets
  const rows = [
    {
      user_id: userId,
      category: MONTHLY_TOTAL_BUDGET_CATEGORY,
      amount: monthlyBudgetLimit,
      month,
      updated_at: new Date().toISOString(),
    },
    ...EXPENSE_CATEGORIES.map((cat) => ({
      user_id: userId,
      category: cat,
      amount: Number(categoryLimits[cat]) || 0,
      month,
      updated_at: new Date().toISOString(),
    })),
  ];

  const { error } = await client
    .from('budgets')
    .upsert(rows, { onConflict: 'user_id,month,category' });

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertCloudFinancialGoal(
  userId: string,
  goal: FinancialGoal
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('financial_goals').upsert(
    {
      id: goal.id,
      user_id: userId,
      name: goal.name,
      target: goal.target,
      current_amount: goal.current_amount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,id' }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteCloudFinancialGoal(
  userId: string,
  goalId: string
): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('financial_goals')
    .delete()
    .eq('user_id', userId)
    .eq('id', goalId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function pushAllLocalStateToCloud(
  userId: string,
  transactions: Transaction[],
  monthlyBudgetLimit: number,
  categoryLimits: CategoryBudgetMap,
  currencySymbol: string,
  financialGoals: FinancialGoal[] = []
): Promise<void> {
  const client = requireClient();

  // Ensure public.users row exists before inserting foreign-key records
  const sessionRes = await client.auth.getUser();
  if (sessionRes.data?.user) {
    await ensureUserProfileRow(
      sessionRes.data.user,
      undefined,
      currencySymbol
    ).catch(() => {});
  }

  await upsertCloudBudgetSettings(
    userId,
    monthlyBudgetLimit,
    categoryLimits,
    currencySymbol
  );

  if (transactions.length > 0) {
    const txRows = transactions.map((tx) => ({
      id: tx.id,
      user_id: userId,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      date: tx.date,
      description: tx.title,
      notes: tx.notes || '',
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client
      .from('transactions')
      .upsert(txRows, { onConflict: 'user_id,id' });

    if (error) {
      throw new Error(error.message);
    }
  }

  if (financialGoals.length > 0) {
    const goalRows = financialGoals.map((g) => ({
      id: g.id,
      user_id: userId,
      name: g.name,
      target: g.target,
      current_amount: g.current_amount,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client
      .from('financial_goals')
      .upsert(goalRows, { onConflict: 'user_id,id' });

    if (error) {
      throw new Error(error.message);
    }
  }
}

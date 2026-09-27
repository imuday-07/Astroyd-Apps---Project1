-- =============================================================================
-- BUDGET STUDIO — SUPABASE POSTGRES SCHEMA & ROW LEVEL SECURITY (RLS)
-- Tables: users, transactions, budgets, financial_goals
-- Run this script in your Supabase Dashboard -> SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- users (id, name, email)
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  currency_symbol text not null default '$',
  created_at timestamptz not null default now()
);

-- Automatically create a public.users profile row when a user signs up
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update
    set email = excluded.email,
        name = case when public.users.name = '' then excluded.name else public.users.name end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 2. TRANSACTIONS TABLE
-- transactions (id, user_id, type, amount, category, date, description)
-- -----------------------------------------------------------------------------
create table if not exists public.transactions (
  id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount >= 0),
  category text not null,
  date text not null,
  description text not null default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists idx_transactions_user_date
  on public.transactions (user_id, date desc);

-- -----------------------------------------------------------------------------
-- 3. BUDGETS TABLE
-- budgets (id, user_id, category, amount, month)
-- Note: category = '__MONTHLY_TOTAL__' stores the overall monthly budget limit,
-- and category = 'Rent' | 'Food' | ... stores category-wise limits.
-- -----------------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null,
  amount numeric not null default 0 check (amount >= 0),
  month text not null default 'ALL',
  updated_at timestamptz not null default now(),
  unique (user_id, month, category)
);

create index if not exists idx_budgets_user_month
  on public.budgets (user_id, month);

-- -----------------------------------------------------------------------------
-- 4. FINANCIAL GOALS TABLE
-- financial_goals (id, user_id, name, target, current_amount)
-- -----------------------------------------------------------------------------
create table if not exists public.financial_goals (
  id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  target numeric not null check (target > 0),
  current_amount numeric not null default 0 check (current_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- -----------------------------------------------------------------------------
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- Every user can only access rows where auth.uid() = id / user_id
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.financial_goals enable row level security;

-- Policies for public.users
drop policy if exists "Users manage own profile" on public.users;
create policy "Users manage own profile"
  on public.users for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Policies for public.transactions
drop policy if exists "Users manage own transactions" on public.transactions;
create policy "Users manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policies for public.budgets
drop policy if exists "Users manage own budgets" on public.budgets;
create policy "Users manage own budgets"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policies for public.financial_goals
drop policy if exists "Users manage own financial_goals" on public.financial_goals;
create policy "Users manage own financial_goals"
  on public.financial_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6. EXPLICIT ROLE GRANTS
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.financial_goals to authenticated;

-- ============================================================================
-- GeoMaster: Initial schema — profiles, high_scores, credit_transactions
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  nickname      text unique not null check (char_length(nickname) between 3 and 20),
  avatar        text not null default '🌍',
  role          text not null default 'user' check (role in ('user', 'admin')),
  is_banned     boolean not null default false,
  credits       integer not null default 0,
  created_at    timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (except role and is_banned)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
    and is_banned = (select is_banned from public.profiles where id = auth.uid())
  );

-- Users can insert their own profile (on registration)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Admin can read all profiles
create policy "Admin can read all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admin can update all profiles
create policy "Admin can update all profiles"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admin can delete profiles
create policy "Admin can delete profiles"
  on public.profiles for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 2. High Scores
-- ---------------------------------------------------------------------------
create table public.high_scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles on delete cascade,
  mode        text not null,
  difficulty  text not null,
  variant     text,
  score       integer not null,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index high_scores_user_id_idx on public.high_scores (user_id);
create index high_scores_mode_diff_idx on public.high_scores (mode, difficulty, variant);

alter table public.high_scores enable row level security;

-- Users can read their own scores
create policy "Users can read own scores"
  on public.high_scores for select
  using (auth.uid() = user_id);

-- Users can insert their own scores
create policy "Users can insert own scores"
  on public.high_scores for insert
  with check (auth.uid() = user_id);

-- Admin can read all scores
create policy "Admin can read all scores"
  on public.high_scores for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 3. Credit Transactions
-- ---------------------------------------------------------------------------
create table public.credit_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles on delete cascade,
  amount      integer not null,
  reason      text not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index credit_tx_user_id_idx on public.credit_transactions (user_id);

alter table public.credit_transactions enable row level security;

-- Users can read their own transactions
create policy "Users can read own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- Users can insert their own transactions (for earning/spending)
create policy "Users can insert own transactions"
  on public.credit_transactions for insert
  with check (auth.uid() = user_id);

-- Admin can read all transactions
create policy "Admin can read all transactions"
  on public.credit_transactions for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admin can insert transactions (for manual adjustments)
create policy "Admin can insert transactions"
  on public.credit_transactions for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 4. Helper function: update last_active_at on profile
-- ---------------------------------------------------------------------------
create or replace function public.update_last_active()
returns trigger as $$
begin
  update public.profiles set last_active_at = now() where id = auth.uid();
  return new;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- 5. Seed admin account
-- NOTE: The admin user must be created through Supabase Auth first
-- (email: timmerzzgaming@gmail.com). After auth signup, run this to set role:
-- ---------------------------------------------------------------------------
-- To seed after the user signs up:
-- update public.profiles set role = 'admin', nickname = 'Timon' where id = '<user-uuid>';
--
-- Or if the profile row doesn't exist yet, insert it manually after auth signup:
-- insert into public.profiles (id, nickname, avatar, role)
-- values ('<user-uuid-from-auth>', 'Timon', '🌍', 'admin');

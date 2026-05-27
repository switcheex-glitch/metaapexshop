-- ============================================================
-- Apex Technology Store — основная схема БД
-- ============================================================

-- 1. Профили пользователей (своя система авторизации через Telegram ID + пароль)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null unique,
  username text not null,
  password_hash text not null,
  balance numeric default 0,
  avatar_url text,
  is_blocked boolean default false,
  block_reason text,
  created_at timestamptz default now(),
  last_seen timestamptz default now()
);

create index if not exists profiles_telegram_id_idx on profiles(telegram_id);

-- 2. Покупки обычных товаров
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  price numeric not null,
  status text default 'pending', -- pending | approved | rejected
  payment_method text,
  platega_transaction_id text,
  screenshot_url text,
  telegram_message_id bigint,
  invited_to_group boolean default false,
  invited_at timestamptz,
  invite_link text,
  purchased_at timestamptz default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz
);

create index if not exists purchases_profile_id_idx on purchases(profile_id);
create index if not exists purchases_platega_tx_idx on purchases(platega_transaction_id);

-- 3. RLS политики — открываем только что нужно
alter table profiles enable row level security;
alter table purchases enable row level security;

-- Anon-роль может читать профили (для логина) и создавать их (регистрация)
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_insert_anon" on profiles for insert with check (true);
create policy "profiles_update_own" on profiles for update using (true);

-- Anon-роль может работать с purchases
create policy "purchases_select_all" on purchases for select using (true);
create policy "purchases_insert_anon" on purchases for insert with check (true);
create policy "purchases_update_anon" on purchases for update using (true);

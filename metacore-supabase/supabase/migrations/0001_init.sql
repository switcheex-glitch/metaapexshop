-- ============================================================
-- Metacore Supabase — initial schema
-- Project: nsrilzwmclsiwtrsomer
-- ============================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- Таблица покупок Metacore (отдельная от любых уже существующих)
-- ----------------------------------------------------------------
create table if not exists public.metacore_purchases (
  id                       uuid primary key default gen_random_uuid(),
  profile_id               text not null,                 -- UUID из основного проекта
  telegram_id              text not null,
  username                 text,
  product_id               text not null default 'metacore',
  product_name             text not null default 'Metacore',
  price                    numeric not null,
  status                   text not null default 'pending', -- pending | approved | rejected
  payment_method           text,
  platega_transaction_id   text,
  invited_to_group         boolean not null default false,
  invited_at               timestamptz,
  invite_link              text,
  created_at               timestamptz not null default now(),
  approved_at              timestamptz,
  rejected_at              timestamptz,
  meta                     jsonb default '{}'::jsonb
);

create index if not exists metacore_purchases_profile_id_idx     on public.metacore_purchases(profile_id);
create index if not exists metacore_purchases_status_idx         on public.metacore_purchases(status);
create index if not exists metacore_purchases_transaction_id_idx on public.metacore_purchases(platega_transaction_id);
create index if not exists metacore_purchases_created_at_idx     on public.metacore_purchases(created_at desc);

-- ----------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------
alter table public.metacore_purchases enable row level security;

-- Чтение покупок — публичное (фильтр по profile_id на стороне клиента,
-- profile_id это UUID, угадать практически невозможно)
drop policy if exists "metacore_purchases_public_read" on public.metacore_purchases;
create policy "metacore_purchases_public_read"
  on public.metacore_purchases for select
  using (true);

-- Запись/обновление/удаление — только service_role (через edge functions)
-- service_role обходит RLS по умолчанию, поэтому отдельные политики не нужны.

-- ----------------------------------------------------------------
-- Удобный VIEW для статистики (сколько людей купили Metacore)
-- ----------------------------------------------------------------
create or replace view public.metacore_stats as
select
  count(*) filter (where status = 'approved') as paid_count,
  count(*) filter (where status = 'pending')  as pending_count,
  count(*) filter (where status = 'rejected') as rejected_count,
  coalesce(sum(price) filter (where status = 'approved'), 0) as total_revenue
from public.metacore_purchases;

grant select on public.metacore_stats to anon, authenticated;

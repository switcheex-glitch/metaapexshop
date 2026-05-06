-- ============================================================
-- Metacore — система лицензионных ключей
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Таблица ключей (metacore_license_keys)
-- ----------------------------------------------------------------
create table if not exists public.metacore_license_keys (
  id                   uuid primary key default gen_random_uuid(),
  key                  text unique not null,
  is_used              boolean not null default false,
  used_by_purchase_id  uuid references public.metacore_purchases(id) on delete set null,
  used_at              timestamptz,
  device_fingerprint   text,                -- идентификатор ПК первой активации
  activated_at         timestamptz,
  activated_ip         text,
  created_at           timestamptz not null default now(),
  meta                 jsonb default '{}'::jsonb
);

create index if not exists metacore_license_keys_is_used_idx     on public.metacore_license_keys(is_used);
create index if not exists metacore_license_keys_used_by_idx     on public.metacore_license_keys(used_by_purchase_id);
create index if not exists metacore_license_keys_key_idx         on public.metacore_license_keys(key);
create index if not exists metacore_license_keys_device_idx      on public.metacore_license_keys(device_fingerprint);

alter table public.metacore_license_keys enable row level security;
-- никаких публичных политик: только через service_role (edge functions)

-- ----------------------------------------------------------------
-- 2. В metacore_purchases — поле для копии активного ключа
-- ----------------------------------------------------------------
alter table public.metacore_purchases
  add column if not exists activation_key text;

create index if not exists metacore_purchases_activation_key_idx
  on public.metacore_purchases(activation_key);

-- ----------------------------------------------------------------
-- 3. Расширяем view статистики — добавляем счётчики по ключам
-- ----------------------------------------------------------------
create or replace view public.metacore_stats as
select
  (select count(*) from public.metacore_purchases     where status = 'approved')    as paid_count,
  (select count(*) from public.metacore_purchases     where status = 'pending')     as pending_count,
  (select count(*) from public.metacore_purchases     where status = 'rejected')    as rejected_count,
  coalesce((select sum(price) from public.metacore_purchases where status = 'approved'), 0) as total_revenue,
  (select count(*) from public.metacore_license_keys  where is_used = false)        as keys_available,
  (select count(*) from public.metacore_license_keys  where is_used = true)         as keys_issued,
  (select count(*) from public.metacore_license_keys  where activated_at is not null) as keys_activated;

grant select on public.metacore_stats to anon, authenticated;

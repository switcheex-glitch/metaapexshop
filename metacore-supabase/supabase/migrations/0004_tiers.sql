-- ============================================================
-- Metacore — три тарифа: demo / standard / pro
-- ============================================================

-- 1. В metacore_purchases — поля tier и tokens_purchased
alter table public.metacore_purchases
  add column if not exists tier             text not null default 'demo',
  add column if not exists tokens_purchased integer;

-- Бэкфилл для уже существующих записей (исторически все Demo по 200 токенов)
update public.metacore_purchases
   set tier             = coalesce(tier, 'demo'),
       tokens_purchased = coalesce(tokens_purchased, 200)
 where tier is null or tokens_purchased is null;

create index if not exists metacore_purchases_tier_idx
  on public.metacore_purchases(tier);

-- 2. Расширяем view статистики разбивкой по тарифам
create or replace view public.metacore_stats as
select
  (select count(*) from public.metacore_purchases     where status = 'approved')                             as paid_count,
  (select count(*) from public.metacore_purchases     where status = 'approved' and tier = 'demo')           as paid_demo,
  (select count(*) from public.metacore_purchases     where status = 'approved' and tier = 'standard')      as paid_standard,
  (select count(*) from public.metacore_purchases     where status = 'approved' and tier = 'pro')           as paid_pro,
  (select count(*) from public.metacore_purchases     where status = 'pending')                              as pending_count,
  (select count(*) from public.metacore_purchases     where status = 'rejected')                             as rejected_count,
  coalesce((select sum(price) from public.metacore_purchases where status = 'approved'), 0)                  as total_revenue,
  (select count(*) from public.metacore_license_keys  where is_used = false and tokens_limit = 200)          as keys_demo_available,
  (select count(*) from public.metacore_license_keys  where is_used = false and tokens_limit = 7000)         as keys_standard_available,
  (select count(*) from public.metacore_license_keys  where is_used = false and tokens_limit = 15000)        as keys_pro_available,
  (select count(*) from public.metacore_license_keys  where is_used = true)                                  as keys_issued,
  (select count(*) from public.metacore_license_keys  where activated_at is not null)                        as keys_activated;

grant select on public.metacore_stats to anon, authenticated;

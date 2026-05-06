insert into public.metacore_license_keys (key)
select
  'MTCR-' ||
  upper(substr(md5(random()::text || clock_timestamp()::text || gs::text), 1, 4))  || '-' ||
  upper(substr(md5(random()::text || clock_timestamp()::text || gs::text), 5, 4))  || '-' ||
  upper(substr(md5(random()::text || clock_timestamp()::text || gs::text), 9, 4))  || '-' ||
  upper(substr(md5(random()::text || clock_timestamp()::text || gs::text), 13, 4))
from generate_series(1, 200) as gs
on conflict (key) do nothing;

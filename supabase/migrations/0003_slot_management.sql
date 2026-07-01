-- 注記: このプロジェクトは team-rapportia-official-site-liff と Supabase を相乗り（demo_id で分離）。
-- weekly_patterns / slot_overrides / reservations_slot_unique は同プロジェクトの
-- team-rapportia-official-site-liff/supabase/migrations/0002_slot_management.sql で
-- 既に作成済みのため、ここでの再実行は不要（ドキュメント目的で内容を記録）。

-- 週次パターン: 曜日×時間帯の繰り返し開放設定
create table if not exists public.weekly_patterns (
  id           uuid    default gen_random_uuid() primary key,
  demo_id      text    not null default 'cake',
  day_of_week  integer not null check (day_of_week between 0 and 6), -- 0=日, 6=土
  time_slot    text    not null check (time_slot in ('am', 'pm')),
  enabled      boolean not null default true,
  unique (demo_id, day_of_week, time_slot)
);

alter table public.weekly_patterns enable row level security;

-- 日付単位の例外: 繰り返しパターンを上書きする（臨時追加 or 臨時休み）
create table if not exists public.slot_overrides (
  id        uuid    default gen_random_uuid() primary key,
  demo_id   text    not null default 'cake',
  date      date    not null,
  time_slot text    not null check (time_slot in ('am', 'pm')),
  enabled   boolean not null default true, -- true=臨時追加, false=その日休み
  unique (demo_id, date, time_slot)
);

alter table public.slot_overrides enable row level security;

-- reservations: 1スロット1名制約（cancelled以外の予約が同日同時間帯に1件まで）
create unique index if not exists reservations_slot_unique
  on public.reservations (demo_id, pickup_date, pickup_time_slot)
  where status != 'cancelled';

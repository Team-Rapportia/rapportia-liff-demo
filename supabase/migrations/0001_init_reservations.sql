-- 予約テーブル（Amelia / KV の代替）。
-- 複数デモ（業態別）を 1 Supabase プロジェクトに相乗りさせるため demo_id で分離する。
-- 設計判断: team-rapportia/strategy/13_予約バックエンドの選定（Supabase決定）.md

create table if not exists public.reservations (
  booking_id        text primary key,
  demo_id           text        not null default 'cake',
  line_user_id      text        not null,
  customer_name     text        not null,
  product_id        text        not null,
  product_name      text        not null,
  product_price_jpy integer     not null,
  quantity          integer     not null check (quantity > 0),
  pickup_date       date        not null,
  pickup_time_slot  text        not null check (pickup_time_slot in ('am', 'pm')),
  customer_note     text        not null default '',
  deposit_jpy       integer     not null,
  status            text        not null default 'pending'
                      check (status in ('pending', 'confirmed', 'cancelled')),
  created_at        timestamptz not null default now(),
  confirmed_at      timestamptz,
  reminded_at       timestamptz
);

-- 容量（予約上限）クエリ・一覧表示の高速化用インデックス
create index if not exists reservations_demo_date_idx
  on public.reservations (demo_id, pickup_date);

create index if not exists reservations_demo_created_idx
  on public.reservations (demo_id, created_at desc);

-- RLS を dev から有効化（テナント分離 + anon 直アクセスの遮断）。
--   - サーバー（store.ts）は service_role キーで接続するため RLS をバイパスする信頼済み経路。
--   - anon / public キーからの直接アクセスは、ポリシーを一切作らないことで「デフォルト拒否」。
--   - 将来 anon キーを店舗ごとに使う場合は、ここに demo_id 単位のポリシーを追加する。
alter table public.reservations enable row level security;

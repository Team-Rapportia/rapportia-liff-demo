-- 予約の流入元（source）。攻めPUSH（オケージョン再来店）の効果証明に使う。
-- 設計判断: team-rapportia/strategy/22_Pro攻めエンジンの実態（LINE再来店PUSH）.md
--
-- 印の無い予約（自然来店・MEO経由・通常のLIFF予約）は 'organic'。
-- PUSH由来は rebook_*/bday_*/anniv_*/season_* でラベルし、source 別に件数・売上を集計できる。
-- これにより「PUSH経由◯件・売上¥◯」を月次レポートで示せる（Pro解約防止の命綱）。

alter table public.reservations
  add column if not exists source text not null default 'organic';

-- source 別集計（レポート）と、流入元での絞り込みを高速化。
create index if not exists reservations_demo_source_idx
  on public.reservations (demo_id, source, created_at desc);

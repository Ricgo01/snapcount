-- ── Estadísticas por partido (box score + jugadores) ─────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- Filled lazily: first visit to a finished game's page fetches the ESPN
-- summary and stores it here; later visits read from this table. The
-- /api/refresh cron also stores stats for games as they turn final.
-- No FK to games: a detail can arrive before its game row (e.g. playoffs).

create table if not exists public.game_details (
  game_id      text primary key,           -- ESPN event ID
  team_stats   jsonb,                      -- GameStatsResult shape
  player_stats jsonb,                      -- PlayerStatsResult shape
  updated_at   timestamptz not null default now()
);

alter table public.game_details enable row level security;

drop policy if exists "game_details_public_read" on public.game_details;
create policy "game_details_public_read" on public.game_details
  for select using (true);

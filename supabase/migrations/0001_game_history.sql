-- ── Historial de partidos ────────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- or via `supabase db push` if you use the Supabase CLI.

create table if not exists public.games (
  id          text primary key,            -- ESPN event ID
  season      int  not null,               -- ESPN year, e.g. 2025 for "2025-26"
  week        int  not null,
  season_type int  not null default 2,     -- 1=pre 2=regular 3=playoffs
  game_date   timestamptz,
  day         text not null default 'Dom', -- 'Jue' | 'Dom' | 'Lun'
  time        text not null default '',    -- "HH:MM" ET
  home_team   text not null,               -- canonical abbr (BUF, KC, ...)
  away_team   text not null,
  home_score  int,
  away_score  int,
  status      text not null default 'scheduled', -- 'scheduled' | 'live' | 'final'
  stadium     text,
  updated_at  timestamptz not null default now()
);

create index if not exists games_season_week_idx on public.games (season, week);
create index if not exists games_home_idx on public.games (home_team, season);
create index if not exists games_away_idx on public.games (away_team, season);

-- RLS: anyone can read (data is public NFL results); writes only via the
-- service-role/secret key, which bypasses RLS — no insert/update policy needed.
alter table public.games enable row level security;

drop policy if exists "games_public_read" on public.games;
create policy "games_public_read" on public.games
  for select using (true);

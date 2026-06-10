-- ── Rosters / depth charts históricos por temporada ──────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- Source: nflverse depth_charts dataset (github.com/nflverse/nflverse-data).
-- One snapshot per team-season: the depth chart of the last regular-season
-- week. Filled by /api/backfill-rosters?season=YYYY (once per season).

create table if not exists public.rosters (
  season      int  not null,               -- 2007 for the "2007-08" season
  team        text not null,               -- canonical abbr (KC, LV, ...)
  position    text not null,               -- QB, RB, WR, CB, ...
  player_name text not null,
  jersey      int,
  depth       int  not null default 1,     -- 1 = starter
  formation   text,                        -- Offense | Defense | Special Teams
  updated_at  timestamptz not null default now(),
  primary key (season, team, position, player_name)
);

create index if not exists rosters_team_season_idx on public.rosters (team, season);

alter table public.rosters enable row level security;

drop policy if exists "rosters_public_read" on public.rosters;
create policy "rosters_public_read" on public.rosters
  for select using (true);

-- Rooms table for multiplayer synchronization
create table if not exists public.rooms (
  id text primary key,
  inviteCode text unique,
  playerWhite text not null,
  playerBlack text,
  status text not null default 'waiting_for_opponent',
  board jsonb,
  moves jsonb not null default '[]'::jsonb,
  currentPlayer text not null default 'white',
  hasMoved jsonb,
  enPassantTarget jsonb,
  lastMove jsonb,
  gameStatus text,
  winner text,
  isCheck boolean not null default false,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create index if not exists idx_rooms_status on public.rooms(status);

-- Games history table
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  playerWhite text not null,
  playerBlack text not null,
  result text,
  winner text,
  moves jsonb not null default '[]'::jsonb,
  startedAt timestamptz not null default now(),
  endedAt timestamptz not null default now(),
  reason text,
  extraData jsonb not null default '{}'::jsonb,
  createdAt timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.games enable row level security;

-- Demo policies (MVP only): allows all anonymous operations.
-- Tighten these policies before production release.
drop policy if exists "rooms_all" on public.rooms;
create policy "rooms_all"
  on public.rooms
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "games_all" on public.games;
create policy "games_all"
  on public.games
  for all
  to anon, authenticated
  using (true)
  with check (true);

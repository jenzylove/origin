-- Origin schema. Paste into Supabase SQL Editor and run once.
create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  video_id text,
  source_url text,
  title text,
  kind text check (kind in ('code','web','blender','account','unsupported')),
  status text not null default 'queued' check (status in ('queued','extracting','running','waiting_user','done','failed')),
  mode text not null default 'live' check (mode in ('live','replay')),
  error text,
  summary jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists runs_video_idx on runs (video_id, created_at desc);

create table if not exists steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  idx int not null,
  t numeric not null,
  t_label text not null,
  action text not null,
  detail text not null,
  target text,
  spoken boolean default false,
  verdict text check (verdict in ('pending','running','works','changed','broken','gated','skipped')) default 'pending',
  reasons jsonb default '[]',
  replacement text,
  output text,
  then_frame_url text,
  then_box jsonb,
  now_shot_url text,
  now_box jsonb,
  unique (run_id, idx)
);

create table if not exists events (
  id bigserial primary key,
  run_id uuid not null references runs(id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  payload jsonb not null default '{}'
);
create index if not exists events_run_idx on events (run_id, id);

-- Public can read results; only the server (secret key) writes.
alter table runs enable row level security;
alter table steps enable row level security;
alter table events enable row level security;
drop policy if exists "public read runs" on runs;
drop policy if exists "public read steps" on steps;
drop policy if exists "public read events" on events;
create policy "public read runs" on runs for select using (true);
create policy "public read steps" on steps for select using (true);
create policy "public read events" on events for select using (true);

-- Live panel subscribes to these.
alter publication supabase_realtime add table runs, steps, events;

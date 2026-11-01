-- Live cloud browser for account steps.
-- Only the person who started a run can control it: their browser holds a token, we keep its hash.
alter table runs add column if not exists control_hash text;

-- Keystrokes and clicks for the live browser. No public policy: only the server can read or write.
-- The runner deletes each row as soon as it is applied, so typed passwords never persist.
create table if not exists inputs (
  id bigserial primary key,
  run_id uuid not null references runs(id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  payload jsonb not null default '{}'
);
alter table inputs enable row level security;

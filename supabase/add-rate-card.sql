create table if not exists rate_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  rates jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table rate_cards enable row level security;
create policy "Users manage own rate cards" on rate_cards for all using (auth.uid() = user_id);

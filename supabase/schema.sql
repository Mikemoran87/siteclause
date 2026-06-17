-- Run this in Supabase Dashboard → SQL Editor → New Query → Run

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  main_contractor text,
  contract_value text,
  start_date text,
  status text default 'Active',
  notes text,
  created_at timestamptz default now()
);
alter table projects enable row level security;
create policy "Users manage own projects" on projects for all using (auth.uid() = user_id);

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  filename text,
  content text,
  uploaded_at timestamptz default now()
);
alter table contracts enable row level security;
create policy "Users manage own contracts" on contracts for all using (auth.uid() = user_id);

create table if not exists correspondence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  content text,
  source text,
  uploaded_at timestamptz default now()
);
alter table correspondence enable row level security;
create policy "Users manage own correspondence" on correspondence for all using (auth.uid() = user_id);

create table if not exists variations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  title text,
  description text,
  value text,
  status text default 'Draft',
  deadline text,
  notice_drafted text,
  created_at timestamptz default now()
);
alter table variations enable row level security;
create policy "Users manage own variations" on variations for all using (auth.uid() = user_id);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  role text,
  content text,
  created_at timestamptz default now()
);
alter table chat_messages enable row level security;
create policy "Users manage own chat" on chat_messages for all using (auth.uid() = user_id);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  contract_value_band text,
  work_type text,
  answers jsonb,
  analysis_result jsonb,
  created_at timestamptz default now()
);
alter table leads enable row level security;
create policy "Anyone can insert leads" on leads for insert with check (true);

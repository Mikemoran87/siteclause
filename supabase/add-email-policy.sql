-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- Allows the inbound email webhook to look up projects and insert correspondence
-- without an authenticated user session.

-- Allow lookup of projects by email prefix (for inbound email webhook)
create policy "Public can read project by email" on projects
  for select using (true);

-- Allow server insert of correspondence (webhook has no user session)
create policy "Server can insert correspondence" on correspondence
  for insert with check (true);

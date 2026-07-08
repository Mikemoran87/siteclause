-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- Adds the email_prefix column to projects and backfills existing rows.

alter table projects add column if not exists email_prefix text unique;

-- Backfill existing projects with sc-{first 8 chars of UUID}
update projects
  set email_prefix = 'sc-' || substring(id::text, 1, 8)
  where email_prefix is null;

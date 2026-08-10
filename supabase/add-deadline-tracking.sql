-- Add deadline tracking to variations
alter table variations add column if not exists claim_date date;
alter table variations add column if not exists notice_1_due date;
alter table variations add column if not exists notice_1_sent boolean default false;
alter table variations add column if not exists notice_2_due date;
alter table variations add column if not exists notice_2_sent boolean default false;
alter table variations add column if not exists next_monthly_due date;
alter table variations add column if not exists user_email text;

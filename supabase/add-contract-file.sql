-- Add original-file storage to contracts and correspondence tables
alter table contracts add column if not exists file_data text;
alter table contracts add column if not exists file_type text;

alter table correspondence add column if not exists file_data text;
alter table correspondence add column if not exists file_type text;

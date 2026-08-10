-- Add label and doc_type to contracts table
alter table contracts add column if not exists label text;
alter table contracts add column if not exists doc_type text default 'Main Contract';

-- Add doc_type to correspondence table (for programmes)
alter table correspondence add column if not exists doc_type text default 'Correspondence';

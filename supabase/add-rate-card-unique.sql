-- Add unique constraint so upsert works correctly
alter table rate_cards drop constraint if exists rate_cards_project_id_key;
alter table rate_cards add constraint rate_cards_project_id_key unique (project_id);

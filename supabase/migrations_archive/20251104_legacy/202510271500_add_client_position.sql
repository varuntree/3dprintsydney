-- Add position column to clients table
-- This supports storing the position/role field collected during business account signup

begin;

-- Add position column
alter table clients
  add column if not exists position text;

commit;

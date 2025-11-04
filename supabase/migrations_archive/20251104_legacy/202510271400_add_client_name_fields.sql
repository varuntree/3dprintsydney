-- Add first_name and last_name columns to clients table
-- This supports the enhanced signup form that collects separate first and last names

begin;

-- Add new columns for first name and last name
alter table clients
  add column if not exists first_name text,
  add column if not exists last_name text;

-- For existing records, try to split the name field
-- This is a best-effort migration - names like "John Doe" will be split,
-- but single names or complex names will just go to first_name
update clients
set
  first_name = split_part(name, ' ', 1),
  last_name = case
    when position(' ' in name) > 0 then substring(name from position(' ' in name) + 1)
    else ''
  end
where first_name is null;

commit;

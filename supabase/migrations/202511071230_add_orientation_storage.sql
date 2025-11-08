begin;

alter table if exists tmp_files
  add column if not exists orientation_data jsonb;

alter table if exists order_files
  add column if not exists orientation_data jsonb;

create index if not exists idx_order_files_orientation_data on order_files using gin (orientation_data);

commit;

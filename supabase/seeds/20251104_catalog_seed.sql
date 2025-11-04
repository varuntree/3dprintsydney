-- Seed catalog, printer, and configuration data recovered from legacy migrations
begin;

-- Insert Materials
insert into materials (id, name, color, category, cost_per_gram, notes, created_at, updated_at) values
  (1, 'PLA', 'Assorted', 'General', 0.05, 'Daily driver filament', now(), now()),
  (2, 'PETG', 'Clear', 'High Strength', 0.08, null, now(), now())
on conflict (id) do nothing;

-- Insert Printers
insert into printers (id, name, model, build_volume, status, notes, created_at, updated_at) values
  (1, 'Bambu X1', 'BambuLab X1 Carbon', '256 x 256 x 256 mm', 'ACTIVE', 'Primary production machine', now(), now()),
  (2, 'Prusa MK4', 'Original Prusa MK4', '250 x 210 x 210 mm', 'MAINTENANCE', 'Swap nozzles weekly', now(), now())
on conflict (id) do nothing;

-- Insert Product Templates
insert into product_templates (id, name, description, unit, pricing_type, base_price, calculator_config, material_id, created_at, updated_at) values
  (1, 'Small Print', 'Up to 4 hours, PLA', 'job', 'CALCULATED', null, '{"baseHours": 4, "materialGrams": 60, "quality": "standard", "infill": "medium"}', 1, now(), now()),
  (2, 'Design Consultation', 'Hourly design assistance', 'hour', 'FIXED', 90, null, null, now(), now())
on conflict (id) do nothing;

-- Update Settings with recovered configuration
update settings set
  business_name = '3D Print Sydney',
  business_email = 'hello@3dprintsydney.local',
  business_phone = '+61 400 000 000',
  business_address = '123 Maker Lane, Sydney NSW',
  default_payment_terms = 'COD',
  tax_rate = 10,
  job_creation_policy = 'ON_PAYMENT',
  payment_terms = '[
    {"code": "COD", "label": "COD", "days": 0},
    {"code": "7_days", "label": "7 days", "days": 7},
    {"code": "14_days", "label": "14 days", "days": 14},
    {"code": "30_days", "label": "30 days", "days": 30}
  ]'::jsonb,
  shipping_regions = '[
    {
      "code": "sydney_metro",
      "label": "Sydney Metro",
      "states": ["NSW"],
      "baseAmount": 12.5,
      "remoteSurcharge": 0
    },
    {
      "code": "regional",
      "label": "Regional Australia",
      "states": ["NSW", "VIC", "QLD", "SA", "WA", "NT", "TAS", "ACT"],
      "baseAmount": 25,
      "remoteSurcharge": 0
    },
    {
      "code": "remote",
      "label": "Remote & Islands",
      "states": ["TAS", "WA", "NT"],
      "baseAmount": 45,
      "remoteSurcharge": 15
    }
  ]'::jsonb,
  default_shipping_region = 'sydney_metro',
  calculator_config = '{
    "hourlyRate": 45,
    "setupFee": 20,
    "minimumPrice": 35,
    "qualityMultipliers": {
      "draft": 0.8,
      "standard": 1,
      "fine": 1.25
    },
    "infillMultipliers": {
      "low": 0.9,
      "medium": 1,
      "high": 1.2
    }
  }'::jsonb,
  updated_at = now()
where id = 1;

-- Insert Number Sequences
insert into number_sequences (kind, prefix, current, created_at, updated_at) values
  ('quote', 'QT-', 1000, now(), now()),
  ('invoice', 'INV-', 2000, now(), now())
on conflict (kind) do update set
  prefix = excluded.prefix,
  current = greatest(number_sequences.current, excluded.current),
  updated_at = now();

-- Reset sequences to ensure auto-increment continues properly
select setval('materials_id_seq', (select max(id) from materials));
select setval('printers_id_seq', (select max(id) from printers));
select setval('product_templates_id_seq', (select max(id) from product_templates));

commit;

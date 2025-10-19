-- Seed catalog data recovered from git history (commits 899d89d and 034adf2)
-- Original data from prisma/seed.ts before migration to Supabase
begin;

-- Insert Materials
INSERT INTO materials (id, name, color, category, cost_per_gram, notes, created_at, updated_at) VALUES
(1, 'PLA', 'Assorted', 'General', 0.05, 'Daily driver filament', NOW(), NOW()),
(2, 'PETG', 'Clear', 'High Strength', 0.08, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Printers
INSERT INTO printers (id, name, model, build_volume, status, notes, created_at, updated_at) VALUES
(1, 'Bambu X1', 'BambuLab X1 Carbon', '256 x 256 x 256 mm', 'ACTIVE', 'Primary production machine', NOW(), NOW()),
(2, 'Prusa MK4', 'Original Prusa MK4', '250 x 210 x 210 mm', 'MAINTENANCE', 'Swap nozzles weekly', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Product Templates
INSERT INTO product_templates (id, name, description, unit, pricing_type, base_price, calculator_config, material_id, created_at, updated_at) VALUES
(1, 'Small Print', 'Up to 4 hours, PLA', 'job', 'CALCULATED', NULL, '{"baseHours": 4, "materialGrams": 60, "quality": "standard", "infill": "medium"}', 1, NOW(), NOW()),
(2, 'Design Consultation', 'Hourly design assistance', 'hour', 'FIXED', 90, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Update Settings with recovered configuration
UPDATE settings SET
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
  updated_at = NOW()
WHERE id = 1;

-- Insert Number Sequences
INSERT INTO number_sequences (kind, prefix, current, created_at, updated_at) VALUES
('quote', 'QT-', 1000, NOW(), NOW()),
('invoice', 'INV-', 2000, NOW(), NOW())
ON CONFLICT (kind) DO UPDATE SET
  prefix = EXCLUDED.prefix,
  current = GREATEST(number_sequences.current, EXCLUDED.current),
  updated_at = NOW();

-- Reset sequences to ensure auto-increment continues properly
SELECT setval('materials_id_seq', (SELECT MAX(id) FROM materials));
SELECT setval('printers_id_seq', (SELECT MAX(id) FROM printers));
SELECT setval('product_templates_id_seq', (SELECT MAX(id) FROM product_templates));

commit;

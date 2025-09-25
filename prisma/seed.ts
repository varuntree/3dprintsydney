import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultPaymentTerms = [
  { code: "COD", label: "COD", days: 0 },
  { code: "7_days", label: "7 days", days: 7 },
  { code: "14_days", label: "14 days", days: 14 },
  { code: "30_days", label: "30 days", days: 30 },
];

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      businessName: "3D Print Sydney",
      businessEmail: "hello@3dprintsydney.local",
      businessPhone: "+61 400 000 000",
      businessAddress: "123 Maker Lane, Sydney NSW",
      defaultPaymentTerms: "COD",
      paymentTerms: defaultPaymentTerms,
      taxRate: "10",
      jobCreationPolicy: "ON_PAYMENT",
      calculatorConfig: {
        hourlyRate: 45,
        setupFee: 20,
        minimumPrice: 35,
        qualityMultipliers: {
          draft: 0.8,
          standard: 1,
          fine: 1.25,
        },
        infillMultipliers: {
          low: 0.9,
          medium: 1,
          high: 1.2,
        },
      },
      shippingOptions: [
        { code: "pickup", label: "Local Pickup", amount: 0 },
        { code: "standard", label: "Standard Post", amount: 12.5 },
        { code: "express", label: "Express Courier", amount: 25 },
      ],
    },
  });

  await prisma.numberSequence.upsert({
    where: { kind: "quote" },
    update: { prefix: "QT-" },
    create: { kind: "quote", prefix: "QT-", current: 1000 },
  });

  await prisma.numberSequence.upsert({
    where: { kind: "invoice" },
    update: { prefix: "INV-" },
    create: { kind: "invoice", prefix: "INV-", current: 2000 },
  });

  const pla = await prisma.material.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "PLA",
      color: "Assorted",
      category: "General",
      costPerGram: "0.05",
      notes: "Daily driver filament",
    },
  });

  const petg = await prisma.material.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "PETG",
      color: "Clear",
      category: "High Strength",
      costPerGram: "0.08",
    },
  });

  await prisma.productTemplate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Small Print",
      description: "Up to 4 hours, PLA",
      unit: "job",
      pricingType: "CALCULATED",
      calculatorConfig: {
        baseHours: 4,
        materialGrams: 60,
        quality: "standard",
        infill: "medium",
      },
      materialId: pla.id,
    },
  });

  await prisma.productTemplate.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Design Consultation",
      description: "Hourly design assistance",
      unit: "hour",
      pricingType: "FIXED",
      basePrice: "90",
    },
  });

  await prisma.printer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Bambu X1",
      model: "BambuLab X1 Carbon",
      buildVolume: "256 x 256 x 256 mm",
      status: "ACTIVE",
      notes: "Primary production machine",
    },
  });

  await prisma.printer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Prusa MK4",
      model: "Original Prusa MK4",
      buildVolume: "250 x 210 x 210 mm",
      status: "MAINTENANCE",
      notes: "Swap nozzles weekly",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

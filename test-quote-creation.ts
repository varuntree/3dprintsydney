import { createQuote } from './src/server/services/quotes';

async function testQuoteCreation() {
  try {
    console.log('Testing quote creation...');

    const quoteData = {
      clientId: 10, // TEST_Corporation_1762947789511
      issueDate: new Date().toISOString(),
      expiryDate: '2025-11-26',
      taxRate: 10,
      discountType: 'NONE' as const,
      discountValue: 0,
      shippingCost: 12.50,
      shippingLabel: 'Standard Shipping',
      notes: '',
      terms: '',
      lines: [
        {
          name: '3D Printing - Test Part',
          description: 'Test 3D printed component',
          quantity: 5,
          unit: 'unit',
          unitPrice: 25,
          discountType: 'NONE' as const,
          discountValue: 0,
          lineType: 'PRINT' as const,
          modellingBrief: '',
          modellingComplexity: 'SIMPLE' as const,
          modellingRevisionCount: 0,
          modellingHourlyRate: 0,
          modellingEstimatedHours: 0,
        },
        {
          name: 'Material - PLA',
          description: 'PLA filament material',
          quantity: 1,
          unit: 'kg',
          unitPrice: 30,
          discountType: 'NONE' as const,
          discountValue: 0,
          lineType: 'PRINT' as const,
          modellingBrief: '',
          modellingComplexity: 'SIMPLE' as const,
          modellingRevisionCount: 0,
          modellingHourlyRate: 0,
          modellingEstimatedHours: 0,
        },
      ],
    };

    const result = await createQuote(quoteData);
    console.log('Quote created successfully:', result);
  } catch (error) {
    console.error('Error creating quote:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

testQuoteCreation();

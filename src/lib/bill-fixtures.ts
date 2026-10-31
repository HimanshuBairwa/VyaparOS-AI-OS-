export const SAMPLE_BILL_FIXTURES = [
  {
    id: 'fixture-supplier-a',
    label: '[Demo Fixture] Supplier A Wholesale Tax Invoice #INV-8821',
    description: 'Wholesale delivery of 12 A3 Plain Sketchbooks with delivery fee',
    type: 'QUOTE' as const,
    extractedData: {
      supplierName: 'Supplier A (Stationery Hub)',
      matchedProductName: 'Sketchbook',
      matchedVariant: 'A3 Plain',
      quantity: 12,
      packSize: 12,
      minOrderQuantity: 12,
      availableQuantity: 12,
      unitCostPaise: 8000, // ₹80.00
      actionCostPaise: 3000, // ₹30.00
      totalAmountPaise: 99000, // ₹990.00
      deliveryLeadHours: 4,
      invoiceNumber: 'INV-8821',
      date: new Date().toLocaleDateString('en-IN'),
    },
  },
  {
    id: 'fixture-supplier-b',
    label: '[Demo Fixture] Supplier B Delivery Memo #CH-409',
    description: 'Pack of 6 A3 Plain Sketchbooks with delivery charge',
    type: 'QUOTE' as const,
    extractedData: {
      supplierName: 'Supplier B (Metro Papers)',
      matchedProductName: 'Sketchbook',
      matchedVariant: 'A3 Plain',
      quantity: 6,
      packSize: 6,
      minOrderQuantity: 6,
      availableQuantity: 12,
      unitCostPaise: 8500, // ₹85.00
      actionCostPaise: 3000, // ₹30.00
      totalAmountPaise: 54000, // ₹540.00
      deliveryLeadHours: 4,
      invoiceNumber: 'CH-409',
      date: new Date().toLocaleDateString('en-IN'),
    },
  },
  {
    id: 'fixture-retail-sale',
    label: '[Demo Fixture] Stationery Register Retail Slip #REG-302',
    description: 'Walk-in student sale of 2 A4 Ruled Notebooks (200 pages)',
    type: 'SALE' as const,
    extractedData: {
      matchedProductName: 'Notebook',
      matchedVariant: 'A4 Ruled 200p',
      quantity: 2,
      unitPricePaise: 6500, // ₹65.00
      totalAmountPaise: 13000, // ₹130.00
      paymentMethod: 'CASH',
      invoiceNumber: 'REG-302',
      date: new Date().toLocaleDateString('en-IN'),
    },
  },
];

import { prisma } from './db';

export async function seedDatabase() {
  // Clean existing demo records
  await prisma.outcome.deleteMany({});
  await prisma.paymentEvent.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.supplierQuote.deleteMany({});
  await prisma.demandRequest.deleteMany({});
  await prisma.saleLine.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.sourceDocument.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.merchant.deleteMany({});

  // 1. Create Merchant
  const merchant = await prisma.merchant.create({
    data: {
      name: 'VyaparOS Universal Retail Mart',
      tagline: 'Aaj kya khareedun, kitna, aur kyun?',
      category: 'general_retail',
      currency: 'INR',
      availableBudgetPaise: 100000, // ₹1,000.00
      minContributionPaise: 15000,  // ₹150.00
      maxSpeculativeUnits: 0,       // Default 0 speculative units
      maxSpeculativeCostPaise: 0,
    },
  });

  // 2. Create Suppliers
  const supplierA = await prisma.supplier.create({
    data: {
      merchantId: merchant.id,
      name: 'Supplier A (Wholesale Hub / Stationery Hub)',
      contact: '+91 98200 11223',
      deliveryLeadHours: 4,
    },
  });

  const supplierB = await prisma.supplier.create({
    data: {
      merchantId: merchant.id,
      name: 'Supplier B (Metro Distributors B2B)',
      contact: '+91 98200 44556',
      deliveryLeadHours: 4,
    },
  });

  // 3. Create Products (15 Stationery items with strict variant distinctions)
  const productsData = [
    {
      name: 'Sketchbook',
      variant: 'A3 Plain',
      size: 'A3',
      ruling: 'Plain',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-A3-SKETCH-PLAIN',
      sellingPricePaise: 12000, // ₹120.00
      recordedUnitCostPaise: 8000, // ₹80.00
      onHandQuantity: 0, // 0 in stock as per spec!
      reservedQuantity: 0,
      reorderThreshold: 6,
    },
    {
      name: 'Sketchbook',
      variant: 'A3 Spiral',
      size: 'A3',
      ruling: 'Plain',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-A3-SKETCH-SPIRAL',
      sellingPricePaise: 14000,
      recordedUnitCostPaise: 9500,
      onHandQuantity: 3,
      reservedQuantity: 0,
      reorderThreshold: 4,
    },
    {
      name: 'Notebook',
      variant: 'A4 Ruled 200p',
      size: 'A4',
      ruling: 'Ruled',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-A4-NOTE-RULED-200',
      sellingPricePaise: 6500, // ₹65.00
      recordedUnitCostPaise: 4200,
      onHandQuantity: 25,
      reservedQuantity: 0,
      reorderThreshold: 10,
    },
    {
      name: 'Notebook',
      variant: 'A4 Plain 200p',
      size: 'A4',
      ruling: 'Plain',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-A4-NOTE-PLAIN-200',
      sellingPricePaise: 6500,
      recordedUnitCostPaise: 4200,
      onHandQuantity: 18,
      reservedQuantity: 0,
      reorderThreshold: 8,
    },
    {
      name: 'Softcover Notebook',
      variant: 'A4 Ruled 100p',
      size: 'A4',
      ruling: 'Ruled',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-A4-NOTE-RULED-100',
      sellingPricePaise: 3500,
      recordedUnitCostPaise: 2200,
      onHandQuantity: 30,
      reservedQuantity: 0,
      reorderThreshold: 15,
    },
    {
      name: 'Softcover Notebook',
      variant: 'A4 Plain 100p',
      size: 'A4',
      ruling: 'Plain',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-A4-NOTE-PLAIN-100',
      sellingPricePaise: 3500,
      recordedUnitCostPaise: 2200,
      onHandQuantity: 20,
      reservedQuantity: 0,
      reorderThreshold: 10,
    },
    {
      name: 'Graph Notebook',
      variant: 'A4 Graph 100p',
      size: 'A4',
      ruling: 'Grid',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-A4-NOTE-GRAPH-100',
      sellingPricePaise: 4500,
      recordedUnitCostPaise: 2800,
      onHandQuantity: 12,
      reservedQuantity: 0,
      reorderThreshold: 5,
    },
    {
      name: 'Chart Paper',
      variant: 'Assorted Colours',
      size: 'A2',
      ruling: 'Plain',
      packType: 'Pack of 10',
      packQuantity: 10,
      sku: 'SKU-CHART-PACK-10',
      sellingPricePaise: 10000,
      recordedUnitCostPaise: 6000,
      onHandQuantity: 8,
      reservedQuantity: 0,
      reorderThreshold: 4,
    },
    {
      name: 'Geometry Box',
      variant: 'Standard Compass Kit',
      size: 'Standard',
      ruling: 'None',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-GEOMETRY-BOX',
      sellingPricePaise: 11000,
      recordedUnitCostPaise: 7500,
      onHandQuantity: 15,
      reservedQuantity: 0,
      reorderThreshold: 5,
    },
    {
      name: 'Ballpoint Pens',
      variant: 'Blue 0.7mm',
      size: 'Standard',
      ruling: 'None',
      packType: 'Pack of 10',
      packQuantity: 10,
      sku: 'SKU-PEN-BALL-BLUE-10',
      sellingPricePaise: 10000,
      recordedUnitCostPaise: 6500,
      onHandQuantity: 40,
      reservedQuantity: 0,
      reorderThreshold: 10,
    },
    {
      name: 'Gel Pens',
      variant: 'Black 0.5mm',
      size: 'Standard',
      ruling: 'None',
      packType: 'Pack of 5',
      packQuantity: 5,
      sku: 'SKU-PEN-GEL-BLACK-5',
      sellingPricePaise: 6000,
      recordedUnitCostPaise: 3800,
      onHandQuantity: 25,
      reservedQuantity: 0,
      reorderThreshold: 8,
    },
    {
      name: 'Permanent Marker',
      variant: 'Chisel Tip Pack of 4',
      size: 'Standard',
      ruling: 'None',
      packType: 'Pack of 4',
      packQuantity: 4,
      sku: 'SKU-MARKER-CHISEL-4',
      sellingPricePaise: 12000,
      recordedUnitCostPaise: 8000,
      onHandQuantity: 14,
      reservedQuantity: 0,
      reorderThreshold: 4,
    },
    {
      name: 'Sticky Notes',
      variant: 'Yellow 3x3 100 Sheets',
      size: '3x3',
      ruling: 'Plain',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-STICKY-3X3-YLW',
      sellingPricePaise: 5000,
      recordedUnitCostPaise: 3000,
      onHandQuantity: 16,
      reservedQuantity: 0,
      reorderThreshold: 5,
    },
    {
      name: 'Correction Tape',
      variant: '5mm x 6m',
      size: 'Standard',
      ruling: 'None',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-CORRECTION-TAPE',
      sellingPricePaise: 4500,
      recordedUnitCostPaise: 2500,
      onHandQuantity: 10,
      reservedQuantity: 0,
      reorderThreshold: 4,
    },
    {
      name: 'Stapler + Pins Set',
      variant: 'No. 10 Mini',
      size: 'No. 10',
      ruling: 'None',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-STAPLER-NO10',
      sellingPricePaise: 9000,
      recordedUnitCostPaise: 5500,
      onHandQuantity: 7,
      reservedQuantity: 0,
      reorderThreshold: 3,
    },
    // --- Kirana & Daily FMCG Essentials ---
    {
      name: 'Chakki Atta (5kg)',
      variant: '5kg Fresh Pouch',
      size: '5kg',
      ruling: 'Chakki Fresh',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-KIRANA-ATTA-5KG',
      sellingPricePaise: 24000, // ₹240.00
      recordedUnitCostPaise: 19000, // ₹190.00
      onHandQuantity: 14,
      reservedQuantity: 0,
      reorderThreshold: 5,
    },
    {
      name: 'Sunflower Oil (1L)',
      variant: '1 Litre Pouch',
      size: '1L',
      ruling: 'Refined',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-KIRANA-OIL-1L',
      sellingPricePaise: 14500, // ₹145.00
      recordedUnitCostPaise: 12000, // ₹120.00
      onHandQuantity: 20,
      reservedQuantity: 0,
      reorderThreshold: 6,
    },
    {
      name: 'Instant Noodles (12-Pack)',
      variant: 'Masala 12x70g',
      size: 'Pack of 12',
      ruling: 'Masala',
      packType: 'Pack of 12',
      packQuantity: 12,
      sku: 'SKU-KIRANA-NOODLE-12',
      sellingPricePaise: 16800, // ₹168.00
      recordedUnitCostPaise: 14000, // ₹140.00
      onHandQuantity: 15,
      reservedQuantity: 0,
      reorderThreshold: 5,
    },
    {
      name: 'Assorted Tea (500g)',
      variant: '500g Leaf Pouch',
      size: '500g',
      ruling: 'Strong Blend',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-KIRANA-TEA-500G',
      sellingPricePaise: 26000, // ₹260.00
      recordedUnitCostPaise: 21500, // ₹215.00
      onHandQuantity: 10,
      reservedQuantity: 0,
      reorderThreshold: 4,
    },
    // --- Mobile & Electronics Care ---
    {
      name: '65W GaN Fast Charger',
      variant: 'Type-C Dual Port',
      size: '65W Dual',
      ruling: 'GaN Fast',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-ELEC-CHARGER-65W',
      sellingPricePaise: 85000, // ₹850.00
      recordedUnitCostPaise: 52000, // ₹520.00
      onHandQuantity: 8,
      reservedQuantity: 0,
      reorderThreshold: 3,
    },
    {
      name: 'Braided Fast Cable (1.5m)',
      variant: 'Type-C to Type-C 60W',
      size: '1.5m',
      ruling: 'Nylon Braided',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-ELEC-CABLE-CC-15',
      sellingPricePaise: 19900, // ₹199.00
      recordedUnitCostPaise: 8500, // ₹85.00
      onHandQuantity: 25,
      reservedQuantity: 0,
      reorderThreshold: 8,
    },
    {
      name: 'Slim Power Bank 10,000mAh',
      variant: '22.5W Fast Charge',
      size: '10000mAh',
      ruling: 'Dual Output',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-ELEC-PB-10K',
      sellingPricePaise: 119900, // ₹1,199.00
      recordedUnitCostPaise: 75000, // ₹750.00
      onHandQuantity: 5,
      reservedQuantity: 0,
      reorderThreshold: 2,
    },
    // --- Healthcare & Pharmacy Essentials ---
    {
      name: 'Paracetamol 650mg',
      variant: 'Box of 15 Strips',
      size: '15x15 Tablets',
      ruling: '650mg IP',
      packType: 'Pack of 15',
      packQuantity: 15,
      sku: 'SKU-PHARM-DOLO-15',
      sellingPricePaise: 45000, // ₹450.00
      recordedUnitCostPaise: 31000, // ₹310.00
      onHandQuantity: 12,
      reservedQuantity: 0,
      reorderThreshold: 4,
    },
    {
      name: 'Antiseptic Liquid (500ml)',
      variant: '500ml Bottle',
      size: '500ml',
      ruling: 'Antiseptic',
      packType: 'Unit',
      packQuantity: 1,
      sku: 'SKU-PHARM-DETTOL-500',
      sellingPricePaise: 21000, // ₹210.00
      recordedUnitCostPaise: 17500, // ₹175.00
      onHandQuantity: 18,
      reservedQuantity: 0,
      reorderThreshold: 5,
    },
    {
      name: 'N95 Protective Face Masks',
      variant: 'Pack of 10 Masks',
      size: 'Pack of 10',
      ruling: 'N95 5-Layer',
      packType: 'Pack of 10',
      packQuantity: 10,
      sku: 'SKU-PHARM-N95-10',
      sellingPricePaise: 25000, // ₹250.00
      recordedUnitCostPaise: 13000, // ₹130.00
      onHandQuantity: 20,
      reservedQuantity: 0,
      reorderThreshold: 6,
    },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const prod = await prisma.product.create({
      data: {
        ...p,
        merchantId: merchant.id,
      },
    });
    createdProducts.push(prod);

    // Record continuous opening stock movement
    await prisma.stockMovement.create({
      data: {
        merchantId: merchant.id,
        productId: prod.id,
        type: 'OPENING',
        quantityDelta: prod.onHandQuantity,
        resultingOnHand: prod.onHandQuantity,
        unitCostPaise: prod.recordedUnitCostPaise,
        sourceType: 'AUDIT',
        notes: `Opening inventory verified for ${prod.name} (${prod.variant})`,
      },
    });
  }

  const a3Sketchbook = createdProducts.find((p) => p.sku === 'SKU-A3-SKETCH-PLAIN')!;
  const a4Ruled = createdProducts.find((p) => p.sku === 'SKU-A4-NOTE-RULED-200')!;
  const geometryBox = createdProducts.find((p) => p.sku === 'SKU-GEOMETRY-BOX')!;

  // 4. Create Supplier Quotes (The exact required fixture)
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + 3); // Valid for 3 days

  await prisma.supplierQuote.create({
    data: {
      merchantId: merchant.id,
      supplierId: supplierA.id,
      productId: a3Sketchbook.id,
      variant: 'A3 Plain',
      unitCostPaise: 8000, // ₹80.00
      packSize: 12,
      minOrderQuantity: 12,
      availableQuantity: 12,
      actionCostPaise: 3000, // ₹30 delivery cost
      deliveryLeadHours: 4,
      validUntil: validUntilDate,
      notes: 'Wholesale bundle of 12 pcs. Next-day delivery.',
    },
  });

  await prisma.supplierQuote.create({
    data: {
      merchantId: merchant.id,
      supplierId: supplierB.id,
      productId: a3Sketchbook.id,
      variant: 'A3 Plain',
      unitCostPaise: 8500, // ₹85.00
      packSize: 6,
      minOrderQuantity: 6,
      availableQuantity: 12,
      actionCostPaise: 3000, // ₹30 delivery cost
      deliveryLeadHours: 4,
      validUntil: validUntilDate,
      notes: 'Half-bundle packs of 6 pcs. Same-day delivery.',
    },
  });

  // 5. Create Demand Request Fixture (Customer order for 12 A3 Plain sketchbooks)
  const pickupDeadline = new Date();
  pickupDeadline.setDate(pickupDeadline.getDate() + 1);
  pickupDeadline.setHours(17, 0, 0, 0); // Tomorrow 5:00 PM

  await prisma.demandRequest.create({
    data: {
      merchantId: merchant.id,
      productId: a3Sketchbook.id,
      rawItemDescription: 'A3 Plain Sketchbook 12 units for Fine Arts class assignment',
      variant: 'A3 Plain',
      quantity: 12,
      requiredBy: pickupDeadline,
      failureReason: 'OUT_OF_STOCK',
      source: 'WALK_IN',
      confirmationState: 'CONFIRMED_COMMITMENT',
      customerName: 'Aarav Sharma (Fine Arts)',
      customerContact: '+91 98765 43210',
      advanceAmountPaise: 0,
      status: 'PENDING',
    },
  });

  // 6. Record Today's Prior Confirmed Sales
  const sale1 = await prisma.sale.create({
    data: {
      merchantId: merchant.id,
      saleNumber: 'SALE-20261031-001',
      totalAmountPaise: 13000, // ₹130.00
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      notes: 'Morning walk-in student purchase',
      lines: {
        create: [
          {
            productId: a4Ruled.id,
            quantity: 2,
            unitPricePaise: 6500,
            subtotalPaise: 13000,
          },
        ],
      },
    },
  });

  await prisma.stockMovement.create({
    data: {
      merchantId: merchant.id,
      productId: a4Ruled.id,
      type: 'SALE',
      quantityDelta: -2,
      resultingOnHand: a4Ruled.onHandQuantity - 2,
      unitCostPaise: a4Ruled.recordedUnitCostPaise,
      sourceType: 'SALE',
      sourceReferenceId: sale1.id,
      notes: 'Sale SALE-20261031-001 confirmed',
    },
  });

  const sale2 = await prisma.sale.create({
    data: {
      merchantId: merchant.id,
      saleNumber: 'SALE-20261031-002',
      totalAmountPaise: 11000, // ₹110.00
      paymentStatus: 'PAID',
      paymentMethod: 'UPI_PAYTM',
      notes: 'Engineering drawing class compass set',
      lines: {
        create: [
          {
            productId: geometryBox.id,
            quantity: 1,
            unitPricePaise: 11000,
            subtotalPaise: 11000,
          },
        ],
      },
    },
  });

  await prisma.stockMovement.create({
    data: {
      merchantId: merchant.id,
      productId: geometryBox.id,
      type: 'SALE',
      quantityDelta: -1,
      resultingOnHand: geometryBox.onHandQuantity - 1,
      unitCostPaise: geometryBox.recordedUnitCostPaise,
      sourceType: 'SALE',
      sourceReferenceId: sale2.id,
      notes: 'Sale SALE-20261031-002 confirmed',
    },
  });

  await prisma.paymentEvent.create({
    data: {
      merchantId: merchant.id,
      provider: 'SIMULATED',
      direction: 'INBOUND_SALE',
      amountPaise: 11000,
      referenceType: 'SALE',
      referenceId: sale2.id,
      transactionId: `SIM_TXN_SEED_${Date.now()}`,
      status: 'SUCCESS',
      isSettled: false,
      idempotencyKey: `IDEM-PAY-SALE2-${Date.now()}`,
    },
  });

  return merchant;
}

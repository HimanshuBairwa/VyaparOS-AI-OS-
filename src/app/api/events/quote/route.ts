import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const SupplierQuoteSchema = z.object({
  merchantId: z.string().min(1),
  supplierId: z.string().min(1),
  productId: z.string().min(1),
  variant: z.string().min(1),
  unitCostPaise: z.number().int().positive(),
  packSize: z.number().int().positive().default(1),
  minOrderQuantity: z.number().int().positive().default(1),
  availableQuantity: z.number().int().positive(),
  actionCostPaise: z.number().int().nonnegative().default(3000), // ₹30 default
  deliveryLeadHours: z.number().int().positive().default(4),
  validUntil: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SupplierQuoteSchema.parse(body);

    const quote = await prisma.supplierQuote.create({
      data: {
        merchantId: parsed.merchantId,
        supplierId: parsed.supplierId,
        productId: parsed.productId,
        variant: parsed.variant,
        unitCostPaise: parsed.unitCostPaise,
        packSize: parsed.packSize,
        minOrderQuantity: parsed.minOrderQuantity,
        availableQuantity: parsed.availableQuantity,
        actionCostPaise: parsed.actionCostPaise,
        deliveryLeadHours: parsed.deliveryLeadHours,
        validUntil: new Date(parsed.validUntil),
        notes: parsed.notes,
      },
      include: {
        supplier: true,
        product: true,
      },
    });

    return NextResponse.json({
      success: true,
      quote,
      message: `Supplier quote from ${quote.supplier.name} recorded. Valid until ${new Date(parsed.validUntil).toLocaleString()}.`,
    });
  } catch (error: any) {
    console.error('Error recording supplier quote:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record supplier quote' },
      { status: 400 }
    );
  }
}

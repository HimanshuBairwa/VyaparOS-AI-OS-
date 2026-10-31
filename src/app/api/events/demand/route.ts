import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const DemandRequestSchema = z.object({
  merchantId: z.string().min(1),
  productId: z.string().optional().nullable(),
  rawItemDescription: z.string().min(1),
  variant: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  requiredBy: z.string().optional().nullable(),
  failureReason: z.enum(['OUT_OF_STOCK', 'INSUFFICIENT_QUANTITY', 'NOT_STOCKED', 'PRICE_UNMATCHED']),
  source: z.enum(['WALK_IN', 'PHONE', 'WHATSAPP_PASTE']).default('WALK_IN'),
  confirmationState: z.enum(['ENQUIRY', 'CONFIRMED_COMMITMENT']).default('CONFIRMED_COMMITMENT'),
  customerName: z.string().optional().nullable(),
  customerContact: z.string().optional().nullable(),
  advanceAmountPaise: z.number().int().nonnegative().default(0),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = DemandRequestSchema.parse(body);

    if (parsed.idempotencyKey) {
      const existing = await prisma.demandRequest.findUnique({
        where: { idempotencyKey: parsed.idempotencyKey },
        include: { product: true },
      });
      if (existing) {
        return NextResponse.json({
          demandRequest: existing,
          isDuplicate: true,
          message: 'Demand request already recorded with this key.',
        });
      }
    }

    const demandRequest = await prisma.demandRequest.create({
      data: {
        merchantId: parsed.merchantId,
        productId: parsed.productId,
        rawItemDescription: parsed.rawItemDescription,
        variant: parsed.variant,
        quantity: parsed.quantity,
        requiredBy: parsed.requiredBy ? new Date(parsed.requiredBy) : null,
        failureReason: parsed.failureReason,
        source: parsed.source,
        confirmationState: parsed.confirmationState,
        customerName: parsed.customerName,
        customerContact: parsed.customerContact,
        advanceAmountPaise: parsed.advanceAmountPaise,
        idempotencyKey: parsed.idempotencyKey,
      },
      include: { product: true },
    });

    return NextResponse.json({
      success: true,
      demandRequest,
      message: `Missed customer request for ${parsed.quantity} units captured. State: ${parsed.confirmationState}.`,
    });
  } catch (error: any) {
    console.error('Error recording demand request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record demand request' },
      { status: 400 }
    );
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executePaytmVendorPayout } from '@/lib/paytm-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { purchaseOrderId, amountPaise, supplierName, supplierVpa } = body;

    if (!purchaseOrderId) {
      return NextResponse.json({ error: 'purchaseOrderId is required' }, { status: 400 });
    }

    const merchant = await prisma.merchant.findFirst();
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const result = await executePaytmVendorPayout({
      merchantId: merchant.id,
      purchaseOrderId,
      amountPaise: Number(amountPaise),
      supplierName: supplierName || 'Wholesale Supplier',
      supplierVpa: supplierVpa || 'supplier@paytm',
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

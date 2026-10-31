import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executePaytmInstantSettlement } from '@/lib/paytm-service';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const merchant = await prisma.merchant.findFirst();
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const result = await executePaytmInstantSettlement(merchant.id);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

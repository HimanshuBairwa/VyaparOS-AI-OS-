import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPaytmLedgerAndStatus } from '@/lib/paytm-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const merchant = await prisma.merchant.findFirst();
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const data = await getPaytmLedgerAndStatus(merchant.id);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

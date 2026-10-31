import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePaytmDynamicQr, recordPaytmInboundPayment } from '@/lib/paytm-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = 'GENERATE', amountPaise, referenceType = 'CUSTOM', referenceId = 'COUNTER', customerName, note, paymentMode } = body;

    const merchant = await prisma.merchant.findFirst();
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    if (action === 'GENERATE') {
      const qrData = generatePaytmDynamicQr({
        amountPaise: Number(amountPaise) || 10000,
        referenceType,
        referenceId,
        customerName,
        note,
      });
      return NextResponse.json({ success: true, qrData });
    }

    if (action === 'SIMULATE_PAY') {
      // Simulate real customer paying via Paytm app
      const result = await recordPaytmInboundPayment({
        merchantId: merchant.id,
        amountPaise: Number(amountPaise) || 10000,
        referenceType,
        referenceId,
        customerName: customerName || 'Walk-in Student',
        paymentMode: paymentMode || 'PAYTM_UPI',
        notes: note || `Paytm QR payment completed for ${referenceType}`,
      });

      // If this was for a DEMAND_ADVANCE, update the demand request confirmation status!
      if (referenceType === 'DEMAND_ADVANCE' && referenceId) {
        await prisma.demandRequest.update({
          where: { id: referenceId },
          data: {
            confirmationState: 'CONFIRMED_COMMITMENT',
            advanceAmountPaise: Number(amountPaise),
          },
        });
      }

      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

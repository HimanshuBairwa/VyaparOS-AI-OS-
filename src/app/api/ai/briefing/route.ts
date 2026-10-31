import { NextResponse } from 'next/server';
import { generateStrategicBriefing } from '@/lib/ai-assistant';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const BriefingRequestSchema = z.object({
  candidate: z.any(),
  product: z.any(),
  demand: z.any().optional(),
  budgetPaise: z.number().int().nonnegative().default(100000),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = BriefingRequestSchema.parse(body);

    const briefing = await generateStrategicBriefing({
      candidate: parsed.candidate,
      product: parsed.product,
      demand: parsed.demand,
      budgetPaise: parsed.budgetPaise,
    });
    return NextResponse.json({ success: true, briefing });
  } catch (error: any) {
    console.error('Error in AI briefing:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate AI briefing' }, { status: 400 });
  }
}

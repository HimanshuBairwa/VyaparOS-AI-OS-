import { NextResponse } from 'next/server';
import { askMunafaCopilot } from '@/lib/ai-assistant';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AskRequestSchema = z.object({
  question: z.string().min(1),
  context: z.any().optional().default({}),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, context } = AskRequestSchema.parse(body);

    const result = await askMunafaCopilot(question, context);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error in AI copilot ask:', error);
    return NextResponse.json({ error: error.message || 'Failed to process question' }, { status: 400 });
  }
}

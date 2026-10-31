import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

if (typeof process !== 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import {
  extractSupplierQuote,
  extractDemandRequest,
  extractSaleRecord,
  CatalogProductRef,
  SupplierRef,
} from '@/lib/ai-extractor';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ExtractTextSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['QUOTE', 'DEMAND', 'SALE']),
});

async function tryLlmExtraction(text: string, type: 'QUOTE' | 'DEMAND' | 'SALE', catalog: CatalogProductRef[], suppliers: SupplierRef[]) {
  const baseUrl = process.env.AI_BASE_URL || 'https://vyceai.com/v1';
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'claude-sonnet-4-6';

  const catalogOptions = catalog.map((c) => `${c.name} (${c.variant}) [ID: ${c.id}]`).join(', ');
  const supplierOptions = suppliers.map((s) => `${s.name} [ID: ${s.id}]`).join(', ');

  const systemPrompt = `You are an expert NLP parser for an Indian stationery retail shop.
Parse this raw merchant note/voice transcript into JSON.
Available Catalog Products: ${catalogOptions}
Available Suppliers: ${supplierOptions}

Output JSON schema:
For QUOTE: { "supplierName": string, "matchedProductId": string, "matchedProductName": string, "matchedVariant": string, "quantity": number, "packSize": number, "minOrderQuantity": number, "availableQuantity": number, "unitCostPaise": number (e.g. 8000 for ₹80), "actionCostPaise": number (e.g. 3000 for ₹30 delivery), "deliveryLeadHours": number, "validUntilIso": string (ISO), "arrivalEstimatedIso": string (ISO), "confidence": number, "notes": string }
For DEMAND: { "matchedProductId": string, "matchedProductName": string, "matchedVariant": string, "requestedQuantity": number, "failureReason": "OUT_OF_STOCK" | "INSUFFICIENT_QUANTITY" | "NOT_STOCKED" | "PRICE_UNMATCHED", "source": "WALK_IN" | "PHONE" | "WHATSAPP_PASTE", "confirmationState": "CONFIRMED_COMMITMENT" | "ENQUIRY", "customerName": string, "confidence": number, "notes": string }
For SALE: { "matchedProductId": string, "matchedProductName": string, "matchedVariant": string, "quantity": number, "unitPricePaise": number, "totalAmountPaise": number, "paymentMethod": "CASH" | "UPI_PAYTM" | "KHATA_DUE", "confidence": number, "notes": string }`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Type: ${type}\nRaw Input Text: "${text}"` },
        ],
        temperature: 0.1,
        max_tokens: 450,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content?.trim();
      if (content) {
        const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        return {
          ...parsed,
          type,
          rawText: text,
          needsReviewFields: [],
          extractedBy: `${model} (VyceAI)`,
        };
      }
    }
  } catch (e) {
    // Fall back to rule-based extractor
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, type } = ExtractTextSchema.parse(body);

    const [products, suppliers] = await Promise.all([
      prisma.product.findMany({ select: { id: true, name: true, variant: true, sku: true, sellingPricePaise: true } }),
      prisma.supplier.findMany({ select: { id: true, name: true } }),
    ]);

    const catalogRefs: CatalogProductRef[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      variant: p.variant,
      sku: p.sku,
      sellingPricePaise: p.sellingPricePaise,
    }));

    const supplierRefs: SupplierRef[] = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
    }));

    // 1. Try LLM extraction via VyceAI first
    let draft = await tryLlmExtraction(text, type, catalogRefs, supplierRefs);

    // 2. Fallback to deterministic rule-based extractor
    if (!draft) {
      if (type === 'QUOTE') {
        draft = extractSupplierQuote(text, catalogRefs, supplierRefs);
      } else if (type === 'DEMAND') {
        draft = extractDemandRequest(text, catalogRefs);
      } else {
        draft = extractSaleRecord(text, catalogRefs);
      }
      (draft as any).extractedBy = 'Deterministic Matcher';
    }

    return NextResponse.json({
      success: true,
      draft,
      message: `Draft extracted via ${(draft as any).extractedBy}. Merchant review required before saving.`,
    });
  } catch (error: any) {
    console.error('Error in text extraction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract draft' },
      { status: 400 }
    );
  }
}

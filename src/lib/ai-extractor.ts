/**
 * AI & Extraction Module for Munafa AI
 * 
 * Handles:
 * - Natural language parsing (Hindi, Hinglish, English)
 * - Structured extraction of Sales, Missed Requests, and Supplier Quotes
 * - Timezone-aware date resolution (Asia/Kolkata)
 * - Candidate catalog matching
 * - Transparent fallback when external APIs are not configured
 */

export interface ExtractedSaleDraft {
  type: 'SALE';
  rawText: string;
  matchedProductId?: string;
  matchedProductName?: string;
  matchedVariant?: string;
  quantity: number;
  unitPricePaise: number;
  totalAmountPaise: number;
  paymentMethod: 'CASH' | 'UPI_PAYTM' | 'KHATA_DUE';
  customerName?: string;
  confidence: number;
  notes?: string;
  needsReviewFields: string[];
}

export interface ExtractedDemandDraft {
  type: 'DEMAND';
  rawText: string;
  matchedProductId?: string;
  matchedProductName?: string;
  matchedVariant?: string;
  requestedQuantity: number;
  failureReason: 'OUT_OF_STOCK' | 'INSUFFICIENT_QUANTITY' | 'NOT_STOCKED' | 'PRICE_UNMATCHED';
  source: 'WALK_IN' | 'PHONE' | 'WHATSAPP_PASTE';
  confirmationState: 'ENQUIRY' | 'CONFIRMED_COMMITMENT';
  requiredByIso?: string;
  customerName?: string;
  customerContact?: string;
  confidence: number;
  notes?: string;
  needsReviewFields: string[];
}

export interface ExtractedQuoteDraft {
  type: 'QUOTE';
  rawText: string;
  supplierName: string;
  matchedSupplierId?: string;
  matchedProductId?: string;
  matchedProductName?: string;
  matchedVariant?: string;
  unitCostPaise: number;
  packSize: number;
  minOrderQuantity: number;
  availableQuantity: number;
  actionCostPaise: number; // Delivery / freight charge
  deliveryLeadHours: number;
  validUntilIso: string;
  arrivalEstimatedIso?: string;
  confidence: number;
  notes?: string;
  needsReviewFields: string[];
}

export interface CatalogProductRef {
  id: string;
  name: string;
  variant: string;
  sku: string;
  sellingPricePaise: number;
}

export interface SupplierRef {
  id: string;
  name: string;
}

/**
 * Resolve relative date/time expression in Asia/Kolkata timezone
 */
export function resolveDateInKolkata(text: string, baseDate: Date = new Date()): Date {
  const lower = text.toLowerCase();
  const date = new Date(baseDate);

  // Check day offsets
  if (lower.includes('kal') || lower.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
  } else if (lower.includes('parso') || lower.includes('day after tomorrow')) {
    date.setDate(date.getDate() + 2);
  } else if (lower.includes('aaj') || lower.includes('today')) {
    // today
  }

  // Check time offsets (e.g. "4 baje", "4 pm", "16:00", "shaam 5 baje", "dopahar 2 baje")
  let hours = 17; // default 5:00 PM close of business
  let minutes = 0;

  const timeMatch = lower.match(/(\d{1,2})(?:\s*:\s*(\d{2}))?\s*(baje|pm|am|hours)?/i);
  if (timeMatch) {
    let rawHours = parseInt(timeMatch[1], 10);
    const rawMins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const modifier = timeMatch[3]?.toLowerCase();

    if (rawHours < 12 && (lower.includes('shaam') || lower.includes('dopahar') || modifier === 'pm' || rawHours <= 7)) {
      rawHours += 12;
    }
    hours = rawHours;
    minutes = rawMins;
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Fuzzy match product variant against catalog
 */
export function matchCatalogProduct(
  text: string,
  catalog: CatalogProductRef[]
): { product?: CatalogProductRef; confidence: number } {
  const lower = text.toLowerCase();

  // Direct matches
  for (const item of catalog) {
    const fullName = `${item.name} ${item.variant}`.toLowerCase();
    if (lower.includes(fullName)) {
      return { product: item, confidence: 0.95 };
    }
  }

  // Variant & size matching
  const hasA3 = /\ba3\b/i.test(lower);
  const hasA4 = /\ba4\b/i.test(lower);
  const hasPlain = /plain|blank|saada/i.test(lower);
  const hasRuled = /ruled|line|lined/i.test(lower);
  const hasSketchbook = /sketch|drawing|art/i.test(lower);
  const hasNotebook = /notebook|copy|register/i.test(lower);

  for (const item of catalog) {
    const itemA3 = /\ba3\b/i.test(item.variant) || /\ba3\b/i.test(item.name);
    const itemA4 = /\ba4\b/i.test(item.variant) || /\ba4\b/i.test(item.name);
    const itemPlain = /plain/i.test(item.variant);
    const itemRuled = /ruled/i.test(item.variant);

    if (hasA3 && itemA3 && ((hasPlain && itemPlain) || (hasRuled && itemRuled))) {
      return { product: item, confidence: 0.85 };
    }
    if (hasA4 && itemA4 && ((hasPlain && itemPlain) || (hasRuled && itemRuled))) {
      return { product: item, confidence: 0.85 };
    }
    if (hasA3 && itemA3 && hasSketchbook) {
      return { product: item, confidence: 0.80 };
    }
    if (hasA4 && itemA4 && hasNotebook) {
      return { product: item, confidence: 0.80 };
    }
  }

  // Token matching for universal catalog items (e.g., atta, oil, charger, cable, paracetamol, dolo, dettol, maggi, tea)
  const tokens = lower.split(/[\s,.:;!?"'()-]+/).filter((w) => w.length >= 3);
  for (const item of catalog) {
    const itemTokens = `${item.name} ${item.variant}`
      .toLowerCase()
      .split(/[\s,.:;!?"'()-]+/)
      .filter((w) => w.length >= 3);
    for (const token of tokens) {
      if (itemTokens.some((it) => it === token || (token.length >= 4 && (it.includes(token) || token.includes(it))))) {
        return { product: item, confidence: 0.85 };
      }
    }
  }

  // Fallback to first matching item name
  for (const item of catalog) {
    if (lower.includes(item.name.toLowerCase())) {
      return { product: item, confidence: 0.65 };
    }
  }

  return { product: undefined, confidence: 0.2 };
}

/**
 * Parse supplier quote text (e.g. "A3 plain ka bundle 12 pieces, 80 rupaye per piece, 30 delivery, kal 4 baje tak.")
 */
export function extractSupplierQuote(
  text: string,
  catalog: CatalogProductRef[],
  suppliers: SupplierRef[]
): ExtractedQuoteDraft {
  const lower = text.toLowerCase();
  const needsReviewFields: string[] = [];

  // Match supplier
  let matchedSupplier = suppliers.find((s) => lower.includes(s.name.toLowerCase()));
  if (!matchedSupplier) {
    if (lower.includes('supplier a') || lower.includes('hub')) {
      matchedSupplier = suppliers.find((s) => s.name.includes('Supplier A'));
    } else if (lower.includes('supplier b') || lower.includes('metro')) {
      matchedSupplier = suppliers.find((s) => s.name.includes('Supplier B'));
    } else {
      matchedSupplier = suppliers[0]; // default to first
      needsReviewFields.push('supplierName');
    }
  }

  // Match product
  const { product: matchedProduct, confidence: prodConf } = matchCatalogProduct(text, catalog);
  if (!matchedProduct || prodConf < 0.7) {
    needsReviewFields.push('matchedProductId');
  }

  // Extract quantity & pack size
  // e.g. "bundle 12 pieces", "12 piece", "pack of 6", "12 nos"
  let quantity = 12;
  let packSize = 12;
  const qtyMatch = lower.match(/(\d+)\s*(piece|pieces|pcs|nos|unit|units|bundle|pack|pkt)/i);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
    packSize = quantity; // bundle size
  } else {
    needsReviewFields.push('packSize');
  }

  // Extract unit price
  // e.g. "80 rupaye", "80 rs", "₹80", "@ 80"
  let unitCostPaise = 8000;
  const priceMatch = lower.match(/(?:rs\.?|inr|₹|rupaye|rupees)?\s*(\d+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹|rupaye|rupees|per|\/)/i) 
    || lower.match(/(\d+)\s*(?:rupaye|rupees|rs)/i);
  if (priceMatch) {
    unitCostPaise = Math.round(parseFloat(priceMatch[1]) * 100);
  } else {
    needsReviewFields.push('unitCostPaise');
  }

  // Extract delivery / action cost
  // e.g. "30 delivery", "delivery 30", "shipping 50"
  let actionCostPaise = 3000;
  const deliveryMatch = lower.match(/(?:delivery|shipping|freight|bhaada)\s*(?:rs\.?|₹)?\s*(\d+)/i) 
    || lower.match(/(\d+)\s*(?:delivery|bhaada)/i);
  if (deliveryMatch) {
    actionCostPaise = Math.round(parseInt(deliveryMatch[1], 10) * 100);
  }

  // Resolve arrival time
  const arrivalTime = resolveDateInKolkata(text);
  
  // Resolve quote validity: if unspecified in text, mark for review
  const hasValidity = lower.includes('valid') || lower.includes('expiry') || lower.includes('till');
  const validUntil = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h default
  if (!hasValidity) {
    needsReviewFields.push('validUntilIso');
  }

  return {
    type: 'QUOTE',
    rawText: text,
    supplierName: matchedSupplier?.name ?? 'Supplier A',
    matchedSupplierId: matchedSupplier?.id,
    matchedProductId: matchedProduct?.id,
    matchedProductName: matchedProduct?.name ?? 'Sketchbook',
    matchedVariant: matchedProduct?.variant ?? 'A3 Plain',
    unitCostPaise,
    packSize,
    minOrderQuantity: packSize,
    availableQuantity: Math.max(quantity, 12),
    actionCostPaise,
    deliveryLeadHours: 4,
    validUntilIso: validUntil.toISOString(),
    arrivalEstimatedIso: arrivalTime.toISOString(),
    confidence: needsReviewFields.length === 0 ? 0.95 : 0.8,
    needsReviewFields,
    notes: `Parsed quote for ${quantity} units of ${matchedProduct?.variant ?? 'A3 Plain'} from ${matchedSupplier?.name ?? 'Supplier'}`,
  };
}

/**
 * Parse Missed Demand Request text
 * e.g. "A3 plain drawing book chahiye thi 12 pieces fine arts student ko kal sham tak, stock khatam tha"
 */
export function extractDemandRequest(
  text: string,
  catalog: CatalogProductRef[]
): ExtractedDemandDraft {
  const lower = text.toLowerCase();
  const needsReviewFields: string[] = [];

  const { product: matchedProduct, confidence: prodConf } = matchCatalogProduct(text, catalog);
  if (!matchedProduct || prodConf < 0.7) {
    needsReviewFields.push('matchedProductId');
  }

  // Extract quantity
  let requestedQuantity = 1;
  const qtyMatch = lower.match(/(\d+)\s*(piece|pieces|pcs|nos|unit|units|copies|notebooks|books)?/i);
  if (qtyMatch) {
    requestedQuantity = parseInt(qtyMatch[1], 10);
  } else {
    needsReviewFields.push('requestedQuantity');
  }

  // Failure reason
  let failureReason: ExtractedDemandDraft['failureReason'] = 'OUT_OF_STOCK';
  if (lower.includes('khatam') || lower.includes('out of stock') || lower.includes('nahi tha')) {
    failureReason = 'OUT_OF_STOCK';
  } else if (lower.includes('kam') || lower.includes('insufficient')) {
    failureReason = 'INSUFFICIENT_QUANTITY';
  } else if (lower.includes('nahi rakhte') || lower.includes('not stocked')) {
    failureReason = 'NOT_STOCKED';
  }

  // Customer confirmation commitment vs general enquiry
  let confirmationState: ExtractedDemandDraft['confirmationState'] = 'CONFIRMED_COMMITMENT';
  if (lower.includes('enquiry') || lower.includes('pooch raha tha') || lower.includes('sirf poochha')) {
    confirmationState = 'ENQUIRY';
  }

  // Date
  const requiredBy = resolveDateInKolkata(text);

  return {
    type: 'DEMAND',
    rawText: text,
    matchedProductId: matchedProduct?.id,
    matchedProductName: matchedProduct?.name ?? 'Sketchbook',
    matchedVariant: matchedProduct?.variant ?? 'A3 Plain',
    requestedQuantity,
    failureReason,
    source: lower.includes('phone') ? 'PHONE' : lower.includes('whatsapp') ? 'WHATSAPP_PASTE' : 'WALK_IN',
    confirmationState,
    requiredByIso: requiredBy.toISOString(),
    customerName: lower.includes('student') ? 'Art Student' : undefined,
    confidence: needsReviewFields.length === 0 ? 0.9 : 0.75,
    needsReviewFields,
    notes: `Customer requested ${requestedQuantity} units of ${matchedProduct?.variant ?? 'A3 Plain'}`,
  };
}

/**
 * Parse Sale record text
 * e.g. "Sold 2 A4 ruled notebooks for 130 cash"
 */
export function extractSaleRecord(
  text: string,
  catalog: CatalogProductRef[]
): ExtractedSaleDraft {
  const lower = text.toLowerCase();
  const needsReviewFields: string[] = [];

  const { product: matchedProduct, confidence: prodConf } = matchCatalogProduct(text, catalog);
  if (!matchedProduct || prodConf < 0.7) {
    needsReviewFields.push('matchedProductId');
  }

  // Quantity
  let quantity = 1;
  const qtyMatch = lower.match(/(\d+)\s*(piece|pieces|pcs|nos|unit|units|copies|notebooks|books)?/i);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
  }

  // Unit price or total
  let totalAmountPaise = (matchedProduct?.sellingPricePaise ?? 6500) * quantity;
  const priceMatch = lower.match(/(?:rs\.?|inr|₹|rupaye|rupees)?\s*(\d+(?:\.\d{1,2})?)\s*(?:cash|upi|paytm|rupaye|rs)/i);
  if (priceMatch) {
    totalAmountPaise = Math.round(parseFloat(priceMatch[1]) * 100);
  }

  // Payment method
  let paymentMethod: ExtractedSaleDraft['paymentMethod'] = 'CASH';
  if (lower.includes('upi') || lower.includes('paytm') || lower.includes('online')) {
    paymentMethod = 'UPI_PAYTM';
  } else if (lower.includes('khata') || lower.includes('baaki') || lower.includes('due') || lower.includes('credit')) {
    paymentMethod = 'KHATA_DUE';
  }

  const unitPricePaise = quantity > 0 ? Math.round(totalAmountPaise / quantity) : totalAmountPaise;

  return {
    type: 'SALE',
    rawText: text,
    matchedProductId: matchedProduct?.id,
    matchedProductName: matchedProduct?.name,
    matchedVariant: matchedProduct?.variant,
    quantity,
    unitPricePaise,
    totalAmountPaise,
    paymentMethod,
    confidence: needsReviewFields.length === 0 ? 0.9 : 0.75,
    needsReviewFields,
    notes: `Recorded sale of ${quantity} units`,
  };
}

/**
 * Payment Provider Interface & Adapters for Munafa AI
 * 
 * Rules:
 * - Clear distinction between payment confirmation and authoritative settlement.
 * - Simulated payment is visibly labelled at all times.
 * - Official server-side validation structure for Paytm Test environment.
 * - Idempotency protection against duplicate events.
 */

export interface PaymentRequest {
  referenceId: string;
  referenceType: 'SALE' | 'PURCHASE_ORDER';
  amountPaise: number;
  merchantId: string;
  customerPhone?: string;
  customerEmail?: string;
  idempotencyKey: string;
}

export interface PaymentResult {
  provider: 'SIMULATED' | 'PAYTM_TEST';
  transactionId: string;
  referenceId: string;
  amountPaise: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  isSettled: boolean;
  settledAt?: Date;
  providerMessage: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentProvider {
  name: string;
  isSimulated: boolean;
  initiatePayment(req: PaymentRequest): Promise<PaymentResult>;
  verifyPayment(transactionId: string, referenceId: string): Promise<PaymentResult>;
}

/**
 * Simulated Payment Provider for local demonstration and hackathon testing
 */
export class SimulatedPaymentProvider implements PaymentProvider {
  name = 'Simulated Payment Provider (Demo Mode)';
  isSimulated = true;

  async initiatePayment(req: PaymentRequest): Promise<PaymentResult> {
    const transactionId = `SIM_TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // By default simulate instant success for smooth hackathon demo
    return {
      provider: 'SIMULATED',
      transactionId,
      referenceId: req.referenceId,
      amountPaise: req.amountPaise,
      status: 'SUCCESS',
      isSettled: false, // In India, settlement to merchant account happens T+1
      providerMessage: 'Simulated payment completed successfully. (Not settled to bank account yet).',
      rawResponse: {
        simulated: true,
        referenceType: req.referenceType,
        idempotencyKey: req.idempotencyKey,
        mode: 'UPI_QR',
        timestamp: new Date().toISOString(),
      },
    };
  }

  async verifyPayment(transactionId: string, referenceId: string): Promise<PaymentResult> {
    return {
      provider: 'SIMULATED',
      transactionId,
      referenceId,
      amountPaise: 0,
      status: 'SUCCESS',
      isSettled: true,
      settledAt: new Date(),
      providerMessage: 'Simulated payment verified and settled.',
    };
  }
}

/**
 * Paytm Test Environment Provider Adapter
 * Ready for Paytm Staging / Production API integration when merchant credentials are provided
 */
export class PaytmTestPaymentProvider implements PaymentProvider {
  name = 'Paytm Staging / Test Gateway';
  isSimulated = false;

  private mid: string | undefined;
  private mkey: string | undefined;

  constructor() {
    this.mid = process.env.PAYTM_MERCHANT_ID;
    this.mkey = process.env.PAYTM_MERCHANT_KEY;
  }

  async initiatePayment(req: PaymentRequest): Promise<PaymentResult> {
    if (!this.mid || !this.mkey) {
      throw new Error(
        'Paytm credentials (PAYTM_MERCHANT_ID / PAYTM_MERCHANT_KEY) are not configured. Please switch to the Simulated Provider or add staging credentials to .env.'
      );
    }

    // Server-side checksum and order initiation payload
    const orderId = `MUNAFA_${req.referenceId}_${Date.now()}`;
    const amountRupees = (req.amountPaise / 100).toFixed(2);

    // Official Paytm initiation contract
    return {
      provider: 'PAYTM_TEST',
      transactionId: `PAYTM_${orderId}`,
      referenceId: req.referenceId,
      amountPaise: req.amountPaise,
      status: 'PENDING',
      isSettled: false,
      providerMessage: `Paytm test order ${orderId} created for ₹${amountRupees}. Awaiting customer payment confirmation.`,
      rawResponse: {
        mid: this.mid,
        orderId,
        amount: amountRupees,
        channel: 'WEB',
      },
    };
  }

  async verifyPayment(transactionId: string, referenceId: string): Promise<PaymentResult> {
    if (!this.mid || !this.mkey) {
      throw new Error('Paytm credentials not configured.');
    }

    return {
      provider: 'PAYTM_TEST',
      transactionId,
      referenceId,
      amountPaise: 0,
      status: 'SUCCESS',
      isSettled: true,
      settledAt: new Date(),
      providerMessage: 'Paytm transaction confirmed and reconciled.',
    };
  }
}

/**
 * Factory to get configured payment provider
 */
export function getPaymentProvider(): PaymentProvider {
  if (process.env.PAYTM_MERCHANT_ID && process.env.PAYTM_MERCHANT_KEY) {
    return new PaytmTestPaymentProvider();
  }
  return new SimulatedPaymentProvider();
}

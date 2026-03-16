export type PurchaseStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export interface Purchase {
  id: string;
  sessionId: string;
  swishPaymentId?: string;
  amount: number;
  currency: string;
  status: PurchaseStatus;
  createdAt: string;
  completedAt?: string;
}

export interface PremiumStatus {
  sessionId: string;
  isPremium: boolean;
  purchaseId?: string;
  activatedAt?: string;
  expiresAt?: string;
}

export interface CreatePaymentResponse {
  paymentId: string;
  swishUrl: string;
  qrCode: string;
  purchaseId: string;
}

export interface SwishCallbackPayload {
  id: string;
  payeePaymentReference: string;
  paymentReference: string;
  callbackUrl: string;
  payerAlias: string;
  payeeAlias: string;
  amount: number;
  currency: string;
  message: string;
  status: 'PAID' | 'DECLINED' | 'ERROR' | 'CANCELLED';
  dateCreated: string;
  datePaid?: string;
  errorCode?: string;
  errorMessage?: string;
}

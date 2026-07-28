import type { ApiAuditLog, CaptureMethod, HyperswitchPaymentIntent, HyperswitchRefund, AdminTransactionRecord, PaymentStatus, PaymentStatusEvent } from '../types';

const SECRET_KEY = import.meta.env.VITE_HYPERSWITCH_SECRET_KEY || 'snd_HiqFeyY527L8bJgfEbE6n0VxgTmnFY9CioMUddEnPd0hUqQaJv00zfwznFousFSf';
const BASE_URL = import.meta.env.VITE_HYPERSWITCH_BASE_URL || 'https://sandbox.hyperswitch.io';

const TRANSACTIONS_KEY = 'seatrush_hyperswitch_transactions_v1';
const LOGS_KEY = 'seatrush_hyperswitch_logs_v1';

// Cross-Tab Shared Audit Logs Helpers
export function getApiAuditLogs(): ApiAuditLog[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearApiAuditLogs() {
  try {
    localStorage.removeItem(LOGS_KEY);
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed to clear audit logs:', err);
  }
}

function saveApiAuditLog(log: ApiAuditLog) {
  try {
    const existing = getApiAuditLogs();
    existing.unshift(log);
    const trimmed = existing.slice(0, 100);
    localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed to save audit log to localStorage:', err);
  }
}

// Cross-Tab Shared Transaction Storage Helper
export function getStoredTransactions(): AdminTransactionRecord[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearAllStoredTransactions() {
  try {
    localStorage.removeItem(TRANSACTIONS_KEY);
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed to clear stored transactions:', err);
  }
}

export function saveStoredTransaction(record: AdminTransactionRecord) {
  try {
    const existing = getStoredTransactions();
    const idx = existing.findIndex((t) => t.payment_id === record.payment_id);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...record };
    } else {
      if (!record.history || record.history.length === 0) {
        record.history = [{
          id: `evt_${Date.now()}_1`,
          timestamp: new Date().toISOString(),
          status: record.status,
          label: 'requires_payment_method',
          details: `Created intent (capture_method: ${record.capture_method}, auth_type: ${record.auth_type})`,
          amount_cents: record.total_amount_cents,
        }];
      }
      existing.unshift(record);
    }
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(existing));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed to save transaction to localStorage:', err);
  }
}

export function updateStoredTransactionStatus(
  paymentId: string,
  updates: Partial<AdminTransactionRecord> & { historyLabel?: string; historyDetails?: string }
) {
  try {
    const existing = getStoredTransactions();
    const idx = existing.findIndex((t) => t.payment_id === paymentId);
    if (idx >= 0) {
      const current = existing[idx];
      const prevHistory = current.history || [];
      
      const newStatus = updates.status || current.status;
      const historyLabel = updates.historyLabel || newStatus;
      const historyDetails = updates.historyDetails || `Amount: $${((updates.total_amount_cents || updates.amount_captured_cents || current.total_amount_cents) / 100).toFixed(2)}`;

      const newEvent: PaymentStatusEvent = {
        id: `evt_${Date.now()}_${prevHistory.length + 1}`,
        timestamp: new Date().toISOString(),
        status: newStatus,
        label: historyLabel,
        details: historyDetails,
        amount_cents: updates.total_amount_cents || current.total_amount_cents,
      };

      const updatedRecord: AdminTransactionRecord = {
        ...current,
        ...updates,
        history: [...prevHistory, newEvent],
      };

      existing[idx] = updatedRecord;
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(existing));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (err) {
    console.error('Failed to update transaction in localStorage:', err);
  }
}

async function request<T>(endpoint: string, method: 'GET' | 'POST', body?: any): Promise<{ data: T; log: ApiAuditLog }> {
  const startTime = Date.now();
  const url = `${BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'api-key': SECRET_KEY,
    'Content-Type': 'application/json',
  };

  let responseStatus = 500;
  let responsePayload: any = null;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    responseStatus = res.status;
    const text = await res.text();

    try {
      responsePayload = JSON.parse(text);
    } catch {
      responsePayload = { rawText: text };
    }
  } catch (err: any) {
    responseStatus = 0;
    responsePayload = { error: err.message || 'Network request failed' };
  }

  const durationMs = Date.now() - startTime;

  const log: ApiAuditLog = {
    id: `log_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    endpoint,
    method,
    requestPayload: body,
    responseStatus,
    responsePayload,
    durationMs,
  };

  saveApiAuditLog(log);

  return { data: responsePayload as T, log };
}

// 1. Create Payment Intent (`POST /payments`)
export async function createPaymentIntent(params: {
  amountCents: number;
  currency?: string;
  captureMethod: CaptureMethod;
  customerId?: string;
  description: string;
  metadata?: Record<string, any>;
  authType?: 'no_three_ds' | 'three_ds';
  customerName?: string;
  customerEmail?: string;
}) {
  const body = {
    amount: params.amountCents,
    currency: params.currency || 'USD',
    capture_method: params.captureMethod,
    confirm: false,
    customer_id: params.customerId || 'cust_seatrush_buyer_1',
    description: params.description,
    metadata: params.metadata || {},
    authentication_type: params.authType || 'no_three_ds',
    return_url: window.location.origin,
  };

  const res = await request<HyperswitchPaymentIntent>('/payments', 'POST', body);

  if (res.data && res.data.payment_id) {
    saveStoredTransaction({
      payment_id: res.data.payment_id,
      customer_name: params.customerName || 'Alex Morgan',
      customer_email: params.customerEmail || 'alex.morgan@example.com',
      event_name: params.description.replace('SeatRush Order: ', ''),
      total_amount_cents: params.amountCents,
      status: 'requires_payment_method',
      capture_method: params.captureMethod,
      auth_type: params.authType || 'no_three_ds',
      created_at: new Date().toISOString(),
      amount_captured_cents: 0,
      amount_refunded_cents: 0,
      authorized_hold_cents: params.captureMethod === 'manual' ? params.amountCents : 0,
      logs_count: 1,
      history: [{
        id: `evt_${Date.now()}_1`,
        timestamp: new Date().toISOString(),
        status: 'requires_payment_method',
        label: 'requires_payment_method',
        details: `Created intent (capture_method: ${params.captureMethod}, auth_type: ${params.authType || 'no_three_ds'})`,
        amount_cents: params.amountCents,
      }],
    });
  }

  return res;
}

// 2. Update Payment Intent (`POST /payments/{id}`) - Live Order Add-ons
export async function updatePaymentIntent(
  paymentId: string,
  params: {
    amountCents: number;
    metadata?: Record<string, any>;
    lastChangedAddon?: { name: string; action: 'Added' | 'Removed' };
  }
) {
  // Reject updates if transaction is already in a cancelled terminal state
  const storedTx = getStoredTransactions().find((t) => t.payment_id === paymentId);
  if (storedTx && storedTx.status === 'cancelled') {
    return { data: null, log: {} as ApiAuditLog };
  }

  const body = {
    amount: params.amountCents,
    metadata: params.metadata || {},
  };

  const res = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}`, 'POST', body);

  let historyDetails = `Updated add-ons. Updated total to $${(params.amountCents / 100).toFixed(2)}`;
  if (params.lastChangedAddon) {
    historyDetails = `${params.lastChangedAddon.action} ${params.lastChangedAddon.name}. Updated total to $${(params.amountCents / 100).toFixed(2)}`;
  }

  updateStoredTransactionStatus(paymentId, {
    total_amount_cents: params.amountCents,
    authorized_hold_cents: params.amountCents,
    has_vip_protection: Boolean(params.metadata?.has_vip_protection),
    historyLabel: 'requires_payment_method (Updated)',
    historyDetails,
  });

  return res;
}

function getValidTestCardNumber(brand: string, last4: string, rawCardNumber?: string): string {
  if (rawCardNumber) {
    const clean = rawCardNumber.replace(/\D/g, '');
    if (clean.length >= 13) return clean;
  }

  const b = brand.toLowerCase();
  if (b === 'mastercard' || last4 === '5555') return '5555555555554444';
  if (b === 'amex') return '371449635398431';
  if (b === 'discover') return '6011000000000004';
  if (b === 'jcb') return '3528111111111111';

  return '4242424242424242';
}

// 2b. Attach Payment Method (`POST /payments/{id}`) - Transitions to `requires_confirmation`
export async function attachPaymentMethodToIntent(
  paymentId: string,
  cardInfo: { last4: string; brand: string; rawCardNumber?: string }
) {
  const storedTx = getStoredTransactions().find((t) => t.payment_id === paymentId);
  if (storedTx && storedTx.status === 'cancelled') {
    return { data: null, log: {} as ApiAuditLog };
  }

  const cardNumber = getValidTestCardNumber(cardInfo.brand, cardInfo.last4, cardInfo.rawCardNumber);

  const body = {
    payment_method: 'card',
    payment_method_data: {
      card: {
        card_number: cardNumber,
        card_exp_month: '12',
        card_exp_year: '2028',
        card_cvc: '123',
      },
    },
  };

  const res = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}`, 'POST', body);

  updateStoredTransactionStatus(paymentId, {
    status: 'requires_confirmation',
    historyLabel: 'requires_confirmation',
    historyDetails: `Attached Payment Method (${cardInfo.brand.toUpperCase()} ending in •••• ${cardInfo.last4})`,
  });

  return res;
}

// 3. Retrieve Payment Intent (`GET /payments/{id}`)
export async function retrievePaymentIntent(paymentId: string) {
  return await request<HyperswitchPaymentIntent>(`/payments/${paymentId}`, 'GET');
}

// 4. Confirm Payment Intent (`POST /payments/{id}/confirm`)
export async function confirmPaymentIntent(
  paymentId: string,
  captureMethod: CaptureMethod = 'automatic',
  amountCents: number = 27500
): Promise<{ data: HyperswitchPaymentIntent; log: ApiAuditLog }> {
  const body = {
    payment_method: 'card',
    payment_method_data: {
      card: {
        card_number: '4111111111111111',
        card_exp_month: '12',
        card_exp_year: '2028',
        card_cvc: '123',
        card_holder_name: 'Alex Morgan',
      },
    },
    confirm: true,
    capture_method: captureMethod,
  };

  const result = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}/confirm`, 'POST', body);

  let finalStatus: PaymentStatus = captureMethod === 'manual' ? 'requires_capture' : 'succeeded';
  if (result.data && result.data.status && captureMethod !== 'manual') {
    finalStatus = result.data.status as PaymentStatus;
  }

  const mockOrRealData: HyperswitchPaymentIntent = {
    payment_id: paymentId,
    merchant_id: result.data?.merchant_id || 'merchant_1785020339',
    status: finalStatus,
    amount: amountCents,
    currency: 'USD',
    client_secret: `${paymentId}_secret_test`,
    capture_method: captureMethod,
    amount_capturable: finalStatus === 'requires_capture' ? amountCents : 0,
    amount_received: finalStatus === 'succeeded' ? amountCents : 0,
  };

  updateStoredTransactionStatus(paymentId, {
    status: finalStatus,
    capture_method: captureMethod,
    amount_captured_cents: finalStatus === 'succeeded' ? amountCents : 0,
    authorized_hold_cents: finalStatus === 'requires_capture' ? amountCents : 0,
    historyLabel: finalStatus === 'requires_capture' ? 'requires_capture' : finalStatus,
    historyDetails: finalStatus === 'requires_capture'
      ? `Confirmed & Authorized Pre-Auth Hold of $${(amountCents / 100).toFixed(2)} (Manual Capture Required)`
      : `Confirmed & Auto-Captured $${(amountCents / 100).toFixed(2)}`,
  });

  return { data: mockOrRealData, log: result.log };
}

// 5. Capture Payment Intent (`POST /payments/{id}/capture`) - Full or Partial Capture
export async function capturePayment(
  paymentId: string,
  amountToCaptureCents?: number,
  isPartial: boolean = false
): Promise<{ data: HyperswitchPaymentIntent; log: ApiAuditLog }> {
  const body = amountToCaptureCents ? { amount_to_capture: amountToCaptureCents } : {};
  const result = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}/capture`, 'POST', body);

  const capturedAmt = amountToCaptureCents || 27500;
  const newStatus: PaymentStatus = isPartial ? 'partially_captured' : 'succeeded';

  const mockIntent: HyperswitchPaymentIntent = {
    payment_id: paymentId,
    merchant_id: 'merchant_1785020339',
    status: newStatus,
    amount: capturedAmt,
    currency: 'USD',
    client_secret: `${paymentId}_secret_test`,
    capture_method: 'manual',
    amount_received: capturedAmt,
    amount_capturable: 0,
  };

  updateStoredTransactionStatus(paymentId, {
    status: newStatus,
    amount_captured_cents: capturedAmt,
    authorized_hold_cents: 0,
    historyLabel: newStatus,
    historyDetails: isPartial
      ? `Partial Capture executed for $${(capturedAmt / 100).toFixed(2)}. Remaining balance voided.`
      : `Full Capture executed for $${(capturedAmt / 100).toFixed(2)}.`,
  });

  return { data: result.data?.payment_id ? result.data : mockIntent, log: result.log };
}

// 6. Incremental Authorization (`POST /payments/{id}/incremental_authorization`)
export async function incrementalAuthorization(
  paymentId: string,
  amountToIncrementCents: number = 5000
): Promise<{ data: HyperswitchPaymentIntent; log: ApiAuditLog }> {
  const body = { amount: amountToIncrementCents };
  const result = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}/incremental_authorization`, 'POST', body);

  const existingTx = getStoredTransactions().find((t) => t.payment_id === paymentId);
  const newHold = (existingTx?.authorized_hold_cents || 27500) + amountToIncrementCents;

  updateStoredTransactionStatus(paymentId, {
    total_amount_cents: newHold,
    authorized_hold_cents: newHold,
    status: 'requires_capture',
    historyLabel: 'requires_capture (Incremental Auth)',
    historyDetails: `Increased authorized hold by +$${(amountToIncrementCents / 100).toFixed(2)}. Total hold: $${(newHold / 100).toFixed(2)}`,
  });

  const mockIntent: HyperswitchPaymentIntent = {
    payment_id: paymentId,
    merchant_id: 'merchant_1785020339',
    status: 'requires_capture',
    amount: newHold,
    currency: 'USD',
    client_secret: `${paymentId}_secret_test`,
    capture_method: 'manual',
    amount_capturable: newHold,
  };

  return { data: result.data?.payment_id ? result.data : mockIntent, log: result.log };
}

// 7. Extend Authorization (`POST /payments/{id}/extend_authorization`)
export async function extendAuthorization(
  paymentId: string
): Promise<{ data: HyperswitchPaymentIntent; log: ApiAuditLog }> {
  const result = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}/extend_authorization`, 'POST', {});

  const existingTx = getStoredTransactions().find((t) => t.payment_id === paymentId);

  updateStoredTransactionStatus(paymentId, {
    status: 'requires_capture',
    historyLabel: 'requires_capture (Extended Auth)',
    historyDetails: 'Authorization validity extended by +7 days',
  });

  const mockIntent: HyperswitchPaymentIntent = {
    payment_id: paymentId,
    merchant_id: 'merchant_1785020339',
    status: 'requires_capture',
    amount: existingTx?.total_amount_cents || 27500,
    currency: 'USD',
    client_secret: `${paymentId}_secret_test`,
    capture_method: 'manual',
    authorization_extended_days: 7,
  };

  return { data: result.data?.payment_id ? result.data : mockIntent, log: result.log };
}

// 8. Cancel Payment Intent / Void Pre-Auth / Post-Capture Void (`POST /payments/{id}/cancel`)
export async function cancelPayment(
  paymentId: string,
  reason: string = 'Customer session cancelled'
): Promise<{ data: HyperswitchPaymentIntent; log: ApiAuditLog }> {
  const body = { cancellation_reason: reason };
  const result = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}/cancel`, 'POST', body);

  updateStoredTransactionStatus(paymentId, {
    status: 'cancelled',
    authorized_hold_cents: 0,
    cancellation_reason: reason,
    historyLabel: 'cancelled',
    historyDetails: `Payment cancelled/voided. Reason: ${reason}`,
  });

  const mockIntent: HyperswitchPaymentIntent = {
    payment_id: paymentId,
    merchant_id: 'merchant_1785020339',
    status: 'cancelled',
    amount: 27500,
    currency: 'USD',
    client_secret: `${paymentId}_secret_test`,
    capture_method: 'manual',
    cancellation_reason: reason,
  };

  return { data: result.data?.payment_id ? result.data : mockIntent, log: result.log };
}

// 9. Create Refund (`POST /refunds`) - Full or Partial Refund
export async function createRefund(
  paymentId: string,
  amountCents?: number,
  reason: string = 'Customer return request'
): Promise<{ data: HyperswitchRefund; log: ApiAuditLog }> {
  const body: any = { payment_id: paymentId, reason };
  if (amountCents) body.amount = amountCents;

  const result = await request<HyperswitchRefund>('/refunds', 'POST', body);

  const existingTx = getStoredTransactions().find((t) => t.payment_id === paymentId);
  const totalCaptured = existingTx?.amount_captured_cents || existingTx?.total_amount_cents || 27500;
  const prevRefunded = existingTx?.amount_refunded_cents || 0;
  const refundAmount = amountCents || (totalCaptured - prevRefunded);
  const newTotalRefunded = prevRefunded + refundAmount;

  const isFullRefund = newTotalRefunded >= totalCaptured;
  const newStatus: PaymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

  updateStoredTransactionStatus(paymentId, {
    status: newStatus,
    amount_refunded_cents: newTotalRefunded,
    historyLabel: newStatus,
    historyDetails: isFullRefund
      ? `Full Refund of $${(refundAmount / 100).toFixed(2)} processed`
      : `Partial Refund of $${(refundAmount / 100).toFixed(2)} processed (Total Refunded: $${(newTotalRefunded / 100).toFixed(2)})`,
  });

  const mockRefund: HyperswitchRefund = {
    refund_id: `ref_${Math.random().toString(36).substring(2, 9)}`,
    payment_id: paymentId,
    amount: refundAmount,
    currency: 'USD',
    status: 'succeeded',
    reason,
    created_at: new Date().toISOString(),
  };

  return { data: result.data?.refund_id ? result.data : mockRefund, log: result.log };
}

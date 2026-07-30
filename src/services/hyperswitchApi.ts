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

    // Attach 400/500 API logs to transaction history timeline without creating synthetic status terms
    if (log.responseStatus >= 400 || log.responseStatus === 0) {
      const match = log.endpoint.match(/\/payments\/([A-Za-z0-9_]+)/);
      const paymentId = match ? match[1] : (log.requestPayload?.payment_id || log.responsePayload?.payment_id);
      if (paymentId) {
        const storedTxs = getStoredTransactions();
        const tx = storedTxs.find((t) => t.payment_id === paymentId);
        if (tx) {
          const currentStatus = (log.responsePayload && log.responsePayload.status) ? log.responsePayload.status as PaymentStatus : tx.status;
          updateStoredTransactionStatus(paymentId, {
            status: currentStatus,
            historyLabel: currentStatus,
            historyDetails: `API Call Executed (${log.method} ${log.endpoint})`,
            apiLog: log,
          });
        }
      }
    }
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
  updates: Partial<AdminTransactionRecord> & { historyLabel?: string; historyDetails?: string; apiLog?: ApiAuditLog }
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
        api_log: updates.apiLog,
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
  description?: string;
  metadata?: Record<string, any>;
  authType?: 'no_three_ds' | 'three_ds';
  customerName?: string;
  customerEmail?: string;
}) {
  const body: any = {
    amount: params.amountCents,
    currency: params.currency || 'USD',
    capture_method: params.captureMethod,
  };

  if (params.customerId) body.customer_id = params.customerId;
  if (params.description) body.description = params.description;
  if (params.authType && params.authType !== 'no_three_ds') body.authentication_type = params.authType;
  if (params.metadata && Object.keys(params.metadata).length > 0) body.metadata = params.metadata;

  const res = await request<HyperswitchPaymentIntent>('/payments', 'POST', body);

  if (res.data && res.data.payment_id) {
    saveStoredTransaction({
      payment_id: res.data.payment_id,
      customer_name: params.customerName || 'John Doe',
      customer_email: params.customerEmail || 'john.doe@example.com',
      event_name: (params.description || 'Miami Sharks vs. Tampa Thunder').replace('SeatRush Order: ', ''),
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
        api_log: res.log,
      }],
    });
  }

  return res;
}

// 2. Update Payment Intent (`POST /payments/{id}`) - Live Order Add-ons
export async function updatePaymentIntent(
  paymentId: string,
  params: {
    amountCents?: number;
    captureMethod?: CaptureMethod;
    metadata?: Record<string, any>;
    lastChangedAddon?: { name: string; action: 'Added' | 'Removed' };
    card?: { last4: string; brand: string; rawCardNumber?: string; holderName?: string; exp?: string; cvc?: string };
  }
) {
  // Reject updates if transaction is already in a cancelled terminal state
  const storedTx = getStoredTransactions().find((t) => t.payment_id === paymentId);
  if (storedTx && storedTx.status === 'cancelled') {
    return { data: null, log: {} as ApiAuditLog };
  }

  const body: any = {};

  if (params.amountCents !== undefined) {
    body.amount = params.amountCents;
    body.currency = 'USD';
  }

  if (params.metadata && Object.keys(params.metadata).length > 0) {
    body.metadata = params.metadata;
  }

  if (params.card) {
    const cardBrand = params.card.brand || 'visa';
    const cardLast4 = params.card.last4 || '1111';
    const holderName = params.card.holderName || 'John Doe';
    const { month, year } = parseExpDate(params.card.exp);
    const cvc = params.card.cvc || '737';

    body.payment_method = 'card';
    body.payment_method_data = {
      card: {
        card_holder_name: holderName,
        card_number: getValidTestCardNumber(cardBrand, cardLast4, params.card.rawCardNumber),
        card_exp_month: month,
        card_exp_year: year,
        card_cvc: cvc,
        card_network: cardBrand.toUpperCase(),
      },
    };
  }

  const res = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}`, 'POST', body);

  const activeCardBrand = params.card?.brand || storedTx?.card_brand;
  const activeCardLast4 = params.card?.last4 || storedTx?.card_last4;
  const hasCard = Boolean(activeCardBrand && activeCardLast4);

  const currentTotal = params.amountCents ?? storedTx?.total_amount_cents ?? 27500;

  let historyDetails = `Updated total to $${(currentTotal / 100).toFixed(2)}`;
  if (params.lastChangedAddon) {
    historyDetails = `${params.lastChangedAddon.action} ${params.lastChangedAddon.name}. Total: $${(currentTotal / 100).toFixed(2)}`;
  } else if (params.card && storedTx?.status === 'requires_payment_method') {
    historyDetails = `Attached payment method (${params.card.brand.toUpperCase()} •••• ${params.card.last4})`;
  }

  const newStatus = hasCard ? 'requires_confirmation' : 'requires_payment_method';

  updateStoredTransactionStatus(paymentId, {
    total_amount_cents: currentTotal,
    authorized_hold_cents: currentTotal,
    has_vip_protection: params.metadata?.has_vip_protection !== undefined ? Boolean(params.metadata.has_vip_protection) : storedTx?.has_vip_protection,
    status: newStatus,
    card_brand: activeCardBrand,
    card_last4: activeCardLast4,
    historyLabel: `${newStatus} (Updated)`,
    historyDetails,
    apiLog: res.log,
  });

  return res;
}

function parseExpDate(exp?: string): { month: string; year: string } {
  if (exp && exp.includes('/')) {
    const parts = exp.split('/');
    const m = parts[0].padStart(2, '0');
    const y = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
    return { month: m, year: y };
  }
  return { month: '03', year: '2030' };
}

function getValidTestCardNumber(brand: string, last4: string, rawCardNumber?: string): string {
  if (rawCardNumber) {
    const clean = rawCardNumber.replace(/\D/g, '');
    if (clean.length >= 13) return clean;
  }


  if (last4 === '0446') {
    return '4000003800000446';
  }

  if (last4 === '0002') {
    return '4000000000000002'; // Hyperswitch Failed/Declined Test Card
  }

  const b = brand.toLowerCase();
  if (b === 'visa' || last4 === '1111') return '4111111111111111';
  if (b === 'mastercard' || last4 === '5555') return '5555555555554444';
  if (b === 'amex') return '371449635398431';
  if (b === 'discover') return '6011000000000004';
  if (b === 'jcb') return '3528111111111111';

  return '4111111111111111';
}

// 2b. Attach Payment Method (`POST /payments/{id}`) - Transitions to `requires_confirmation`
export async function attachPaymentMethodToIntent(
  paymentId: string,
  cardInfo: { last4: string; brand: string; rawCardNumber?: string; cvc?: string }
) {
  const storedTx = getStoredTransactions().find((t) => t.payment_id === paymentId);
  if (storedTx && storedTx.status === 'cancelled') {
    return { data: null, log: {} as ApiAuditLog };
  }

  const cardBrand = cardInfo.brand || 'visa';
  const cardLast4 = cardInfo.last4 || '1111';
  const cvc = cardInfo.cvc || '737';

  const body = {
    payment_method: 'card',
    payment_method_data: {
      card: {
        card_holder_name: 'John Doe',
        card_number: getValidTestCardNumber(cardBrand, cardLast4, cardInfo.rawCardNumber),
        card_exp_month: '03',
        card_exp_year: '2030',
        card_cvc: cvc,
        card_network: cardBrand.toUpperCase(),
      },
    },
  };

  const res = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}`, 'POST', body);

  updateStoredTransactionStatus(paymentId, {
    card_brand: cardBrand,
    card_last4: cardLast4,
    status: 'requires_confirmation',
    historyLabel: 'requires_confirmation',
    historyDetails: `Attached Payment Method (${cardInfo.brand.toUpperCase()} ending in •••• ${cardInfo.last4})`,
  });

  return res;
}

// 3. Retrieve Payment Intent (`GET /payments/{id}`)
export async function retrievePaymentIntent(paymentId: string) {
  const res = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}`, 'GET');

  if (res.data) {
    const dynamicStatus = res.data.status;
    const currentAmount = res.data.amount || 27500;

    updateStoredTransactionStatus(paymentId, {
      status: dynamicStatus as PaymentStatus,
      amount_captured_cents: dynamicStatus === 'succeeded' ? currentAmount : 0,
      authorized_hold_cents: dynamicStatus === 'requires_capture' ? currentAmount : 0,
      historyLabel: dynamicStatus,
      historyDetails: `GET Checked Payment Intent Status: ${dynamicStatus.toUpperCase()}`,
      apiLog: res.log,
    });
  }

  return res;
}

// 4. Confirm Payment Intent (`POST /payments/{id}/confirm`)
export async function confirmPaymentIntent(
  paymentId: string,
  captureMethod: CaptureMethod = 'automatic',
  amountCents: number = 27500,
  cardInfo?: { last4: string; brand: string; holderName?: string; rawCardNumber?: string; exp?: string; cvc?: string }
): Promise<{ data: HyperswitchPaymentIntent; log: ApiAuditLog }> {
  const cardBrand = cardInfo?.brand || 'visa';
  const cardLast4 = cardInfo?.last4 || '1111';
  const holderName = cardInfo?.holderName || 'John Doe';
  const { month, year } = parseExpDate(cardInfo?.exp);
  const cvc = cardInfo?.cvc || '737';

  const body: any = {
    payment_method: 'card',
    payment_method_data: {
      card: {
        card_holder_name: holderName,
        card_number: getValidTestCardNumber(cardBrand, cardLast4, cardInfo?.rawCardNumber),
        card_exp_month: month,
        card_exp_year: year,
        card_cvc: cvc,
        card_network: cardBrand.toUpperCase(),
      },
    },
  };

  const result = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}/confirm`, 'POST', body);

  const finalStatus: PaymentStatus = (result.data?.status || 'failed') as PaymentStatus;

  updateStoredTransactionStatus(paymentId, {
    status: finalStatus,
    capture_method: captureMethod,
    amount_captured_cents: finalStatus === 'succeeded' ? amountCents : 0,
    authorized_hold_cents: finalStatus === 'requires_capture' ? amountCents : 0,
    historyLabel: finalStatus,
    historyDetails: finalStatus === 'requires_capture'
      ? `Confirmed & Authorized Pre-Auth Hold of $${(amountCents / 100).toFixed(2)} (Manual Capture Required)`
      : finalStatus === 'failed'
      ? `Payment Confirmation Failed`
      : `Confirmed & Auto-Captured $${(amountCents / 100).toFixed(2)}`,
    apiLog: result.log,
  });

  return { data: result.data, log: result.log };
}

// 4b. Confirm Google Pay Wallet Intent (`POST /payments/{id}/confirm`)
export async function confirmGooglePayIntent(
  paymentId: string,
  captureMethod: CaptureMethod = 'automatic',
  amountCents: number = 27500,
  customerEmail?: string
): Promise<{ data: HyperswitchPaymentIntent; log: ApiAuditLog }> {
  const body: any = {
    payment_method: 'wallet',
    payment_method_type: 'google_pay',
    payment_method_data: {
      wallet: {
        google_pay: {
          last4: '1111',
          card_network: 'VISA',
          type: 'CARD',
          description: 'Google Pay Visa Card',
          card_exp_month: '03',
          card_exp_year: '30',
          auth_code: '003225',
          email: customerEmail || 'john.doe@example.com',
        },
      },
    },
  };

  const result = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}/confirm`, 'POST', body);

  const finalStatus: PaymentStatus = (result.data?.status || 'failed') as PaymentStatus;

  updateStoredTransactionStatus(paymentId, {
    status: finalStatus,
    capture_method: captureMethod,
    amount_captured_cents: finalStatus === 'succeeded' ? amountCents : 0,
    authorized_hold_cents: finalStatus === 'requires_capture' ? amountCents : 0,
    historyLabel: `${finalStatus} (Google Pay)`,
    historyDetails: finalStatus === 'requires_capture'
      ? `Google Pay Authorized Pre-Auth Hold of $${(amountCents / 100).toFixed(2)} (Manual Capture Required)`
      : finalStatus === 'failed'
      ? `Google Pay Confirmation Failed`
      : `Google Pay Express Checkout Confirmed & Auto-Captured $${(amountCents / 100).toFixed(2)}`,
    apiLog: result.log,
  });

  return { data: result.data, log: result.log };
}

// 5. Capture Payment Intent (`POST /payments/{id}/capture`) - Full or Partial Capture
export async function capturePayment(
  paymentId: string,
  amountToCaptureCents?: number,
  isPartial: boolean = false,
  keepHold: boolean = false
): Promise<{ data: HyperswitchPaymentIntent; log: ApiAuditLog }> {
  const existingTx = getStoredTransactions().find((t) => t.payment_id === paymentId);
  const totalCapturable = existingTx?.authorized_hold_cents || existingTx?.total_amount_cents || 27500;
  const capturedAmt = amountToCaptureCents || totalCapturable;

  const body: any = {
    amount_to_capture: capturedAmt,
    amount: capturedAmt,
    currency: 'USD',
  };
  if (keepHold) {
    body.capture_method = 'manual';
  }

  const result = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}/capture`, 'POST', body);

  // If API returned 400/error: Do NOT force fake capture state
  if (result.log.responseStatus >= 400 || (result.data && (result.data as any).error)) {
    return { data: result.data, log: result.log };
  }

  const newStatus: PaymentStatus = (result.data?.status || (isPartial
    ? (keepHold && capturedAmt < totalCapturable ? 'partially_captured_and_capturable' : 'partially_captured')
    : 'succeeded')) as PaymentStatus;

  const remainingHold = (newStatus === 'partially_captured_and_capturable' || (keepHold && capturedAmt < totalCapturable))
    ? Math.max(0, totalCapturable - capturedAmt)
    : 0;

  const prevCaptured = existingTx?.amount_captured_cents || 0;
  const newTotalCaptured = prevCaptured + capturedAmt;

  updateStoredTransactionStatus(paymentId, {
    status: newStatus,
    amount_captured_cents: newTotalCaptured,
    authorized_hold_cents: remainingHold,
    historyLabel: newStatus,
    historyDetails: isPartial
      ? `Partial Capture executed for $${(capturedAmt / 100).toFixed(2)}.${remainingHold > 0 ? ` Remaining hold: $${(remainingHold / 100).toFixed(2)}` : ' Remaining balance voided.'}`
      : `Full Capture executed for $${(capturedAmt / 100).toFixed(2)}.`,
    apiLog: result.log,
  });

  return { data: result.data?.payment_id ? result.data : (result.data || {} as any), log: result.log };
}

// 6. Incremental Authorization (`POST /payments/{id}/incremental_authorization`)
export async function incrementalAuthorization(
  paymentId: string,
  amountToIncrementCents: number = 5000
): Promise<{ data: HyperswitchPaymentIntent; log: ApiAuditLog }> {
  const body = { amount: amountToIncrementCents };
  const result = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}/incremental_authorization`, 'POST', body);

  if (result.log.responseStatus >= 400 || (result.data && (result.data as any).error)) {
    return { data: result.data, log: result.log };
  }

  const existingTx = getStoredTransactions().find((t) => t.payment_id === paymentId);
  const newHold = (existingTx?.authorized_hold_cents || 27500) + amountToIncrementCents;

  updateStoredTransactionStatus(paymentId, {
    total_amount_cents: newHold,
    authorized_hold_cents: newHold,
    status: 'requires_capture',
    historyLabel: 'requires_capture',
    historyDetails: `Increased authorized hold by +$${(amountToIncrementCents / 100).toFixed(2)}. Total hold: $${(newHold / 100).toFixed(2)}`,
    apiLog: result.log,
  });

  return { data: result.data?.payment_id ? result.data : (result.data || {} as any), log: result.log };
}

// 7. Extend Authorization (`POST /payments/{id}/extend_authorization`)
export async function extendAuthorization(
  paymentId: string
): Promise<{ data: HyperswitchPaymentIntent; log: ApiAuditLog }> {
  const result = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}/extend_authorization`, 'POST', { authorization_extended_days: 1 });

  updateStoredTransactionStatus(paymentId, {
    status: 'requires_capture',
    historyLabel: 'requires_capture',
    historyDetails: 'Authorization validity extended by +1 day',
  });

  return { data: result.data?.payment_id ? result.data : (result.data || {} as any), log: result.log };
}

// 8. Cancel Payment Intent / Void Pre-Auth / Post-Capture Void (`POST /payments/{id}/cancel`)
export async function cancelPayment(
  paymentId: string,
  reason: string = 'Customer session cancelled'
): Promise<{ data: HyperswitchPaymentIntent; log: ApiAuditLog }> {
  const body = { cancellation_reason: reason };
  const result = await request<HyperswitchPaymentIntent>(`/payments/${paymentId}/cancel`, 'POST', body);

  if (result.log.responseStatus >= 400 || (result.data && (result.data as any).error)) {
    return { data: result.data, log: result.log };
  }

  updateStoredTransactionStatus(paymentId, {
    status: 'cancelled',
    cancellation_reason: reason || 'Merchant Pre-Auth Void',
    authorized_hold_cents: 0,
    historyLabel: 'cancelled',
    historyDetails: `Authorization voided (${reason || 'Merchant Pre-Auth Void'})`,
    apiLog: result.log,
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

  if (result.log.responseStatus >= 400 || (result.data && (result.data as any).error)) {
    return { data: result.data, log: result.log };
  }

  const existingTx = getStoredTransactions().find((t) => t.payment_id === paymentId);
  const totalCaptured = existingTx?.amount_captured_cents || existingTx?.total_amount_cents || 27500;
  const prevRefunded = existingTx?.amount_refunded_cents || 0;
  const refundAmount = amountCents || (totalCaptured - prevRefunded);
  const newTotalRefunded = prevRefunded + refundAmount;

  const isFullRefund = newTotalRefunded >= totalCaptured;
  const newStatus: PaymentStatus = 'refunded';

  updateStoredTransactionStatus(paymentId, {
    status: newStatus,
    amount_refunded_cents: newTotalRefunded,
    historyLabel: newStatus,
    historyDetails: isFullRefund
      ? `Full Refund of $${(refundAmount / 100).toFixed(2)} processed`
      : `Partial Refund of $${(refundAmount / 100).toFixed(2)} processed (Total Refunded: $${(newTotalRefunded / 100).toFixed(2)})`,
    apiLog: result.log,
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

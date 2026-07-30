export type PaymentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_customer_action'
  | 'requires_capture'
  | 'processing'
  | 'succeeded'
  | 'cancelled'
  | 'failed'
  | 'expired'
  | 'partially_captured'
  | 'partially_captured_and_capturable'
  | 'partially_refunded'
  | 'refunded';

export type CaptureMethod = 'automatic' | 'manual';
export type AuthenticationType = 'no_three_ds' | 'three_ds';

export interface CustomerDetails {
  fullName: string;
  email: string;
  phone: string;
  deliveryMethod: 'mobile_pass' | 'will_call';
}

export interface TicketItem {
  id: string;
  eventName: string;
  league: string;
  venue: string;
  date: string;
  time: string;
  section: string;
  row: string;
  seats: string;
  quantity: number;
  unitPriceCents: number;
  serviceFeeCents: number;
  imageUrl: string;
}

export interface HyperswitchPaymentIntent {
  payment_id: string;
  merchant_id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  client_secret: string;
  capture_method: CaptureMethod;
  authentication_type?: AuthenticationType;
  customer_id?: string;
  description?: string;
  created?: string;
  amount_capturable?: number;
  amount_received?: number;
  amount_refunded?: number;
  error_code?: string;
  error_message?: string;
  cancellation_reason?: string;
  authorization_extended_days?: number;
  next_action?: {
    type?: string;
    redirect_to_url?: string;
    url?: string;
    image_data_url?: string;
  };
}

export interface HyperswitchRefund {
  refund_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
  created_at?: string;
}

export interface ApiAuditLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: 'GET' | 'POST';
  requestPayload?: any;
  responseStatus: number;
  responsePayload: any;
  durationMs: number;
}

export interface PaymentStatusEvent {
  id: string;
  timestamp: string;
  status: PaymentStatus;
  label: string;
  details?: string;
  amount_cents?: number;
  api_log?: ApiAuditLog;
}

export interface AdminTransactionRecord {
  payment_id: string;
  customer_name: string;
  customer_email: string;
  event_name: string;
  total_amount_cents: number;
  status: PaymentStatus;
  capture_method: CaptureMethod;
  auth_type: AuthenticationType;
  created_at: string;
  amount_captured_cents: number;
  amount_refunded_cents: number;
  authorized_hold_cents: number;
  logs_count: number;
  has_vip_protection?: boolean;
  cancellation_reason?: string;
  card_brand?: string;
  card_last4?: string;
  history: PaymentStatusEvent[];
}

export type CheckoutStep = 1 | 2 | 3;

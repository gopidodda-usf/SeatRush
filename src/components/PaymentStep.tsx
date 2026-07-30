import React, { useState, useEffect } from 'react';
import type { CustomerDetails, TicketItem, CaptureMethod, AuthenticationType, HyperswitchPaymentIntent, PaymentStatus } from '../types';
import { createPaymentIntent, updatePaymentIntent, confirmPaymentIntent, confirmGooglePayIntent, cancelPayment, retrievePaymentIntent, getStoredTransactions } from '../services/hyperswitchApi';

interface SavedCard {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb';
  last4: string;
  exp: string;
  holder: string;
  rawCardNumber: string;
  cvc?: string;
  isDefault?: boolean;
}

interface PaymentStepProps {
  item: TicketItem;
  quantity: number;
  customer: CustomerDetails;
  captureMethod: CaptureMethod;
  authType: AuthenticationType;
  onUpdateCustomer: (updated: Partial<CustomerDetails>) => void;
  onPaymentSuccess: (intent: HyperswitchPaymentIntent) => void;
  onBack: () => void;
  onCancel?: () => void;
}

const INITIAL_SAVED_CARDS: SavedCard[] = [
  {
    id: 'card_visa_1111',
    brand: 'visa',
    last4: '1111',
    exp: '03/30',
    holder: 'John Doe',
    rawCardNumber: '4111111111111111',
    cvc: '737',
    isDefault: true,
  },
  {
    id: 'card_visa_0002_phil',
    brand: 'visa',
    last4: '0002',
    exp: '03/30',
    holder: 'Phil Morgan',
    rawCardNumber: '4000000000000002',
    cvc: '737',
    isDefault: false,
  },
  {
    id: 'card_visa_0446_trisha',
    brand: 'visa',
    last4: '0446',
    exp: '03/32',
    holder: 'Trisha Davis',
    rawCardNumber: '4000003800000446',
    cvc: '737',
    isDefault: false,
  },
];

// Luhn Algorithm Verification for Credit/Debit Cards
export function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13) return false;

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// Expiration Date Verification (Month 01-12 & Non-expired Year)
export function validateExpirationDate(expStr: string): boolean {
  if (!/^\d{2}\/\d{2}$/.test(expStr)) return false;

  const month = parseInt(expStr.slice(0, 2), 10);
  const year2Digit = parseInt(expStr.slice(3, 5), 10);

  if (month < 1 || month > 12) return false;

  const now = new Date();
  const currentYear2Digit = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  if (year2Digit < currentYear2Digit) return false;
  if (year2Digit === currentYear2Digit && month < currentMonth) return false;
  if (year2Digit > currentYear2Digit + 25) return false;

  return true;
}

// Card Brand Detection
export function detectCardBrand(number: string): 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'unknown' {
  const digits = number.replace(/\D/g, '');
  if (!digits) return 'unknown';

  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^(6011|65|64[4-9]|622)/.test(digits)) return 'discover';
  if (/^35(2[89]|[3-8])/.test(digits)) return 'jcb';

  return 'unknown';
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  item,
  quantity,
  customer,
  captureMethod,
  authType,
  onPaymentSuccess,
  onBack,
  onCancel,
}) => {
  const [paymentIntent, setPaymentIntent] = useState<HyperswitchPaymentIntent | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [show3DSModal, setShow3DSModal] = useState(false);

  const [hasVipProtection, setHasVipProtection] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [hasMerch, setHasMerch] = useState(false);
  const [hasFood, setHasFood] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const activeIntentId = paymentIntent?.payment_id || sessionStorage.getItem('active_checkout_intent_id');
  const storedTx = getStoredTransactions().find((t) => t.payment_id === activeIntentId);
  const effectiveCaptureMethod = storedTx?.capture_method || captureMethod || 'automatic';

  const baseCents = (item.unitPriceCents + item.serviceFeeCents) * quantity;
  const vipCents = hasVipProtection ? 1500 : 0;
  const parkingCents = hasParking ? 2500 : 0;
  const merchCents = hasMerch ? 1000 : 0;
  const foodCents = hasFood ? 2000 : 0;

  const totalAddonsCents = vipCents + parkingCents + merchCents + foodCents;
  const grandTotalCents = baseCents + totalAddonsCents;
  const grandTotal = grandTotalCents / 100;

  const handleToggleAddon = async (
    addonType: 'vip' | 'parking' | 'merch' | 'food',
    checked: boolean
  ) => {
    let newVip = hasVipProtection;
    let newParking = hasParking;
    let newMerch = hasMerch;
    let newFood = hasFood;

    if (addonType === 'vip') { setHasVipProtection(checked); newVip = checked; }
    if (addonType === 'parking') { setHasParking(checked); newParking = checked; }
    if (addonType === 'merch') { setHasMerch(checked); newMerch = checked; }
    if (addonType === 'food') { setHasFood(checked); newFood = checked; }

    const newAddonsCents =
      (newVip ? 1500 : 0) +
      (newParking ? 2500 : 0) +
      (newMerch ? 1000 : 0) +
      (newFood ? 2000 : 0);

    const newTotalCents = baseCents + newAddonsCents;

    const activeIntentId = paymentIntent?.payment_id || sessionStorage.getItem('active_checkout_intent_id');
    if (activeIntentId) {
      setIsUpdating(true);
      try {
        await updatePaymentIntent(activeIntentId, {
          amountCents: newTotalCents,
          metadata: {
            has_vip_protection: newVip,
            has_parking: newParking,
            has_merch: newMerch,
            has_food: newFood,
          },
          lastChangedAddon: {
            name: addonType.toUpperCase(),
            action: checked ? 'Added' : 'Removed',
          },
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // Saved Cards state - initialized with first card pre-selected by default
  const [savedCards, setSavedCards] = useState<SavedCard[]>(INITIAL_SAVED_CARDS);
  const [selectedCardId, setSelectedCardId] = useState<string | null>('card_visa_1111');

  // Add New Card modal state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newHolder, setNewHolder] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newExp, setNewExp] = useState('');
  const [newCvc, setNewCvc] = useState('');

  // 3DS Tab Verification Modal state
  const [show3DSTabModal, setShow3DSTabModal] = useState(false);
  const [threeDsWarning, setThreeDsWarning] = useState<string | null>(null);
  const [isChecking3DS, setIsChecking3DS] = useState(false);

  // Selected Card Info (null if no card has been clicked yet)
  const activeCard = savedCards.find((c) => c.id === selectedCardId) || null;

  // Card Brand & Validation
  const currentBrand = detectCardBrand(newNumber);
  const isAmex = currentBrand === 'amex';
  const targetMaxDigits = isAmex ? 15 : 16;
  const maxCvvLength = isAmex ? 4 : 3;
  const digitsCount = newNumber.replace(/\D/g, '').length;
  const isNumberComplete = digitsCount >= targetMaxDigits;
  const isLuhnValid = validateLuhn(newNumber);
  const isExpValid = validateExpirationDate(newExp);
  const isCvvValid = newCvc.length === maxCvvLength;

  // Initialize Payment Intent once per checkout session with synchronous race-condition lock
  useEffect(() => {
    let isSubscribed = true;

    async function initIntent() {
      setErrorMessage(null);

      const existingSessionId = sessionStorage.getItem('active_checkout_intent_id');
      const isPending = sessionStorage.getItem('active_checkout_intent_pending');

      // If intent already exists for this session, load it unless it has been cancelled
      if (existingSessionId) {
        const storedTx = getStoredTransactions().find((t) => t.payment_id === existingSessionId);
        if (storedTx && storedTx.status !== 'cancelled' && isSubscribed) {
          setPaymentIntent({
            payment_id: storedTx.payment_id,
            merchant_id: 'merchant_1785020339',
            status: storedTx.status,
            amount: storedTx.total_amount_cents,
            currency: 'USD',
            client_secret: `${storedTx.payment_id}_secret`,
            capture_method: storedTx.capture_method,
          });
          return;
        }
        // If the stored intent was cancelled, clear it so a fresh intent is created
        if (storedTx && storedTx.status === 'cancelled') {
          sessionStorage.removeItem('active_checkout_intent_id');
        }
      }

      // If another mount cycle is already initializing an intent, stop!
      if (isPending) {
        return;
      }

      // Synchronously mark pending BEFORE calling async API
      sessionStorage.setItem('active_checkout_intent_pending', 'true');

      try {
        const { data } = await createPaymentIntent({
          amountCents: baseCents,
          currency: 'USD',
          captureMethod: captureMethod || 'automatic',
          customerName: customer.fullName,
          customerEmail: customer.email,
        });

        if (data && data.payment_id) {
          sessionStorage.setItem('active_checkout_intent_id', data.payment_id);
          if (isSubscribed) {
            setPaymentIntent(data);
          }
        }
      } finally {
        sessionStorage.removeItem('active_checkout_intent_pending');
      }
    }

    initIntent();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Live Sync Session Status (Detect if Merchant Cancelled in another tab)
  const [sessionStatus, setSessionStatus] = useState<PaymentStatus | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      const activeId = sessionStorage.getItem('active_checkout_intent_id');
      if (activeId) {
        const storedTx = getStoredTransactions().find((t) => t.payment_id === activeId);
        if (storedTx) {
          setSessionStatus(storedTx.status);
        }
      }
    };

    checkStatus();
    window.addEventListener('storage', checkStatus);
    const interval = setInterval(checkStatus, 800);

    return () => {
      window.removeEventListener('storage', checkStatus);
      clearInterval(interval);
    };
  }, []);

  const isSessionCancelled = sessionStatus === 'cancelled';



  // Customer Actions: Cancel Checkout Session (`POST /payments/{id}/cancel`)
  const handleCustomerCancelSession = async () => {
    if (isSessionCancelled) return;

    const targetPaymentId = paymentIntent?.payment_id || sessionStorage.getItem('active_checkout_intent_id');
    sessionStorage.removeItem('active_checkout_intent_id');
    sessionStorage.removeItem('active_checkout_intent_pending');
    if (targetPaymentId) {
      await cancelPayment(targetPaymentId, 'Customer abandoned checkout on payment page');
    }
    if (onCancel) {
      onCancel();
    } else {
      onBack();
    }
  };

  const handleBackToCart = () => {
    onBack();
  };

  // Card Number Formatting
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digits = rawVal.replace(/\D/g, '');
    const isAmexCard = digits.startsWith('34') || digits.startsWith('37');

    let formatted = '';
    if (isAmexCard) {
      const trimmed = digits.slice(0, 15);
      const part1 = trimmed.slice(0, 4);
      const part2 = trimmed.slice(4, 10);
      const part3 = trimmed.slice(10, 15);

      if (part3) formatted = `${part1} ${part2} ${part3}`;
      else if (part2) formatted = `${part1} ${part2}`;
      else formatted = part1;
    } else {
      const trimmed = digits.slice(0, 16);
      const parts = trimmed.match(/.{1,4}/g);
      formatted = parts ? parts.join(' ') : '';

      if (newCvc.length > 3) {
        setNewCvc(newCvc.slice(0, 3));
      }
    }

    setNewNumber(formatted);
  };

  const handleExpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digits = val.replace(/\D/g, '');

    if (val.length < newExp.length) {
      if (newExp.endsWith('/') && !val.endsWith('/')) {
        setNewExp(digits.slice(0, 2));
        return;
      }
    }

    if (digits.length === 0) {
      setNewExp('');
    } else if (digits.length === 1) {
      setNewExp(digits);
    } else if (digits.length === 2) {
      setNewExp(`${digits}/`);
    } else {
      const mm = digits.slice(0, 2);
      const yy = digits.slice(2, 4);
      setNewExp(`${mm}/${yy}`);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    const isAmexCard = detectCardBrand(newNumber) === 'amex';
    const limit = isAmexCard ? 4 : 3;
    setNewCvc(digits.slice(0, limit));
  };

  const handleAddNewCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim() || !isLuhnValid || !isExpValid || !isCvvValid) return;

    const rawDigits = newNumber.replace(/\s/g, '');
    const last4 = rawDigits.slice(-4) || '1111';
    const brand = currentBrand !== 'unknown' ? currentBrand : 'visa';

    const newCard: SavedCard = {
      id: `card_${Date.now()}`,
      brand,
      last4,
      exp: newExp || '12/29',
      holder: newHolder || 'Cardholder',
      rawCardNumber: rawDigits,
      cvc: newCvc || '737',
      isDefault: false,
    };

    setSavedCards((prev) => [...prev, newCard]);
    setSelectedCardId(newCard.id);
    setShowAddCardModal(false);

    setNewHolder('');
    setNewNumber('');
    setNewExp('');
    setNewCvc('');
  };

  const handleSelectCard = (card: SavedCard) => {
    if (isSessionCancelled) return;
    setSelectedCardId(card.id);
  };

  const recreateIntentOnFailure = async (method: CaptureMethod) => {
    try {
      const metadata: Record<string, boolean> = {
        has_vip_protection: hasVipProtection,
        has_parking: hasParking,
        has_merch: hasMerch,
        has_food: hasFood,
      };
      const { data: newIntent } = await createPaymentIntent({
        amountCents: grandTotalCents,
        currency: 'USD',
        captureMethod: method,
        authType,
        customerName: customer.fullName,
        customerEmail: customer.email,
        metadata,
      });
      if (newIntent?.payment_id) {
        setPaymentIntent(newIntent);
        sessionStorage.setItem('active_checkout_intent_id', newIntent.payment_id);
      }
    } catch (err) {
      console.error('Failed to recreate payment intent on failure:', err);
    }
  };

  // Confirm payment using the existing payment intent
  const handleConfirmPaymentWithMethod = async (method: CaptureMethod) => {
    if (isSessionCancelled) return;

    const targetPaymentId = paymentIntent?.payment_id || sessionStorage.getItem('active_checkout_intent_id');

    if (!targetPaymentId) return;

    setProcessingPayment(true);
    setErrorMessage(null);

    if (authType === 'three_ds') {
      setProcessingPayment(false);
      setShow3DSModal(true);
      return;
    }

    // Step 3a: First hit POST /payments/{payment_id} to attach the selected payment method
    if (activeCard) {
      await updatePaymentIntent(targetPaymentId, {
        card: { last4: activeCard.last4, brand: activeCard.brand, holderName: activeCard.holder, rawCardNumber: activeCard.rawCardNumber, exp: activeCard.exp, cvc: activeCard.cvc },
      });
    }

    // Step 3b: Automatically hit POST /payments/{payment_id}/confirm to execute confirmation
    const { data } = await confirmPaymentIntent(
      targetPaymentId,
      method,
      grandTotalCents,
      activeCard ? { last4: activeCard.last4, brand: activeCard.brand, holderName: activeCard.holder, rawCardNumber: activeCard.rawCardNumber, exp: activeCard.exp, cvc: activeCard.cvc } : undefined
    );
    setProcessingPayment(false);

    if (data && (data.status === 'succeeded' || data.status === 'requires_capture')) {
      sessionStorage.removeItem('active_checkout_intent_id');
      sessionStorage.removeItem('active_checkout_intent_pending');
      onPaymentSuccess(data);
    } else if (data && data.status === 'requires_customer_action') {
      const redirectUrl = data.next_action?.redirect_to_url || data.next_action?.url || (data.next_action as any)?.image_data_url || 'http://localhost:8080';
      if (redirectUrl) {
        window.open(redirectUrl, '_blank');
      }
      setThreeDsWarning(null);
      setShow3DSTabModal(true);
    } else {
      setErrorMessage(data?.error_message || 'Payment processing failed.');
      await recreateIntentOnFailure(method);
    }
  };

  const handleCancel3DSPayment = async () => {
    const targetPaymentId = paymentIntent?.payment_id || sessionStorage.getItem('active_checkout_intent_id');
    if (targetPaymentId) {
      await cancelPayment(targetPaymentId);
    }
    sessionStorage.removeItem('active_checkout_intent_id');
    sessionStorage.removeItem('active_checkout_intent_pending');
    setShow3DSTabModal(false);
    onBack();
  };

  const handleVerify3DSStatus = async (method: CaptureMethod) => {
    const targetPaymentId = paymentIntent?.payment_id || sessionStorage.getItem('active_checkout_intent_id');
    if (!targetPaymentId) return;

    setIsChecking3DS(true);
    setThreeDsWarning(null);

    const { data } = await retrievePaymentIntent(targetPaymentId);
    setIsChecking3DS(false);

    if (data && (data.status === 'succeeded' || data.status === 'requires_capture')) {
      sessionStorage.removeItem('active_checkout_intent_id');
      sessionStorage.removeItem('active_checkout_intent_pending');
      setShow3DSTabModal(false);
      onPaymentSuccess(data);
    } else if (data && data.status === 'requires_customer_action') {
      setThreeDsWarning('Please complete 3DS authentication in the opened tab first, then click YES below.');
    } else {
      setShow3DSTabModal(false);
      setErrorMessage(data?.error_message || '3DS Authentication failed or was rejected.');
      await recreateIntentOnFailure(method);
    }
  };

  const handleComplete3DS = async () => {
    if (isSessionCancelled) return;

    setShow3DSModal(false);
    const targetPaymentId = paymentIntent?.payment_id || sessionStorage.getItem('active_checkout_intent_id');
    if (!targetPaymentId) return;

    setProcessingPayment(true);
    const { data } = await confirmPaymentIntent(targetPaymentId, 'automatic', grandTotalCents);
    setProcessingPayment(false);

    if (data && (data.status === 'succeeded' || data.status === 'requires_capture')) {
      sessionStorage.removeItem('active_checkout_intent_id');
      sessionStorage.removeItem('active_checkout_intent_pending');
      onPaymentSuccess(data);
    } else {
      setErrorMessage('3DS Verification failed.');
      await recreateIntentOnFailure('automatic');
    }
  };

  const handleConfirmGooglePay = async () => {
    if (isSessionCancelled) return;

    const targetPaymentId = paymentIntent?.payment_id || sessionStorage.getItem('active_checkout_intent_id');
    if (!targetPaymentId) return;

    setProcessingPayment(true);
    setErrorMessage(null);

    const { data } = await confirmGooglePayIntent(
      targetPaymentId,
      effectiveCaptureMethod,
      grandTotalCents,
      customer.email
    );
    setProcessingPayment(false);

    if (data && (data.status === 'succeeded' || data.status === 'requires_capture')) {
      sessionStorage.removeItem('active_checkout_intent_id');
      sessionStorage.removeItem('active_checkout_intent_pending');
      onPaymentSuccess(data);
    } else {
      setErrorMessage('Google Pay processing failed.');
      await recreateIntentOnFailure(effectiveCaptureMethod);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {/* Session Cancelled Warning Banner */}
      {isSessionCancelled && (
        <div className="glass-panel" style={{
          padding: '0.65rem 1rem',
          borderColor: 'var(--accent-rose)',
          background: 'rgba(244, 63, 94, 0.12)',
          fontSize: '0.78rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
        }}>
          <span style={{ fontSize: '0.95rem' }}>⚠️</span>
          <div>
            <span style={{ color: '#FDA4AF', fontWeight: 700, fontSize: '0.78rem' }}>
              This checkout session has been cancelled by the merchant.
            </span>
            <span style={{ color: 'var(--text-secondary)', marginLeft: '0.35rem', fontSize: '0.75rem' }}>
              Please click "Back to Cart" to start a new checkout.
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: Express Checkout & Payment Methods (Left) & Order Summary (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: '1.75rem',
        alignItems: 'start',
        opacity: isSessionCancelled ? 0.45 : 1,
        pointerEvents: isSessionCancelled ? 'none' : 'auto',
        transition: 'all 0.3s ease',
      }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {errorMessage && (
            <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.1)', color: '#FDA4AF', fontSize: '0.78rem' }}>
              <strong>Payment Error:</strong> {errorMessage}
            </div>
          )}

          {/* Express 1-Click Payment Bar */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              Express Checkout
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button
                disabled={processingPayment || isSessionCancelled}
                onClick={() => handleConfirmGooglePay()}
                className="btn-secondary"
                style={{
                  padding: '0.55rem',
                  fontSize: '0.82rem',
                  background: '#000000',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontWeight: 700,
                  opacity: isSessionCancelled ? 0.5 : 1,
                  cursor: isSessionCancelled ? 'default' : 'pointer',
                }}
              >
                <span style={{ fontSize: '0.92rem', color: '#4285F4', fontWeight: 800 }}>G</span>
                <span>Pay</span>
              </button>
              <button
                disabled={processingPayment || isSessionCancelled}
                onClick={() => handleConfirmPaymentWithMethod('automatic')}
                className="btn-secondary"
                style={{ 
                  padding: '0.55rem', 
                  fontSize: '0.82rem', 
                  background: '#003087', 
                  color: '#FFFFFF', 
                  border: 'none',
                  opacity: isSessionCancelled ? 0.5 : 1,
                  cursor: isSessionCancelled ? 'default' : 'pointer',
                }}
              >
                PayPal
              </button>
            </div>
          </div>

          {/* Saved Cards Selection Section */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', margin: 0 }}>
                Select Payment Method
              </h3>
            </div>

            {/* List of Saved Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
              {savedCards.map((card) => {
                const isSelected = card.id === selectedCardId;

                return (
                  <div
                    key={card.id}
                    onClick={() => handleSelectCard(card)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.8rem 1rem',
                      background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(9, 7, 16, 0.45)',
                      border: isSelected ? '1.5px solid var(--accent-violet)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      cursor: isSessionCancelled ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 0 14px rgba(139, 92, 246, 0.2)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: isSelected ? '4px solid var(--accent-violet)' : '2px solid var(--text-muted)',
                        background: '#090710',
                        transition: 'all 0.2s ease',
                      }} />

                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {card.brand.toUpperCase()} ending in <span style={{ fontFamily: 'monospace' }}>•••• {card.last4}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Expires {card.exp} • {card.holder}
                        </div>
                      </div>
                    </div>

                    {card.isDefault && (
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-muted)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}>
                        Default
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* "+ Add New Card" Button */}
            <button
              disabled={isSessionCancelled}
              onClick={() => {
                setNewHolder('');
                setNewNumber('');
                setNewExp('');
                setNewCvc('');
                setShowAddCardModal(true);
              }}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '0.7rem',
                fontSize: '0.8rem',
                borderStyle: 'dashed',
                color: 'var(--accent-violet)',
                borderColor: 'rgba(139, 92, 246, 0.4)',
              }}
            >
              + Add New Credit or Debit Card
            </button>
          </div>

        </div>

        {/* Right Column Order Summary */}
        <div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Order Summary
            </h3>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              {item.eventName}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              {quantity}x Tickets • {item.venue}
            </p>

            {/* Interactive Add-ons Section */}
            <div style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.75rem',
              marginBottom: '0.85rem',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-violet)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Optional Event Add-ons
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <input
                      type="checkbox"
                      checked={hasVipProtection}
                      onChange={(e) => handleToggleAddon('vip', e.target.checked)}
                      style={{ accentColor: 'var(--accent-violet)', cursor: 'pointer' }}
                    />
                    <span>VIP Protection</span>
                  </span>
                  <span style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>+$15.00</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <input
                      type="checkbox"
                      checked={hasParking}
                      onChange={(e) => handleToggleAddon('parking', e.target.checked)}
                      style={{ accentColor: 'var(--accent-violet)', cursor: 'pointer' }}
                    />
                    <span>Express Parking</span>
                  </span>
                  <span style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>+$25.00</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <input
                      type="checkbox"
                      checked={hasMerch}
                      onChange={(e) => handleToggleAddon('merch', e.target.checked)}
                      style={{ accentColor: 'var(--accent-violet)', cursor: 'pointer' }}
                    />
                    <span>Souvenir Lanyard</span>
                  </span>
                  <span style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>+$10.00</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <input
                      type="checkbox"
                      checked={hasFood}
                      onChange={(e) => handleToggleAddon('food', e.target.checked)}
                      style={{ accentColor: 'var(--accent-violet)', cursor: 'pointer' }}
                    />
                    <span>Concession Voucher</span>
                  </span>
                  <span style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>+$20.00</span>
                </label>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span>Tickets</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{quantity} x ${(item.unitPriceCents / 100).toFixed(2)}</span>
                <span style={{ fontWeight: 600, textAlign: 'right', minWidth: '55px' }}>${((item.unitPriceCents * quantity) / 100).toFixed(2)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span>Service Fee</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{quantity} x ${(item.serviceFeeCents / 100).toFixed(2)}</span>
                <span style={{ fontWeight: 600, textAlign: 'right', minWidth: '55px' }}>${((item.serviceFeeCents * quantity) / 100).toFixed(2)}</span>
              </div>

              {hasVipProtection && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-violet)' }}>
                  <span>VIP Protection</span>
                  <span>+$15.00</span>
                </div>
              )}
              {hasParking && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-violet)' }}>
                  <span>VIP Express Parking</span>
                  <span>+$25.00</span>
                </div>
              )}
              {hasMerch && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-violet)' }}>
                  <span>Souvenir Lanyard</span>
                  <span>+$10.00</span>
                </div>
              )}
              {hasFood && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-violet)' }}>
                  <span>Concession Voucher</span>
                  <span>+$20.00</span>
                </div>
              )}
            </div>

            {activeCard && (
              <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Selected Card:</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.1rem' }}>
                  {activeCard.brand.toUpperCase()} •••• {activeCard.last4}
                </div>
              </div>
            )}

            <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              ${grandTotal.toFixed(2)} USD
            </div>
            {isUpdating && (
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                Updating payment intent...
              </div>
            )}
          </div>
        </div>

        {/* 3DS Tab Verification Modal */}
        {show3DSTabModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}>
            <div className="glass-panel" style={{ width: '420px', padding: '1.5rem', textAlign: 'center', borderColor: 'var(--accent-violet)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Did you finish 3DS authentication?
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.1rem', lineHeight: 1.4 }}>
                We opened the 3D Secure authentication page in a new browser tab. Please complete or reject the payment in that tab, then click YES below.
              </p>

              {threeDsWarning && (
                <div style={{
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#FBBF24',
                  fontSize: '0.75rem',
                  marginBottom: '1rem',
                  textAlign: 'left',
                }}>
                  ⚠️ {threeDsWarning}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleCancel3DSPayment}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.7rem', fontSize: '0.82rem' }}
                >
                  Cancel Payment
                </button>
                <button
                  type="button"
                  disabled={isChecking3DS}
                  onClick={() => handleVerify3DSStatus(effectiveCaptureMethod)}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.7rem', fontSize: '0.82rem' }}
                >
                  {isChecking3DS ? 'Checking...' : 'YES, I Finished'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3DS Challenge Modal */}
        {show3DSModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}>
            <div className="glass-panel" style={{ width: '350px', padding: '1.25rem', textAlign: 'center', borderColor: 'var(--accent-violet)' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                3DS 2.0 Identity Authentication
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Issuer Verification Required. Enter OTP (Test default: 123456).
              </p>
              <input
                type="text"
                defaultValue="123456"
                className="input-field"
                style={{ textAlign: 'center', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.3em', marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button onClick={handleComplete3DS} className="btn-primary" style={{ flex: 1, padding: '0.65rem', fontSize: '0.82rem' }}>Authenticate</button>
                <button onClick={() => setShow3DSModal(false)} className="btn-secondary" style={{ fontSize: '0.82rem' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add New Card Modal */}
        {showAddCardModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}>
            <div className="glass-panel" style={{ width: '400px', padding: '1.35rem', borderColor: 'var(--accent-violet)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', margin: 0 }}>
                  Add New Card
                </h3>
                <button onClick={() => setShowAddCardModal(false)} className="btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Name on Card
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="one-time-code"
                    value={newHolder}
                    onChange={(e) => setNewHolder(e.target.value)}
                    className="input-field"
                    style={{ wordSpacing: '0.25em' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Card Number
                    </label>
                    {currentBrand !== 'unknown' && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {currentBrand}
                      </span>
                    )}
                  </div>

                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      required
                      autoComplete="one-time-code"
                      value={newNumber}
                      onChange={handleCardNumberChange}
                      className="input-field"
                      style={{
                        fontFamily: 'monospace',
                        wordSpacing: '0.25em',
                        paddingRight: '2.5rem',
                      }}
                    />

                    {isNumberComplete && !isLuhnValid && (
                      <div style={{
                        position: 'absolute',
                        right: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        pointerEvents: 'none',
                      }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F43F5E' }}>
                          ✕
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                      Expiration Date
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        required
                        autoComplete="one-time-code"
                        value={newExp}
                        onChange={handleExpChange}
                        className="input-field"
                        style={{ fontFamily: 'monospace', paddingRight: '2rem' }}
                      />
                      {newExp.length === 5 && !isExpValid && (
                        <div style={{
                          position: 'absolute',
                          right: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          pointerEvents: 'none',
                        }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F43F5E' }}>
                            ✕
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        CVC
                      </label>
                      {currentBrand !== 'unknown' && (
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                          {isAmex ? '4-digit' : '3-digit'}
                        </span>
                      )}
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        required
                        autoComplete="one-time-code"
                        maxLength={maxCvvLength}
                        value={newCvc}
                        onChange={handleCvcChange}
                        className="input-field"
                        style={{ fontFamily: 'monospace', paddingRight: '2rem' }}
                      />
                      {newCvc.length > 0 && newCvc.length !== maxCvvLength && (
                        <div style={{
                          position: 'absolute',
                          right: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          pointerEvents: 'none',
                        }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F43F5E' }}>
                            ✕
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <button type="button" onClick={handleAddNewCardSubmit as any} className="btn-primary" style={{ flex: 1, padding: '0.7rem', fontSize: '0.85rem' }}>
                    Save Card
                  </button>
                  <button type="button" onClick={() => setShowAddCardModal(false)} className="btn-secondary" style={{ flex: 1, padding: '0.7rem', fontSize: '0.85rem' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Action Row: Back & Cancel (Left Column), Pay Now vs Reserve Seat Buttons Side-by-Side (Right Column) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.75rem', marginTop: 'auto', paddingTop: '2.5rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
          <button
            onClick={handleBackToCart}
            className="btn-secondary"
            style={{ padding: '0.8rem 1.5rem', fontSize: '0.88rem' }}
          >
            ← Back
          </button>
          <button
            disabled={isSessionCancelled}
            onClick={handleCustomerCancelSession}
            className="btn-secondary"
            style={{ padding: '0.8rem 1.25rem', fontSize: '0.88rem', borderColor: 'var(--accent-rose)', color: '#FDA4AF' }}
          >
            {isSessionCancelled ? 'Session Cancelled' : 'Cancel'}
          </button>
        </div>

        {/* Single Primary Action Button: Complete Order */}
        <div>
          <button
            disabled={!selectedCardId || processingPayment || isSessionCancelled}
            onClick={() => {
              if (isSessionCancelled) return;
              handleConfirmPaymentWithMethod(effectiveCaptureMethod);
            }}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '0.8rem 1.25rem',
              fontSize: '0.88rem',
              whiteSpace: 'nowrap',
              opacity: (!selectedCardId || isSessionCancelled) ? 0.5 : 1,
              cursor: (!selectedCardId || isSessionCancelled) ? 'default' : 'pointer',
            }}
          >
            {processingPayment ? 'Authorizing...' : isSessionCancelled ? 'Session Cancelled' : 'Complete Order'}
          </button>
        </div>
      </div>

    </div>
  );
};

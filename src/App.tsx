import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StepProgress } from './components/StepProgress';
import { CartStep } from './components/CartStep';
import { AddonsStep } from './components/AddonsStep';
import { PaymentStep } from './components/PaymentStep';
import { FulfillmentStep } from './components/FulfillmentStep';
import { AdminDashboard } from './components/AdminDashboard';
import { AuditDrawer } from './components/AuditDrawer';
import type { CheckoutStep, CustomerDetails, TicketItem, CaptureMethod, AuthenticationType, HyperswitchPaymentIntent, ApiAuditLog } from './types';
import { getApiAuditLogs, clearApiAuditLogs } from './services/hyperswitchApi';

const DEFAULT_TICKET: TicketItem = {
  id: 'ticket_sharks_thunder_104',
  eventName: 'Miami Sharks vs. Tampa Thunder',
  league: 'US NFL CHAMPIONSHIP',
  venue: 'Hard Rock Stadium',
  date: 'Sun, Nov 15, 2026',
  time: '4:25 PM EST',
  section: '104',
  row: '12',
  seats: '5 & 6',
  quantity: 2,
  unitPriceCents: 12500, // $125.00
  serviceFeeCents: 1250,  // $12.50
  imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
};

const DEFAULT_CUSTOMER: CustomerDetails = {
  fullName: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  phone: '+1 (305) 555-0192',
  deliveryMethod: 'mobile_pass',
};

export default function App() {
  const [step, setStep] = useState<CheckoutStep>(1);
  const [quantity, setQuantity] = useState(2);
  const [captureMethod] = useState<CaptureMethod>('automatic');
  const [authType] = useState<AuthenticationType>('no_three_ds');
  const [customer, setCustomer] = useState<CustomerDetails>(DEFAULT_CUSTOMER);
  const [paymentIntent, setPaymentIntent] = useState<HyperswitchPaymentIntent | null>(null);

  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [logs, setLogs] = useState<ApiAuditLog[]>(getApiAuditLogs());

  // Check URL parameter to see if opened in Admin View Mode (`?view=admin`)
  const searchParams = new URLSearchParams(window.location.search);
  const isAdminView = searchParams.get('view') === 'admin';

  // Sync API audit logs live across browser tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setLogs(getApiAuditLogs());
    };

    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleUpdateCustomer = (updated: Partial<CustomerDetails>) => {
    setCustomer((prev) => ({ ...prev, ...updated }));
  };

  const handlePaymentSuccess = (intent: HyperswitchPaymentIntent) => {
    setPaymentIntent(intent);
    setStep(4);
  };

  const handleResetOrder = () => {
    sessionStorage.removeItem('active_checkout_intent_id');
    setStep(1);
    setPaymentIntent(null);
    setQuantity(2);
  };

  // Render Standalone Merchant Admin Dashboard if URL has `view=admin`
  if (isAdminView) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
        <Header
          logsCount={logs.length}
          onOpenAudit={() => setIsAuditOpen(true)}
          onResetOrder={handleResetOrder}
          isAdminView={true}
        />
        <main style={{ flex: 1 }}>
          <AdminDashboard />
        </main>
        <AuditDrawer
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          logs={logs}
          onClearLogs={() => {
            clearApiAuditLogs();
            setLogs([]);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Fixed Header Navbar */}
      <Header
        logsCount={logs.length}
        onOpenAudit={() => setIsAuditOpen(true)}
        onResetOrder={handleResetOrder}
        isAdminView={false}
      />

      {/* Main Container */}
      <main style={{ flex: 1, padding: '2rem 1.5rem 4rem', maxWidth: '1060px', width: '100%', margin: '0 auto' }}>
        
        {/* Step Progress Tracker (4 Steps: Cart ➔ Add Ons ➔ Payment ➔ Confirmation) */}
        <StepProgress currentStep={step} onStepClick={(s) => setStep(s)} />

        {/* Step 1: Cart & Quantity Selection */}
        {step === 1 && (
          <CartStep
            item={DEFAULT_TICKET}
            quantity={quantity}
            onUpdateQuantity={(q) => setQuantity(q)}
            onProceed={() => setStep(2)}
          />
        )}

        {/* Step 2: Add Ons & Event Upgrades */}
        {step === 2 && (
          <AddonsStep
            item={DEFAULT_TICKET}
            quantity={quantity}
            customer={customer}
            captureMethod={captureMethod}
            authType={authType}
            onProceedToPayment={() => setStep(3)}
            onBackToCart={() => setStep(1)}
          />
        )}

        {/* Step 3: Payment Method & Confirmation */}
        {step === 3 && (
          <PaymentStep
            item={DEFAULT_TICKET}
            quantity={quantity}
            customer={customer}
            captureMethod={captureMethod}
            authType={authType}
            onUpdateCustomer={handleUpdateCustomer}
            onPaymentSuccess={handlePaymentSuccess}
            onBack={() => setStep(2)}
            onCancel={() => setStep(1)}
          />
        )}

        {/* Step 4: Success & Ticket Pass Fulfillment */}
        {step === 4 && (
          <FulfillmentStep
            item={DEFAULT_TICKET}
            quantity={quantity}
            customer={customer}
            paymentIntent={paymentIntent || {
              payment_id: 'pay_mock',
              merchant_id: 'merchant_1785020339',
              status: 'succeeded',
              amount: 27500,
              currency: 'USD',
              client_secret: 'sec_test',
              capture_method: 'automatic',
            }}
            onUpdatePaymentIntent={(updated) => setPaymentIntent(updated)}
            onReset={handleResetOrder}
          />
        )}

      </main>

      {/* Slide-out API Audit Drawer */}
      <AuditDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        logs={logs}
        onClearLogs={() => {
          clearApiAuditLogs();
          setLogs([]);
        }}
      />
    </div>
  );
}

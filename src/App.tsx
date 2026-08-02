import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { EventsPage } from './components/EventsPage';
import { EventDetailsPage } from './components/EventDetailsPage';
import { StepProgress } from './components/StepProgress';
import { CartStep } from './components/CartStep';
import { PaymentStep } from './components/PaymentStep';
import { FulfillmentStep } from './components/FulfillmentStep';
import { AdminDashboard } from './components/AdminDashboard';
import { AuditDrawer } from './components/AuditDrawer';
import type { CheckoutStep, CustomerDetails, TicketItem, CaptureMethod, AuthenticationType, HyperswitchPaymentIntent, ApiAuditLog, EventData } from './types';
import { getApiAuditLogs, clearApiAuditLogs } from './services/hyperswitchApi';
import { MOCK_EVENTS } from './data/mockEvents';

const DEFAULT_TICKET: TicketItem = {
  id: 'ticket_coldplay_rosebowl',
  eventName: 'Coldplay — Music of the Spheres World Tour',
  league: 'CONCERT',
  venue: 'Rose Bowl Stadium, Los Angeles',
  date: 'Sat, Aug 15, 2026',
  time: '7:30 PM',
  section: 'Section 102 — Lower Bowl',
  row: '12',
  seats: 'Seat 101',
  quantity: 1,
  unitPriceCents: 18500, // $185.00
  serviceFeeCents: 1500,  // $15.00
  imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
};

const DEFAULT_CUSTOMER: CustomerDetails = {
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1 (305) 555-0192',
  deliveryMethod: 'mobile_pass',
};

// URL Path Matcher Helper
const getPathRouteInfo = (): { view: 'home' | 'events' | 'event_detail' | 'cart' | 'admin'; eventId?: string } => {
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(window.location.search);

  if (searchParams.get('view') === 'admin' || path === '/admin') {
    return { view: 'admin' };
  }
  if (path === '/browse-events' || path === '/events') {
    return { view: 'events' };
  }
  if (path.startsWith('/event/')) {
    const eventId = path.replace('/event/', '');
    return { view: 'event_detail', eventId };
  }
  if (path === '/cart' || path === '/checkout') {
    return { view: 'cart' };
  }
  return { view: 'home' };
};

export default function App() {
  const initialRoute = getPathRouteInfo();

  const [activeView, setActiveView] = useState<'home' | 'events' | 'event_detail' | 'cart' | 'admin'>(initialRoute.view);
  const [selectedEvent, setSelectedEvent] = useState<EventData>(() => {
    if (initialRoute.eventId) {
      const found = MOCK_EVENTS.find((e) => e.id === initialRoute.eventId);
      if (found) return found;
    }
    return MOCK_EVENTS[0];
  });
  const [ticketItem, setTicketItem] = useState<TicketItem>(DEFAULT_TICKET);
  const [cartItems, setCartItems] = useState<TicketItem[]>([]);

  const [step, setStep] = useState<CheckoutStep>(1);
  const [quantity, setQuantity] = useState(1);
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>('automatic');
  const [authType] = useState<AuthenticationType>('no_three_ds');
  const [customer, setCustomer] = useState<CustomerDetails>(DEFAULT_CUSTOMER);
  const [paymentIntent, setPaymentIntent] = useState<HyperswitchPaymentIntent | null>(null);

  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [logs, setLogs] = useState<ApiAuditLog[]>(getApiAuditLogs());

  const isAdminView = activeView === 'admin';

  const handleAddToCart = (newItem: TicketItem) => {
    setCartItems((prev) => {
      const idx = prev.findIndex(
        (item) => item.eventName === newItem.eventName && item.section === newItem.section
      );
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + newItem.quantity,
        };
        return updated;
      }
      return [...prev, newItem];
    });
    setTicketItem(newItem);
    // DO NOT navigate away here - user stays on EventDetailsPage
  };

  const handleUpdateItemQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setCartItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
      );
    }
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Navigate helper with HTML5 History API URL updates
  const navigateTo = (view: 'home' | 'events' | 'event_detail' | 'cart' | 'admin', eventId?: string) => {
    let targetPath = '/home';
    if (view === 'events') targetPath = '/browse-events';
    else if (view === 'event_detail' && eventId) targetPath = `/event/${eventId}`;
    else if (view === 'cart') targetPath = '/cart';
    else if (view === 'admin') targetPath = '/admin';
    else if (view === 'home') targetPath = '/home';

    window.history.pushState({}, '', targetPath);
    setActiveView(view);
  };

  // Sync state on browser Back/Forward navigation (`popstate`)
  useEffect(() => {
    const handlePopState = () => {
      const routeInfo = getPathRouteInfo();
      setActiveView(routeInfo.view);
      if (routeInfo.eventId) {
        const found = MOCK_EVENTS.find((e) => e.id === routeInfo.eventId);
        if (found) setSelectedEvent(found);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    setStep(3);
  };

  const handleResetOrder = () => {
    sessionStorage.removeItem('active_checkout_intent_id');
    setCartItems([]);
    setStep(1);
    setPaymentIntent(null);
    setQuantity(1);
  };

  const [userCity, setUserCity] = useState<string>('Tampa, FL');

  // Detect location at root level
  useEffect(() => {
    const fetchIpLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.city && data.region_code) {
          setUserCity(`${data.city}, ${data.region_code}`);
          return;
        }
      } catch {
        // Fallback
      }
      setUserCity('Tampa, FL');
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await res.json();
            const city = data.city || data.locality || 'Tampa';
            const state = data.principalSubdivisionCode?.split('-').pop() || data.principalSubdivision || 'FL';
            setUserCity(`${city}, ${state}`);
          } catch {
            fetchIpLocation();
          }
        },
        () => fetchIpLocation(),
        { timeout: 4000 }
      );
    } else {
      fetchIpLocation();
    }
  }, []);

  // Render Standalone Merchant Admin Dashboard if in Admin View
  if (isAdminView) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
        <Header
          logsCount={logs.length}
          onOpenAudit={() => setIsAuditOpen(true)}
          onResetOrder={handleResetOrder}
          isAdminView={true}
          activeView={activeView}
          onNavigateView={(v) => navigateTo(v)}
          cartCount={quantity}
          userCity={userCity}
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
        activeView={activeView}
        onNavigateView={(v) => navigateTo(v)}
        cartCount={(activeView === 'cart' && step > 1) ? undefined : totalCartCount}
        userCity={userCity}
      />

      {/* Main Container */}
      <main style={{ flex: 1, padding: '2rem 1.5rem 4rem', maxWidth: '1060px', width: '100%', margin: '0 auto' }}>
        
        {/* View 1: Homepage (Event Discovery, Hero Carousel & Location Recommendations) */}
        {activeView === 'home' && (
          <HomePage
            onSelectEvent={(evt) => {
              setSelectedEvent(evt);
              navigateTo('event_detail', evt.id);
            }}
            onNavigateEvents={() => navigateTo('events')}
          />
        )}

        {/* View 2: Dedicated Events Catalog Page */}
        {activeView === 'events' && (
          <EventsPage
            onSelectEvent={(evt) => {
              setSelectedEvent(evt);
              navigateTo('event_detail', evt.id);
            }}
          />
        )}

        {/* View 3: Event Details & Interactive Stadium Seat Selection */}
        {activeView === 'event_detail' && (
          <EventDetailsPage
            event={selectedEvent}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onNavigateCart={() => {
              setStep(1);
              navigateTo('cart');
            }}
            onProceedToCart={(selectedItem) => {
              handleAddToCart(selectedItem);
              setStep(1);
              navigateTo('cart');
            }}
            onBack={() => navigateTo('events')}
          />
        )}

        {/* View 4: Cart & Checkout Page (Houses our existing Cart, Payment, & Confirmation flow) */}
        {activeView === 'cart' && (
          <div>
            {/* Step Progress Tracker (4 Steps: Cart ➔ Add Ons ➔ Payment ➔ Confirmation) */}
            <StepProgress currentStep={step} onStepClick={(s) => setStep(s)} />

            {/* Step 1: Cart & Quantity Selection */}
            {step === 1 && (
              <CartStep
                items={cartItems}
                onUpdateItemQuantity={handleUpdateItemQuantity}
                onRemoveItem={handleRemoveItem}
                onProceed={(method) => {
                  setCaptureMethod(method);
                  setStep(2);
                }}
                onNavigateBrowse={() => navigateTo('events')}
              />
            )}

            {/* Step 2: Payment Method & Confirmation */}
            {step === 2 && (
              <PaymentStep
                items={cartItems}
                item={cartItems[0] || ticketItem}
                quantity={quantity}
                customer={customer}
                captureMethod={captureMethod}
                authType={authType}
                onUpdateCustomer={handleUpdateCustomer}
                onPaymentSuccess={handlePaymentSuccess}
                onBack={() => setStep(1)}
                onCancel={() => setStep(1)}
              />
            )}

            {/* Step 3: Success & Ticket Pass Fulfillment */}
            {step === 3 && (
              <FulfillmentStep
                items={cartItems}
                item={cartItems[0] || ticketItem}
                quantity={quantity}
                customer={customer}
                paymentIntent={paymentIntent || {
                  payment_id: 'pay_mock',
                  merchant_id: 'merchant_1785020339',
                  status: 'succeeded',
                  amount: (ticketItem.unitPriceCents * quantity) + (ticketItem.serviceFeeCents * quantity),
                  currency: 'USD',
                  client_secret: 'sec_test',
                  capture_method: 'automatic',
                }}
                onUpdatePaymentIntent={(updated) => setPaymentIntent(updated)}
                onReset={handleResetOrder}
                onNavigateHome={() => navigateTo('home')}
              />
            )}
          </div>
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

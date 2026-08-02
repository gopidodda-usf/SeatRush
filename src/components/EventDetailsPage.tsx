import React, { useState, useEffect } from 'react';
import type { EventData, VenueSection, TicketItem } from '../types';

interface EventDetailsPageProps {
  event: EventData;
  cartItems?: TicketItem[];
  onAddToCart?: (ticketItem: TicketItem) => void;
  onNavigateCart?: () => void;
  onProceedToCart?: (ticketItem: TicketItem) => void;
  onBack?: () => void;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({
  event,
  onAddToCart,
  onNavigateCart,
  onProceedToCart,
}) => {
  const [selectedSection, setSelectedSection] = useState<VenueSection>(event.sections[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addProgress, setAddProgress] = useState(0);
  const [hasAddedInSession, setHasAddedInSession] = useState(false);

  useEffect(() => {
    setSelectedSection(event.sections[0]);
    setQuantity(1);
    setHasAddedInSession(false);
    setIsAdding(false);
  }, [event.id]);

  const isAdded = hasAddedInSession;

  const handleButtonClick = () => {
    if (isAdded) {
      if (onNavigateCart) {
        onNavigateCart();
      } else if (onProceedToCart) {
        onProceedToCart({
          id: `tkt_${Date.now()}`,
          eventName: event.title,
          league: event.category.toUpperCase(),
          venue: `${event.venue}, ${event.city}`,
          date: event.date,
          time: event.time,
          section: selectedSection.name,
          row: 'Row 4',
          seats: Array.from({ length: quantity }, (_, i) => `Seat 10${i + 1}`).join(', '),
          quantity,
          unitPriceCents: selectedSection.priceCents,
          serviceFeeCents: event.serviceFeeCents,
          imageUrl: event.imageUrl,
        });
      }
    } else if (!isAdding) {
      setIsAdding(true);
      setAddProgress(0);

      const startTime = Date.now();
      const duration = 750;

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, Math.round((elapsed / duration) * 100));
        setAddProgress(pct);

        if (elapsed >= duration) {
          clearInterval(interval);
          const ticketItem: TicketItem = {
            id: `tkt_${Date.now()}`,
            eventName: event.title,
            league: event.category.toUpperCase(),
            venue: `${event.venue}, ${event.city}`,
            date: event.date,
            time: event.time,
            section: selectedSection.name,
            row: 'Row 4',
            seats: Array.from({ length: quantity }, (_, i) => `Seat 10${i + 1}`).join(', '),
            quantity,
            unitPriceCents: selectedSection.priceCents,
            serviceFeeCents: event.serviceFeeCents,
            imageUrl: event.imageUrl,
          };

          if (onAddToCart) {
            onAddToCart(ticketItem);
          } else if (onProceedToCart) {
            onProceedToCart(ticketItem);
          }

          setIsAdding(false);
          setHasAddedInSession(true);
        }
      }, 30);
    }
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Hero Header Banner */}
      <div
        style={{
          marginBottom: '2.5rem',
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '2rem',
          alignItems: 'center',
        }}
      >
        <div style={{ padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                background: 'rgba(139, 92, 246, 0.2)',
                color: 'var(--accent-violet)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                textTransform: 'uppercase',
              }}
            >
              {event.category}
            </span>
            {event.isRushDeal && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  background: 'rgba(244, 63, 94, 0.25)',
                  color: '#FDA4AF',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  textTransform: 'uppercase',
                }}
              >
                SEATRUSH DEAL
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '2.1rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem', lineHeight: 1.15 }}>
            {event.title}
          </h1>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            {event.description}
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>DATE & TIME</span>
              <strong>{event.date} • {event.time}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>LOCATION</span>
              <strong>{event.venue}, {event.city}, {event.state}</strong>
            </div>
          </div>
        </div>

        <div style={{ height: '100%', minHeight: '220px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <img src={event.imageUrl} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>

      {/* Main Grid: Interactive Stadium Map (Left) & Ticket Configuration (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.75rem', alignItems: 'stretch' }}>
        
        {/* Left Column: Interactive Stadium Seat Map */}
        <div style={{
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              Choose Seats
            </h3>
          </div>

          {/* Stadium Section Selector Blocks Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
              {event.sections.map((sec) => {
                const isSelected = selectedSection.id === sec.id;

                return (
                  <div
                    key={sec.id}
                    onClick={() => setSelectedSection(sec)}
                    style={{
                      padding: '1.1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(139, 92, 246, 0.25)' : 'rgba(15, 12, 29, 0.7)',
                      border: '2px solid',
                      borderColor: isSelected ? sec.color : 'rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? `0 0 16px ${sec.color}40` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: sec.color, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      {sec.category} TIER
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                      {sec.name}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-heading)' }}>
                      ${(sec.priceCents / 100).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {sec.availableSeats} seats left
                    </div>
                  </div>
                );
              })}
            </div>
        </div>

        {/* Right Column: Ticket Selector Panel & Checkout CTA */}
        <div style={{
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
            Reserve Tickets
          </h3>

          {/* Selected Section Summary Card */}
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', borderLeft: `4px solid ${selectedSection.color}` }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              SELECTED TIER
            </span>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.1rem' }}>
              {selectedSection.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 700, marginTop: '0.25rem' }}>
              ${(selectedSection.priceCents / 100).toFixed(2)} per ticket
            </div>
          </div>

          {/* Quantity Stepper */}
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem', textAlign: 'center' }}>
              Select Ticket Quantity:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', minWidth: '30px', textAlign: 'center', fontFamily: 'var(--font-heading)' }}>
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(8, q + 1))}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Primary CTA Button */}
          <button
            type="button"
            disabled={isAdding}
            onClick={handleButtonClick}
            className={isAdded ? 'btn-secondary' : 'btn-primary'}
            style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.82rem',
              background: isAdded
                ? 'var(--accent-emerald)'
                : isAdding
                ? 'rgba(139, 92, 246, 0.35)'
                : undefined,
              color: isAdded ? '#090710' : '#FFFFFF',
              borderColor: isAdded ? 'var(--accent-emerald)' : undefined,
              fontWeight: isAdded ? 800 : 700,
              cursor: isAdding ? 'wait' : 'pointer',
              transition: 'background 0.3s ease, border-color 0.3s ease',
            }}
          >
            {/* Horizontal Loading Progress Track */}
            {isAdding && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${addProgress}%`,
                  background: 'linear-gradient(90deg, var(--accent-violet) 0%, var(--accent-cyan) 100%)',
                  opacity: 0.6,
                  transition: 'width 30ms linear',
                  zIndex: 0,
                }}
              />
            )}

            <span style={{ position: 'relative', zIndex: 1 }}>
              {isAdding ? 'Adding Tickets...' : isAdded ? 'Go to Cart ↗' : 'Add to Cart'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};

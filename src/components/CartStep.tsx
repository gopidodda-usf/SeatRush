import React from 'react';
import type { TicketItem, CaptureMethod } from '../types';

interface CartStepProps {
  items?: TicketItem[];
  item?: TicketItem;
  quantity?: number;
  onUpdateQuantity?: (qty: number) => void;
  onUpdateItemQuantity?: (id: string, newQty: number) => void;
  onRemoveItem?: (id: string) => void;
  onProceed: (method: CaptureMethod) => void;
  onNavigateBrowse?: () => void;
}

export const CartStep: React.FC<CartStepProps> = ({
  items,
  item,
  quantity = 1,
  onUpdateQuantity,
  onUpdateItemQuantity,
  onRemoveItem,
  onProceed,
  onNavigateBrowse,
}) => {
  // Normalize items array
  const cartList: TicketItem[] = items && items.length > 0
    ? items
    : item
    ? [{ ...item, quantity }]
    : [];

  const ticketSubtotal = cartList.reduce((sum, i) => sum + (i.unitPriceCents * i.quantity) / 100, 0);
  const serviceFeeTotal = cartList.reduce((sum, i) => sum + (i.serviceFeeCents * i.quantity) / 100, 0);
  const grandTotal = ticketSubtotal + serviceFeeTotal;

  // Empty Cart State
  if (cartList.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', maxWidth: '450px', margin: '2rem auto' }}>
        <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>Your cart is empty</h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Explore live events and add tickets to your cart.
        </p>
        <button
          onClick={() => onNavigateBrowse ? onNavigateBrowse() : (onUpdateQuantity && onUpdateQuantity(2))}
          className="btn-primary"
          style={{ padding: '0.7rem 1.4rem', fontSize: '0.82rem' }}
        >
          Explore Events ↗
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {/* Main Grid: Cart (Left) & Order Breakdown (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* Left Column: Cart Items List */}
        <div className="glass-panel" style={{ padding: '1.25rem', minWidth: 0 }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Cart ({cartList.reduce((s, i) => s + i.quantity, 0)} {cartList.reduce((s, i) => s + i.quantity, 0) === 1 ? 'Ticket' : 'Tickets'})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cartList.map((cartItem) => (
              <div
                key={cartItem.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.05rem 1.25rem',
                  background: 'rgba(9, 7, 16, 0.45)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  minWidth: 0,
                }}
              >
                {/* Left Side: Event Details */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
                  {cartItem.imageUrl && (
                    <img
                      src={cartItem.imageUrl}
                      alt={cartItem.eventName}
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden', minWidth: 0 }}>
                    <strong style={{
                      fontSize: '0.95rem',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {cartItem.eventName}
                    </strong>
                    <div style={{
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 0,
                    }}>
                      {cartItem.section} • {cartItem.venue} • {cartItem.date}
                    </div>
                  </div>
                </div>

                {/* Right Side: Price, Quantity Controls & Remove */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0, marginLeft: '1rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-emerald)', fontFamily: 'var(--font-heading)' }}>
                    ${((cartItem.unitPriceCents * cartItem.quantity) / 100).toFixed(2)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      onClick={() => {
                        if (onUpdateItemQuantity) {
                          onUpdateItemQuantity(cartItem.id, cartItem.quantity - 1);
                        } else if (onUpdateQuantity) {
                          onUpdateQuantity(cartItem.quantity - 1);
                        }
                      }}
                      style={{
                        width: '23px',
                        height: '23px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      -
                    </button>

                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      minWidth: '18px',
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      color: 'var(--text-primary)',
                    }}>
                      {cartItem.quantity}
                    </span>

                    <button
                      onClick={() => {
                        if (onUpdateItemQuantity) {
                          onUpdateItemQuantity(cartItem.id, cartItem.quantity + 1);
                        } else if (onUpdateQuantity) {
                          onUpdateQuantity(cartItem.quantity + 1);
                        }
                      }}
                      style={{
                        width: '23px',
                        height: '23px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      +
                    </button>
                  </div>

                  {onRemoveItem && (
                    <button
                      onClick={() => onRemoveItem(cartItem.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '0.2rem',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Order Breakdown & Bottom Proceed Action Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Order Breakdown
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tickets Subtotal</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>${ticketSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Service Fees</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>${serviceFeeTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style={{
              borderTop: '1px dashed var(--border-subtle)',
              paddingTop: '0.85rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total USD</span>
              <span style={{ fontSize: '1.35rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)' }}>
                ${grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Action Row: Dual Action Buttons under Order Breakdown Column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.75rem', marginTop: 'auto', paddingTop: '2.5rem' }}>
        <div style={{ minWidth: 0 }} /> {/* Left empty space matching Cart column */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <button
            onClick={() => onProceed('automatic')}
            className="btn-primary"
            style={{ padding: '0.75rem 0.5rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
          >
            Pay Now
          </button>

          <button
            onClick={() => onProceed('manual')}
            className="btn-secondary"
            style={{
              padding: '0.65rem 0.5rem',
              fontSize: '0.78rem',
              borderColor: '#60A5FA',
              color: '#93C5FD',
              background: 'rgba(59, 130, 246, 0.1)',
              whiteSpace: 'nowrap',
            }}
          >
            Reserve Seat
          </button>
        </div>
      </div>

    </div>
  );
};

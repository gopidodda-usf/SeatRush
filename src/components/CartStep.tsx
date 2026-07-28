import React from 'react';
import type { TicketItem } from '../types';

interface CartStepProps {
  item: TicketItem;
  quantity: number;
  onUpdateQuantity: (qty: number) => void;
  onProceed: () => void;
}

export const CartStep: React.FC<CartStepProps> = ({
  item,
  quantity,
  onUpdateQuantity,
  onProceed,
}) => {
  const ticketSubtotal = (item.unitPriceCents * quantity) / 100;
  const serviceFeeTotal = (item.serviceFeeCents * quantity) / 100;
  const grandTotal = ticketSubtotal + serviceFeeTotal;

  // Empty Cart State when quantity === 0
  if (quantity === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', maxWidth: '450px', margin: '2rem auto' }}>
        <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>Your cart is empty</h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          The item hold has been released.
        </p>
        <button onClick={() => onUpdateQuantity(2)} className="btn-primary" style={{ padding: '0.7rem 1.4rem', fontSize: '0.82rem' }}>
          Re-add Tickets to Cart
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {/* Main Grid: Cart (Left) & Order Breakdown (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* Left Column: Cart */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Cart
          </h3>

          {/* Lengthened Cart Item Card */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.05rem 1.25rem',
            background: 'rgba(9, 7, 16, 0.45)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}>
            {/* Left Side: Event Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'hidden' }}>
              <strong style={{
                fontSize: '1rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {item.eventName}
              </strong>
              <div style={{
                fontSize: '0.76rem',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {item.venue} • {item.date} • {item.time}
              </div>
            </div>

            {/* Right Side: Center-Aligned Price & Quantity Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginLeft: '1.25rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', textAlign: 'center', fontFamily: 'var(--font-heading)' }}>
                ${(item.unitPriceCents / 100).toFixed(2)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <button
                  onClick={() => onUpdateQuantity(quantity - 1)}
                  title={quantity === 1 ? 'Remove item' : 'Decrease quantity'}
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
                  {quantity}
                </span>

                <button
                  onClick={() => onUpdateQuantity(quantity + 1)}
                  title="Increase quantity"
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
            </div>

          </div>
        </div>

        {/* Right Column: Order Breakdown & Bottom Proceed Action Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Order Breakdown
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tickets</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{quantity} x ${(item.unitPriceCents / 100).toFixed(2)}</span>
                <span style={{ fontWeight: 600, textAlign: 'right', minWidth: '55px' }}>${ticketSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Service Fee</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{quantity} x ${(item.serviceFeeCents / 100).toFixed(2)}</span>
                <span style={{ fontWeight: 600, textAlign: 'right', minWidth: '55px' }}>${serviceFeeTotal.toFixed(2)}</span>
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

      {/* Bottom Action Row: Positioned Way to the Bottom above the Footer, Underneath the Order Breakdown Column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.75rem', marginTop: 'auto', paddingTop: '2.5rem' }}>
        <div /> {/* Left empty space matching Cart column */}
        <div>
          <button
            onClick={onProceed}
            className="btn-primary"
            style={{ width: '100%', padding: '0.8rem 1.25rem', fontSize: '0.88rem' }}
          >
            Proceed to Payment →
          </button>
        </div>
      </div>

    </div>
  );
};

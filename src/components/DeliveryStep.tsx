import React from 'react';
import type { CustomerDetails, TicketItem } from '../types';

interface DeliveryStepProps {
  item: TicketItem;
  quantity: number;
  customer: CustomerDetails;
  onUpdateCustomer: (updated: Partial<CustomerDetails>) => void;
  onBack: () => void;
  onProceed: () => void;
}

export const DeliveryStep: React.FC<DeliveryStepProps> = ({
  item,
  quantity,
  customer,
  onUpdateCustomer,
  onBack,
  onProceed,
}) => {
  const grandTotal = ((item.unitPriceCents + item.serviceFeeCents) * quantity) / 100;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.75rem', alignItems: 'start' }}>
      
      {/* Form Panel */}
      <div className="glass-panel">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
          Customer & Delivery Information
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Full Name
            </label>
            <input
              type="text"
              value={customer.fullName}
              onChange={(e) => onUpdateCustomer({ fullName: e.target.value })}
              className="input-field"
              placeholder="e.g. Alex Morgan"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Email Address
              </label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => onUpdateCustomer({ email: e.target.value })}
                className="input-field"
                placeholder="alex.morgan@example.com"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={customer.phone}
                onChange={(e) => onUpdateCustomer({ phone: e.target.value })}
                className="input-field"
                placeholder="+1 (305) 555-0192"
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Digital Ticket Delivery Method
            </label>
            <select
              value={customer.deliveryMethod}
              onChange={(e) => onUpdateCustomer({ deliveryMethod: e.target.value as any })}
              className="input-field"
            >
              <option value="mobile_pass">Mobile Ticket Transfer (Apple Wallet / Google Wallet)</option>
              <option value="instant_qr">Instant Gate QR Pass (Browser PDF)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Column */}
      <div>
        <div className="glass-panel" style={{ position: 'sticky', top: '100px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Summary
          </h3>

          <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{item.eventName}</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {quantity}x Tickets • Sec {item.section}, Row {item.row}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Order Total:</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              ${grandTotal.toFixed(2)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={onProceed} className="btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}>
              Continue to Payment →
            </button>
            <button onClick={onBack} className="btn-secondary" style={{ width: '100%', padding: '0.75rem' }}>
              ← Back to Cart
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

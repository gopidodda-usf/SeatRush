import React, { useState } from 'react';
import type { CustomerDetails, TicketItem, HyperswitchPaymentIntent, HyperswitchRefund } from '../types';

interface FulfillmentStepProps {
  item: TicketItem;
  quantity: number;
  customer: CustomerDetails;
  paymentIntent: HyperswitchPaymentIntent;
  onUpdatePaymentIntent: (updated: HyperswitchPaymentIntent) => void;
  onReset: () => void;
}

export const FulfillmentStep: React.FC<FulfillmentStepProps> = ({
  item,
  quantity,
  customer,
  paymentIntent,
  onReset,
}) => {
  const [refundList] = useState<HyperswitchRefund[]>([]);

  const totalCents = (item.unitPriceCents + item.serviceFeeCents) * quantity;
  const grandTotal = totalCents / 100;

  const isCaptured = paymentIntent.status === 'succeeded';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '1.25rem', alignItems: 'start' }}>
      
      {/* Left Column: Order Confirmation & Ticket Pass */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Banner */}
        <div className="glass-panel" style={{
          padding: '1.25rem',
          background: isCaptured
            ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.15) 0%, rgba(56, 189, 248, 0.08) 100%)'
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%)',
          borderColor: isCaptured ? 'var(--accent-emerald)' : 'var(--accent-amber)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: isCaptured ? 'rgba(52, 211, 153, 0.25)' : 'rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 800,
              color: isCaptured ? 'var(--accent-emerald)' : 'var(--accent-amber)',
            }}>
              {isCaptured ? 'OK' : 'WAIT'}
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)', margin: 0, color: 'var(--text-primary)' }}>
                {isCaptured ? 'Order Confirmed! Your Tickets Are Ready' : 'Order Reserved! Pending Seller Transfer'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                Payment Ref: <code style={{ color: 'var(--accent-cyan)' }}>{paymentIntent.payment_id}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Stadium Ticket Pass Card with Notch Edges */}
        <div className="glass-panel ticket-notch-card" style={{
          background: 'linear-gradient(180deg, #111827 0%, #070A11 100%)',
          padding: '1.35rem',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-glow)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                US Marketplace Pass
              </span>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                {item.eventName}
              </h3>
            </div>
            <span className="btn-secondary" style={{ fontSize: '0.7rem', padding: '0.25rem 0.65rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)' }}>
              MOBILE TICKET
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.15rem' }}>
            {item.venue} • {item.date} @ {item.time}
          </p>

          {/* Ticket Metadata Barcode Banner */}
          <div style={{
            background: '#FFFFFF',
            padding: '1.15rem',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.25em' }}>
              |||| | |||||| || | |||| ||||
            </div>
            <div style={{ fontFamily: 'monospace', color: '#64748B', fontSize: '0.72rem', marginTop: '0.35rem' }}>
              GATE ENTRY BARCODE: {paymentIntent.payment_id}
            </div>
          </div>

          {/* Actions: Add to Wallet & Download PDF */}
          <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.15rem' }}>
            <button className="btn-secondary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.78rem' }}>
              Add to Apple Wallet
            </button>
            <button className="btn-secondary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.78rem' }}>
              Download PDF Pass
            </button>
          </div>
        </div>
      </div>

      {/* Right Column Summary */}
      <div>
        <div className="glass-panel" style={{ padding: '1.15rem', position: 'sticky', top: '90px' }}>
          <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)', marginBottom: '0.85rem', color: 'var(--text-primary)' }}>
            Payment Receipt
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ticket Holder</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{customer.fullName || 'Alex Morgan'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status</span>
              <span style={{
                color: isCaptured ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                fontWeight: 800,
                textTransform: 'uppercase',
                fontSize: '0.72rem'
              }}>
                {paymentIntent.status}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Amount Paid</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${grandTotal.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Refund Receipts */}
          {refundList.length > 0 && (
            <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.4rem' }}>Refund History</div>
              {refundList.map((r) => (
                <div key={r.refund_id} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  • {r.refund_id}: ${(r.amount / 100).toFixed(2)} ({r.status})
                </div>
              ))}
            </div>
          )}

          <button onClick={onReset} className="btn-secondary" style={{ width: '100%', marginTop: '1.15rem', padding: '0.7rem', fontSize: '0.82rem' }}>
            Start New Order
          </button>
        </div>
      </div>

    </div>
  );
};

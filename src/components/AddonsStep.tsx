import React, { useState, useEffect } from 'react';
import type { CustomerDetails, TicketItem, CaptureMethod, AuthenticationType } from '../types';
import { createPaymentIntent, updatePaymentIntent, getStoredTransactions } from '../services/hyperswitchApi';

interface AddonsStepProps {
  item: TicketItem;
  quantity: number;
  customer: CustomerDetails;
  captureMethod: CaptureMethod;
  authType: AuthenticationType;
  onProceedToPayment: () => void;
  onBackToCart: () => void;
}

export const AddonsStep: React.FC<AddonsStepProps> = ({
  item,
  quantity,
  customer,
  captureMethod,
  onProceedToPayment,
  onBackToCart,
}) => {
  const [hasVipProtection, setHasVipProtection] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [hasMerch, setHasMerch] = useState(false);
  const [hasFood, setHasFood] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const baseCents = (item.unitPriceCents + item.serviceFeeCents) * quantity;
  const vipCents = hasVipProtection ? 1500 : 0;
  const parkingCents = hasParking ? 2500 : 0;
  const merchCents = hasMerch ? 1000 : 0;
  const foodCents = hasFood ? 2000 : 0;

  const totalAddonsCents = vipCents + parkingCents + merchCents + foodCents;
  const grandTotalCents = baseCents + totalAddonsCents;

  // Initialize or update intent on mount
  useEffect(() => {
    let isSubscribed = true;

    async function ensureIntent() {
      const existingSessionId = sessionStorage.getItem('active_checkout_intent_id');
      const isPending = sessionStorage.getItem('active_checkout_intent_pending');

      if (existingSessionId) {
        const storedTx = getStoredTransactions().find((t) => t.payment_id === existingSessionId);
        if (storedTx && storedTx.status !== 'cancelled') {
          if (isSubscribed) {
            setHasVipProtection(Boolean(storedTx.has_vip_protection));
          }
          return;
        }
        if (storedTx && storedTx.status === 'cancelled') {
          sessionStorage.removeItem('active_checkout_intent_id');
        }
      }

      if (isPending) return;

      sessionStorage.setItem('active_checkout_intent_pending', 'true');

      try {
        const { data } = await createPaymentIntent({
          amountCents: baseCents,
          currency: 'USD',
          captureMethod,
          customerName: customer.fullName,
          customerEmail: customer.email,
        });

        if (data && data.payment_id) {
          sessionStorage.setItem('active_checkout_intent_id', data.payment_id);
        }
      } finally {
        sessionStorage.removeItem('active_checkout_intent_pending');
      }
    }

    ensureIntent();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Update intent live as add-ons are toggled
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

    const addonNames: Record<'vip' | 'parking' | 'merch' | 'food', string> = {
      vip: 'VIP Ticket Protection',
      parking: 'VIP Express Parking Pass',
      merch: 'Souvenir Lanyard',
      food: '$25 Concession Voucher',
    };

    const newAddonCents =
      (newVip ? 1500 : 0) +
      (newParking ? 2500 : 0) +
      (newMerch ? 1000 : 0) +
      (newFood ? 2000 : 0);

    const newTotalCents = baseCents + newAddonCents;
    const targetPaymentId = sessionStorage.getItem('active_checkout_intent_id');

    if (targetPaymentId) {
      setIsUpdating(true);
      await updatePaymentIntent(targetPaymentId, {
        amountCents: newTotalCents,
        metadata: {
          has_vip_protection: newVip,
          has_parking: newParking,
          has_merch: newMerch,
          has_food: newFood,
        },
        lastChangedAddon: {
          name: addonNames[addonType],
          action: checked ? 'Added' : 'Removed',
        },
      });
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {/* Main Grid: Add Ons Options (Left) & Live Order Summary (Right - 320px Width) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* Left Column: Add Ons Cards inside Glass Panel */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Add Ons
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

          {/* Addon 1: VIP Ticket Protection */}
          <div className="glass-panel" style={{
            padding: '1rem 1.15rem',
            minHeight: '84px',
            display: 'flex',
            alignItems: 'center',
            borderColor: hasVipProtection ? 'var(--accent-violet)' : 'var(--border-subtle)',
            background: hasVipProtection ? 'rgba(139, 92, 246, 0.12)' : 'rgba(9, 7, 16, 0.45)',
            transition: 'all 0.2s ease',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer', width: '100%' }}>
              <input
                type="checkbox"
                checked={hasVipProtection}
                onChange={(e) => handleToggleAddon('vip', e.target.checked)}
                style={{ accentColor: 'var(--accent-violet)', marginTop: '0.2rem', transform: 'scale(1.2)', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    VIP Ticket Protection
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--accent-violet)' }}>
                    +$15.00
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0' }}>
                  100% refund coverage if you cannot attend due to illness, severe weather, or travel disruption.
                </p>
              </div>
            </label>
          </div>

          {/* Addon 2: VIP Express Parking Pass */}
          <div className="glass-panel" style={{
            padding: '1rem 1.15rem',
            minHeight: '84px',
            display: 'flex',
            alignItems: 'center',
            borderColor: hasParking ? 'var(--accent-violet)' : 'var(--border-subtle)',
            background: hasParking ? 'rgba(139, 92, 246, 0.12)' : 'rgba(9, 7, 16, 0.45)',
            transition: 'all 0.2s ease',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer', width: '100%' }}>
              <input
                type="checkbox"
                checked={hasParking}
                onChange={(e) => handleToggleAddon('parking', e.target.checked)}
                style={{ accentColor: 'var(--accent-violet)', marginTop: '0.2rem', transform: 'scale(1.2)', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    VIP Express Parking Pass
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--accent-violet)' }}>
                    +$25.00
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0' }}>
                  Guaranteed reserved parking spot in Stadium Lot A directly adjacent to the main entrance.
                </p>
              </div>
            </label>
          </div>

          {/* Addon 3: Commemorative Merch Pass */}
          <div className="glass-panel" style={{
            padding: '1rem 1.15rem',
            minHeight: '84px',
            display: 'flex',
            alignItems: 'center',
            borderColor: hasMerch ? 'var(--accent-violet)' : 'var(--border-subtle)',
            background: hasMerch ? 'rgba(139, 92, 246, 0.12)' : 'rgba(9, 7, 16, 0.45)',
            transition: 'all 0.2s ease',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer', width: '100%' }}>
              <input
                type="checkbox"
                checked={hasMerch}
                onChange={(e) => handleToggleAddon('merch', e.target.checked)}
                style={{ accentColor: 'var(--accent-violet)', marginTop: '0.2rem', transform: 'scale(1.2)', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    Commemorative Souvenir Lanyard
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--accent-violet)' }}>
                    +$10.00
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0' }}>
                  Official collector's metallic pass badge & custom event lanyard delivered upon venue entry.
                </p>
              </div>
            </label>
          </div>

          {/* Addon 4: Stadium Concession Voucher */}
          <div className="glass-panel" style={{
            padding: '1rem 1.15rem',
            minHeight: '84px',
            display: 'flex',
            alignItems: 'center',
            borderColor: hasFood ? 'var(--accent-violet)' : 'var(--border-subtle)',
            background: hasFood ? 'rgba(139, 92, 246, 0.12)' : 'rgba(9, 7, 16, 0.45)',
            transition: 'all 0.2s ease',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer', width: '100%' }}>
              <input
                type="checkbox"
                checked={hasFood}
                onChange={(e) => handleToggleAddon('food', e.target.checked)}
                style={{ accentColor: 'var(--accent-violet)', marginTop: '0.2rem', transform: 'scale(1.2)', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    $25 Concession Voucher
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--accent-violet)' }}>
                    +$20.00
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0' }}>
                  Pre-purchased food & beverage digital credit valid at all stadium snack bars and concessions.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

        {/* Right Column: Order Summary */}
        <div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Order Summary
            </h3>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              {item.eventName}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {quantity}x Tickets • {item.venue}
            </p>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
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

              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.5rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                <span>Total</span>
                <span>${(grandTotalCents / 100).toFixed(2)}</span>
              </div>
            </div>

            {isUpdating && (
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', marginTop: '0.6rem', textAlign: 'center', fontStyle: 'italic' }}>
                Updating payment intent...
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Action Row: Back to Cart (Left) & Proceed to Payment (Right - 320px Width) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.75rem', marginTop: 'auto', paddingTop: '2.5rem' }}>
        <div>
          <button
            onClick={onBackToCart}
            className="btn-secondary"
            style={{ padding: '0.8rem 1.5rem', fontSize: '0.88rem' }}
          >
            ← Back
          </button>
        </div>

        <div>
          <button
            onClick={onProceedToPayment}
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

import React, { useState, useEffect } from 'react';
import type { AdminTransactionRecord, PaymentStatus } from '../types';
import {
  getStoredTransactions,
  clearAllStoredTransactions,
  capturePayment,
  cancelPayment,
  createRefund,
  incrementalAuthorization,
  extendAuthorization,
} from '../services/hyperswitchApi';

export const AdminDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<AdminTransactionRecord[]>(getStoredTransactions());
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedTxIds, setExpandedTxIds] = useState<Record<string, boolean>>({});
  const [partialCaptureInput, setPartialCaptureInput] = useState<{ [id: string]: string }>({});
  const [partialRefundInput, setPartialRefundInput] = useState<{ [id: string]: string }>({});
  const [incrementalInput, setIncrementalInput] = useState<{ [id: string]: string }>({});

  // Sync stored transactions live across browser tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setTransactions(getStoredTransactions());
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleClearAll = () => {
    clearAllStoredTransactions();
    setTransactions([]);
    setExpandedTxIds({});
  };

  const toggleExpand = (id: string) => {
    setExpandedTxIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const areAllExpanded = transactions.length > 0 && transactions.every((t) => expandedTxIds[t.payment_id]);

  const handleToggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedTxIds({});
    } else {
      const allMap: Record<string, boolean> = {};
      transactions.forEach((t) => {
        allMap[t.payment_id] = true;
      });
      setExpandedTxIds(allMap);
    }
  };

  // Helper to format date as YYYY/MM/DD
  const formatDateYYYYMMDD = (isoStr: string) => {
    const d = new Date(isoStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
  };

  // Admin Actions
  const handleFullCapture = async (tx: AdminTransactionRecord) => {
    setActionLoadingId(tx.payment_id);
    await capturePayment(tx.payment_id, tx.total_amount_cents, false);
    setActionLoadingId(null);
    setTransactions(getStoredTransactions());
  };

  const handlePartialCapture = async (tx: AdminTransactionRecord) => {
    const inputVal = partialCaptureInput[tx.payment_id];
    const dollars = parseFloat(inputVal || '150');
    if (isNaN(dollars) || dollars <= 0) return;
    const cents = Math.round(dollars * 100);

    setActionLoadingId(tx.payment_id);
    await capturePayment(tx.payment_id, cents, true);
    setActionLoadingId(null);
    setTransactions(getStoredTransactions());
  };

  const handleIncrementalAuth = async (tx: AdminTransactionRecord) => {
    const inputVal = incrementalInput[tx.payment_id];
    const dollars = parseFloat(inputVal || '50');
    if (isNaN(dollars) || dollars <= 0) return;
    const cents = Math.round(dollars * 100);

    setActionLoadingId(tx.payment_id);
    await incrementalAuthorization(tx.payment_id, cents);
    setActionLoadingId(null);
    setTransactions(getStoredTransactions());
  };

  const handleExtendAuth = async (tx: AdminTransactionRecord) => {
    setActionLoadingId(tx.payment_id);
    await extendAuthorization(tx.payment_id);
    setActionLoadingId(null);
    setTransactions(getStoredTransactions());
  };

  const handleVoidOrCancel = async (tx: AdminTransactionRecord, reason: string) => {
    setActionLoadingId(tx.payment_id);
    await cancelPayment(tx.payment_id, reason);
    setActionLoadingId(null);
    setTransactions(getStoredTransactions());
  };

  const handleFullRefund = async (tx: AdminTransactionRecord) => {
    setActionLoadingId(tx.payment_id);
    await createRefund(tx.payment_id, tx.amount_captured_cents || tx.total_amount_cents, 'Admin Full Refund');
    setActionLoadingId(null);
    setTransactions(getStoredTransactions());
  };

  const handlePartialRefund = async (tx: AdminTransactionRecord) => {
    const inputVal = partialRefundInput[tx.payment_id];
    const dollars = parseFloat(inputVal || '50');
    if (isNaN(dollars) || dollars <= 0) return;
    const cents = Math.round(dollars * 100);

    setActionLoadingId(tx.payment_id);
    await createRefund(tx.payment_id, cents, 'Admin Partial Refund');
    setActionLoadingId(null);
    setTransactions(getStoredTransactions());
  };

  // Metrics Calculations
  const totalTxCount = transactions.length;
  const totalAuthorizedHoldCents = transactions.reduce((acc, t) => acc + (t.status === 'requires_capture' ? t.authorized_hold_cents : 0), 0);
  const totalSettledCents = transactions.reduce((acc, t) => acc + t.amount_captured_cents, 0);
  const totalRefundedCents = transactions.reduce((acc, t) => acc + t.amount_refunded_cents, 0);

  const getStatusBadgeStyle = (status: PaymentStatus) => {
    switch (status) {
      case 'succeeded':
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' };
      case 'requires_capture':
        return { background: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: '1px solid rgba(168, 85, 247, 0.3)' };
      case 'requires_payment_method':
        return { background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)' };
      case 'requires_confirmation':
        return { background: 'rgba(30, 58, 138, 0.45)', color: '#93C5FD', border: '1px solid rgba(37, 99, 235, 0.45)' };
      case 'partially_captured':
      case 'partially_captured_and_capturable':
        return { background: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA', border: '1px solid rgba(139, 92, 246, 0.3)' };
      case 'partially_refunded':
        return { background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'refunded':
        return { background: 'rgba(156, 163, 175, 0.15)', color: '#9CA3AF', border: '1px solid rgba(156, 163, 175, 0.3)' };
      case 'cancelled':
        return { background: 'rgba(244, 63, 94, 0.15)', color: '#F87171', border: '1px solid rgba(244, 63, 94, 0.3)' };
      case 'requires_customer_action':
        return { background: 'rgba(6, 182, 212, 0.15)', color: '#22D3EE', border: '1px solid rgba(6, 182, 212, 0.3)' };
      default:
        return { background: 'rgba(234, 179, 8, 0.15)', color: '#FACC15', border: '1px solid rgba(234, 179, 8, 0.3)' };
    }
  };

  const formatHistoryLabel = (label: string) => {
    if (label.includes('(Updated)')) {
      const mainStatus = label.replace(' (Updated)', '').trim() as PaymentStatus;
      return { status: mainStatus, isUpdated: true };
    }
    return { status: label as PaymentStatus, isUpdated: false };
  };

  // Base Operation Button Style
  const baseOpBtnStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    fontWeight: 600,
    padding: '0.45rem 0.85rem',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  };

  // Semantic Color Variants
  const redBtnStyle: React.CSSProperties = {
    ...baseOpBtnStyle,
    background: 'rgba(244, 63, 94, 0.15)',
    color: '#F87171',
    border: '1px solid rgba(244, 63, 94, 0.4)',
  };

  const greenBtnStyle: React.CSSProperties = {
    ...baseOpBtnStyle,
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34D399',
    border: '1px solid rgba(16, 185, 129, 0.4)',
  };

  const yellowBtnStyle: React.CSSProperties = {
    ...baseOpBtnStyle,
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#FBBF24',
    border: '1px solid rgba(245, 158, 11, 0.4)',
  };

  const orangeBtnStyle: React.CSSProperties = {
    ...baseOpBtnStyle,
    background: 'rgba(249, 115, 22, 0.15)',
    color: '#FB923C',
    border: '1px solid rgba(249, 115, 22, 0.4)',
  };

  const unifiedInputStyle: React.CSSProperties = {
    width: '90px',
    padding: '0.4rem 0.5rem 0.4rem 1.45rem',
    fontSize: '0.78rem',
    fontFamily: 'inherit',
    background: 'rgba(9, 7, 16, 0.6)',
    color: '#F8FAFC',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: '6px',
    outline: 'none',
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1240px', margin: '0 auto' }}>

      {/* Top Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Transactions
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {totalTxCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Authorized Pre-Auth Holds
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60A5FA', marginTop: '0.25rem' }}>
            ${(totalAuthorizedHoldCents / 100).toFixed(2)}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Settled Revenue Captured
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34D399', marginTop: '0.25rem' }}>
            ${(totalSettledCents / 100).toFixed(2)}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Refunds Processed
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FBBF24', marginTop: '0.25rem' }}>
            ${(totalRefundedCents / 100).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Main Transactions Table Container */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        
        {/* Header row with Transaction Records title and Clear Transactions button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', margin: 0 }}>
            Transaction Records
          </h3>

          {transactions.length > 0 && (
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={handleToggleExpandAll}
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
              >
                {areAllExpanded ? 'Collapse All' : 'Expand All'}
              </button>
              <button
                onClick={handleClearAll}
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderColor: 'var(--accent-rose)', color: '#FDA4AF' }}
              >
                Clear Transactions
              </button>
            </div>
          )}
        </div>

        {transactions.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No customer transactions created yet. Open a Customer Storefront tab and create an order to see live real-time sync!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Datetime</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Payment ID</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Customer</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Total Amount</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Captured Amount</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isLoading = actionLoadingId === tx.payment_id;
                  const isExpanded = Boolean(expandedTxIds[tx.payment_id]);
                  const statusStyle = getStatusBadgeStyle(tx.status);
                  const historyList = tx.history || [];
                  const recentFirstHistory = [...historyList].reverse();

                  return (
                    <React.Fragment key={tx.payment_id}>
                      <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.06)', background: isExpanded ? 'rgba(139, 92, 246, 0.04)' : 'transparent' }}>
                        
                        {/* Datetime (YYYY/MM/DD Date Muted First, Time Bold Beside) */}
                        <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginRight: '0.4rem' }}>
                            {formatDateYYYYMMDD(tx.created_at)}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </td>

                        {/* Payment ID */}
                        <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'middle', textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                            {tx.payment_id}
                          </div>
                        </td>

                        {/* Customer */}
                        <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'middle', textAlign: 'center' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {tx.customer_name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {tx.customer_email}
                          </div>
                        </td>

                        {/* Total Amount (Center Aligned) */}
                        <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'middle', textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            ${(tx.total_amount_cents / 100).toFixed(2)}
                          </div>
                        </td>

                        {/* Captured Amount (Center Aligned) */}
                        <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'middle', textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: tx.amount_captured_cents > 0 ? '#34D399' : 'var(--text-muted)' }}>
                            ${(tx.amount_captured_cents / 100).toFixed(2)}
                          </div>
                          {tx.amount_refunded_cents > 0 && (
                            <div style={{ fontSize: '0.68rem', color: '#FBBF24', marginTop: '0.1rem' }}>
                              Refunded: ${(tx.amount_refunded_cents / 100).toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Status Badge (Center Aligned, Boxy 4px Border Radius) */}
                        <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'middle', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            display: 'inline-block',
                            ...statusStyle,
                          }}>
                            {tx.status}
                          </span>
                        </td>

                        {/* Dedicated Details Link Column (No Column Header) */}
                        <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'middle', textAlign: 'center' }}>
                          <button
                            onClick={() => toggleExpand(tx.payment_id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-violet)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              textDecoration: 'none',
                            }}
                          >
                            <span>Details</span>
                            <span style={{ fontSize: '0.6rem' }}>{isExpanded ? '▲' : '▼'}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Details Panel */}
                      {isExpanded && (
                        <tr style={{ background: 'rgba(139, 92, 246, 0.06)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          <td colSpan={7} style={{ padding: '1.25rem' }}>
                            
                            {/* Operations Bar Floating Directly on Purple Background */}
                            <div style={{
                              marginBottom: '1.25rem',
                              overflowX: 'auto',
                              padding: '0.2rem 0',
                            }}>
                              {isLoading ? (
                                <div style={{ fontSize: '0.78rem', color: 'var(--accent-violet)', fontStyle: 'italic' }}>
                                  Processing REST API request...
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', width: '100%', gap: '0.85rem', whiteSpace: 'nowrap' }}>
                                  
                                  {/* Actions for `requires_capture` state */}
                                  {tx.status === 'requires_capture' && (
                                    <>
                                      {/* Left side: Pre-Auth Void & Auth Management */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                        <button
                                          onClick={() => handleVoidOrCancel(tx, 'Merchant Pre-Auth Void')}
                                          style={redBtnStyle}
                                        >
                                          Void Pre-Auth
                                        </button>

                                        {/* Visual Divider */}
                                        <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.2)', margin: '0 0.2rem' }} />

                                        {/* Middle: Auth Management (Orange) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <button
                                            onClick={() => handleExtendAuth(tx)}
                                            style={orangeBtnStyle}
                                          >
                                            Extend Auth (+7d)
                                          </button>

                                          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                            <span style={{ position: 'absolute', left: '0.55rem', fontSize: '0.78rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>$</span>
                                            <input
                                              type="number"
                                              placeholder="50.00"
                                              value={incrementalInput[tx.payment_id] || ''}
                                              onChange={(e) => setIncrementalInput({ ...incrementalInput, [tx.payment_id]: e.target.value })}
                                              style={unifiedInputStyle}
                                            />
                                            <button
                                              onClick={() => handleIncrementalAuth(tx)}
                                              style={{ ...orangeBtnStyle, marginLeft: '0.35rem' }}
                                            >
                                              + Add Auth Hold
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right side: Captures (Green & Yellow) */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginLeft: 'auto' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <button
                                            onClick={() => handleFullCapture(tx)}
                                            style={greenBtnStyle}
                                          >
                                            Full Capture (${(tx.total_amount_cents / 100).toFixed(2)})
                                          </button>

                                          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                            <span style={{ position: 'absolute', left: '0.55rem', fontSize: '0.78rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>$</span>
                                            <input
                                              type="number"
                                              placeholder="150.00"
                                              value={partialCaptureInput[tx.payment_id] || ''}
                                              onChange={(e) => setPartialCaptureInput({ ...partialCaptureInput, [tx.payment_id]: e.target.value })}
                                              style={unifiedInputStyle}
                                            />
                                            <button
                                              onClick={() => handlePartialCapture(tx)}
                                              style={{ ...yellowBtnStyle, marginLeft: '0.35rem' }}
                                            >
                                              Partial Capture
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {/* Actions for `succeeded`, `partially_captured`, `partially_captured_and_capturable`, `partially_refunded` */}
                                  {(tx.status === 'succeeded' || tx.status === 'partially_captured' || tx.status === 'partially_captured_and_capturable' || tx.status === 'partially_refunded') && (
                                    <>
                                      {/* Left Side: Post-Capture Void */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                        {tx.status !== 'partially_refunded' && (
                                          <button
                                            onClick={() => handleVoidOrCancel(tx, 'Same-Day Post-Capture Void')}
                                            style={redBtnStyle}
                                          >
                                            Cancel Post-Capture (Void)
                                          </button>
                                        )}
                                      </div>

                                      {/* Right Side: Full Refund & Partial Refund */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginLeft: 'auto' }}>
                                        <button
                                          onClick={() => handleFullRefund(tx)}
                                          style={greenBtnStyle}
                                        >
                                          Full Refund
                                        </button>

                                        {/* Visual Divider between Full Refund and Partial Refund */}
                                        <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.2)', margin: '0 0.2rem' }} />

                                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                          <span style={{ position: 'absolute', left: '0.55rem', fontSize: '0.78rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>$</span>
                                          <input
                                            type="number"
                                            placeholder="50.00"
                                            value={partialRefundInput[tx.payment_id] || ''}
                                            onChange={(e) => setPartialRefundInput({ ...partialRefundInput, [tx.payment_id]: e.target.value })}
                                            style={unifiedInputStyle}
                                          />
                                          <button
                                            onClick={() => handlePartialRefund(tx)}
                                            style={{ ...yellowBtnStyle, marginLeft: '0.35rem' }}
                                          >
                                            Partial Refund
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {/* Actions for `requires_payment_method` / `requires_confirmation` / `requires_customer_action` (Red - Left Side) */}
                                  {(tx.status === 'requires_payment_method' || tx.status === 'requires_confirmation' || tx.status === 'requires_customer_action') && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                      <button
                                        onClick={() => handleVoidOrCancel(tx, 'Customer Session Cancelled')}
                                        style={redBtnStyle}
                                      >
                                        Cancel Session
                                      </button>
                                    </div>
                                  )}

                                  {/* Terminal States */}
                                  {tx.status === 'refunded' && (
                                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                      100% Refunded to Customer
                                    </div>
                                  )}

                                  {tx.status === 'cancelled' && (
                                    <div style={{ fontSize: '0.78rem', color: '#F87171', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                      Session / Authorization Cancelled
                                    </div>
                                  )}

                                </div>
                              )}
                            </div>

                            {/* Payment Sequence Encapsulated in Dark Container Box */}
                            <div style={{
                              padding: '1rem 1.25rem',
                              background: 'rgba(9, 7, 16, 0.65)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 'var(--radius-md)',
                            }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-violet)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                Payment Sequence
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', borderLeft: '2px solid rgba(139, 92, 246, 0.4)', paddingLeft: '1rem' }}>
                                {recentFirstHistory.map((evt) => {
                                  const parsed = formatHistoryLabel(evt.label);
                                  const evtStatusStyle = getStatusBadgeStyle(parsed.status);

                                  return (
                                    <div key={evt.id} style={{
                                      fontSize: '0.78rem',
                                      display: 'grid',
                                      gridTemplateColumns: '90px 200px 1fr',
                                      alignItems: 'center',
                                      gap: '1rem',
                                      padding: '0.2rem 0',
                                    }}>
                                      
                                      {/* Column 1: Datetime */}
                                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </div>

                                      {/* Column 2: Status Badge Alone */}
                                      <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                        <span style={{
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                          padding: '0.15rem 0.5rem',
                                          borderRadius: '4px',
                                          textTransform: 'uppercase',
                                          ...evtStatusStyle,
                                        }}>
                                          {parsed.status}
                                        </span>
                                      </div>

                                      {/* Column 3: Description Details Column */}
                                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                        {parsed.isUpdated ? `Payment Updated — ${evt.details}` : evt.details}
                                      </div>

                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

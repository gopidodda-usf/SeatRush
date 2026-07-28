import React from 'react';

interface HeaderProps {
  logsCount: number;
  onOpenAudit: () => void;
  onResetOrder: () => void;
  isAdminView?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ logsCount, onOpenAudit, onResetOrder, isAdminView }) => {
  const isCurrentlyAdmin = isAdminView || new URLSearchParams(window.location.search).get('view') === 'admin';

  return (
    <header style={{
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(9, 7, 16, 0.88)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: '0.75rem 1.5rem',
    }}>
      <div style={{
        maxWidth: '1060px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand Logo */}
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem' }} onClick={onResetOrder}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #F43F5E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            color: '#FFFFFF',
            fontSize: '1.05rem',
            boxShadow: '0 3px 12px rgba(139, 92, 246, 0.4)',
          }}>
            S
          </div>
          <div>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>
              Seat<span style={{ color: 'var(--accent-coral)' }}>Rush</span>
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          
          {/* Navigation Button */}
          <button
            onClick={() => {
              if (isCurrentlyAdmin) {
                window.open('/', '_blank');
              } else {
                window.open('/?view=admin', '_blank');
              }
            }}
            className="btn-secondary"
            style={{
              fontSize: '0.82rem',
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(139, 92, 246, 0.15)',
              borderColor: 'var(--accent-violet)',
              color: '#DDD6FE',
            }}
          >
            {isCurrentlyAdmin ? 'Go to Storefront' : 'Merchant Admin Dashboard'}
          </button>

          {/* API Inspector Drawer Toggle */}
          <button
            onClick={onOpenAudit}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-pill)' }}
          >
            <span>API Inspector</span>
            {logsCount > 0 && (
              <span style={{
                background: 'var(--accent-violet)',
                color: '#FFFFFF',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.05rem 0.45rem',
                borderRadius: '999px',
                marginLeft: '0.3rem',
              }}>
                {logsCount}
              </span>
            )}
          </button>

        </div>
      </div>
    </header>
  );
};

import React from 'react';

interface HeaderProps {
  logsCount: number;
  onOpenAudit: () => void;
  onResetOrder: () => void;
  isAdminView?: boolean;
  activeView?: 'home' | 'events' | 'event_detail' | 'cart' | 'admin';
  onNavigateView?: (view: 'home' | 'events' | 'cart' | 'admin') => void;
  cartCount?: number;
  userCity?: string;
}

export const Header: React.FC<HeaderProps> = ({
  logsCount,
  onOpenAudit,
  onResetOrder,
  isAdminView,
  activeView = 'home',
  onNavigateView,
  cartCount = 0,
  userCity,
}) => {
  const isCurrentlyAdmin = isAdminView || activeView === 'admin' || new URLSearchParams(window.location.search).get('view') === 'admin';

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
        {/* Brand Logo & Left Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
            onClick={() => onNavigateView ? onNavigateView('home') : onResetOrder()}
          >
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

          {/* Left Storefront Navigation Links (Home, Browse Events) */}
          {onNavigateView && !isCurrentlyAdmin && (
            <nav style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button
                onClick={() => onNavigateView('home')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-pill)',
                  color: activeView === 'home' ? 'var(--accent-violet)' : 'var(--text-secondary)',
                  fontWeight: activeView === 'home' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Home
              </button>

              <button
                onClick={() => onNavigateView('events')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-pill)',
                  color: activeView === 'events' || activeView === 'event_detail' ? 'var(--accent-violet)' : 'var(--text-secondary)',
                  fontWeight: activeView === 'events' || activeView === 'event_detail' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Browse Events
              </button>
            </nav>
          )}
        </div>

        {/* Header Right Actions Order: Admin ↗ ➔ APIs ➔ Minimal Purple Cart */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          
          {/* 1. Admin ↗ Button (Grey) */}
          <button
            onClick={() => {
              if (onNavigateView) {
                if (isCurrentlyAdmin) {
                  onNavigateView('home');
                } else {
                  onNavigateView('admin');
                }
              } else {
                if (isCurrentlyAdmin) {
                  window.open('/', '_blank');
                } else {
                  window.open('/?view=admin', '_blank');
                }
              }
            }}
            className="btn-secondary"
            style={{
              fontSize: '0.82rem',
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(255, 255, 255, 0.06)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
            }}
          >
            {isCurrentlyAdmin ? 'Storefront ↗' : 'Admin ↗'}
          </button>

          {/* 2. APIs Button (Grey) */}
          <button
            onClick={onOpenAudit}
            className="btn-secondary"
            style={{
              fontSize: '0.82rem',
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(255, 255, 255, 0.06)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
            }}
          >
            <span>APIs</span>
            {logsCount > 0 && (
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.05rem 0.45rem',
                borderRadius: '999px',
                marginLeft: '0.35rem',
              }}>
                {logsCount}
              </span>
            )}
          </button>

          {/* Location Badge (Purple matching Cart) */}
          {userCity && (
            <span
              style={{
                fontSize: '0.78rem',
                padding: '0.38rem 0.8rem',
                borderRadius: 'var(--radius-pill)',
                background: 'rgba(139, 92, 246, 0.18)',
                color: 'var(--accent-violet)',
                border: '1px solid var(--accent-violet)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-violet)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="1.8" fill="var(--accent-violet)" stroke="none" />
                <line x1="12" y1="0" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="24" />
                <line x1="0" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="24" y2="12" />
              </svg>
              {userCity}
            </span>
          )}

          {/* 3. Cart Button (Purple) */}
          {onNavigateView && !isCurrentlyAdmin && (
            <button
              onClick={() => onNavigateView('cart')}
              className="btn-secondary"
              style={{
                position: 'relative',
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-pill)',
                borderColor: 'var(--accent-violet)',
                background: 'rgba(139, 92, 246, 0.18)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-violet)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1.5" />
                <circle cx="20" cy="21" r="1.5" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>

              {cartCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--accent-violet)',
                  color: '#FFF',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(139, 92, 246, 0.5)',
                }}>
                  {cartCount}
                </span>
              )}
            </button>
          )}

        </div>
      </div>
    </header>
  );
};

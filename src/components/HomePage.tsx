import React, { useState, useEffect, useMemo } from 'react';
import type { EventData } from '../types';
import { MOCK_EVENTS } from '../data/mockEvents';
import { calculateHaversineDistanceMiles } from '../utils/distance';

interface HomePageProps {
  onSelectEvent: (event: EventData) => void;
  onNavigateEvents: (category?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectEvent, onNavigateEvents }) => {
  const featuredEvents = MOCK_EVENTS.filter((e) => e.isFeatured);
  const [heroIndex, setHeroIndex] = useState(0);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Hero carousel auto-rotate
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredEvents.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [featuredEvents.length]);

  useEffect(() => {
    const fetchIpLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setUserCoords({ lat: data.latitude, lng: data.longitude });
          return;
        }
      } catch {
        // Fallback
      }
      setUserCoords({ lat: 27.9478, lng: -82.4584 });
    };

    const detectLocation = async () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => fetchIpLocation(),
          { timeout: 4000 }
        );
      } else {
        fetchIpLocation();
      }
    };

    detectLocation();
  }, []);

  // Compute Haversine distances and sort nearby events
  const nearbyEvents = useMemo(() => {
    const defaultCoords = userCoords || { lat: 34.0522, lng: -118.2437 };

    const eventsWithDistance = MOCK_EVENTS.map((evt) => {
      const distanceMiles = calculateHaversineDistanceMiles(
        defaultCoords.lat,
        defaultCoords.lng,
        evt.lat,
        evt.lng
      );
      return { ...evt, distanceMiles };
    });

    // Sort by distance (closest first)
    eventsWithDistance.sort((a, b) => a.distanceMiles - b.distanceMiles);

    // Filter events within 500 miles
    const within500 = eventsWithDistance.filter((e) => e.distanceMiles <= 500);

    // If more than 2 events exist within 500 miles, only show events within 500 miles
    if (within500.length > 2) {
      return within500;
    }

    return eventsWithDistance.slice(0, 10);
  }, [userCoords]);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Hero Carousel Banner with Smooth Horizontal Translation Effect */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          height: '350px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: '2.5rem',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Horizontal Sliding Track */}
        <div
          style={{
            display: 'flex',
            width: `${featuredEvents.length * 100}%`,
            height: '100%',
            transform: `translateX(-${heroIndex * (100 / featuredEvents.length)}%)`,
            transition: 'transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {featuredEvents.map((evt) => (
            <div
              key={evt.id}
              style={{
                width: `${100 / featuredEvents.length}%`,
                height: '100%',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <img
                src={evt.imageUrl}
                alt={evt.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'brightness(0.55)',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(9, 7, 16, 0.95) 0%, rgba(9, 7, 16, 0.4) 60%, transparent 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '1.75rem 3.5rem 1.75rem 4.5rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '999px',
                      background: 'var(--gradient-violet)',
                      color: '#FFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    FEATURED EVENT
                  </span>
                  {evt.isRushDeal && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.55rem',
                        borderRadius: '999px',
                        background: 'rgba(244, 63, 94, 0.25)',
                        color: '#FDA4AF',
                        border: '1px solid rgba(244, 63, 94, 0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      SEATRUSH DEAL
                    </span>
                  )}
                </div>

                <h1
                  style={{
                    fontSize: '1.65rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    marginBottom: '0.4rem',
                    lineHeight: 1.2,
                  }}
                >
                  {evt.title}
                </h1>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.1rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.82rem',
                    marginBottom: '1rem',
                  }}
                >
                  <span>{evt.date} • {evt.time}</span>
                  <span>{evt.venue}, {evt.city}</span>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                    From ${(evt.startingPriceCents / 100).toFixed(2)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    onClick={() => onSelectEvent(evt)}
                    className="btn-primary"
                    style={{ padding: '0.55rem 1.35rem', fontSize: '0.82rem' }}
                  >
                    Book Now ➔
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Left Arrow Button */}
        <button
          onClick={() => setHeroIndex((prev) => (prev === 0 ? featuredEvents.length - 1 : prev - 1))}
          style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(9, 7, 16, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFF',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-violet)';
            e.currentTarget.style.borderColor = 'var(--accent-violet)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(9, 7, 16, 0.65)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          ❮
        </button>

        {/* Right Arrow Button */}
        <button
          onClick={() => setHeroIndex((prev) => (prev + 1) % featuredEvents.length)}
          style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(9, 7, 16, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFF',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-violet)';
            e.currentTarget.style.borderColor = 'var(--accent-violet)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(9, 7, 16, 0.65)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          ❯
        </button>

        {/* Bottom Carousel Dot Indicators */}
        <div style={{ position: 'absolute', bottom: '1.25rem', right: '2rem', display: 'flex', gap: '0.4rem', zIndex: 10 }}>
          {featuredEvents.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setHeroIndex(idx)}
              style={{
                width: idx === heroIndex ? '26px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: idx === heroIndex ? 'var(--accent-violet)' : 'rgba(255,255,255,0.4)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Geolocation Based Recommendations */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', margin: 0 }}>
              🔥 Hot Events Near You
            </h3>
          </div>

          <button
            onClick={() => onNavigateEvents()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-violet)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            Browse All Events ➔
          </button>
        </div>

        {/* Horizontal Scrolling Track */}
        <div
          style={{
            display: 'flex',
            gap: '1.25rem',
            overflowX: 'auto',
            paddingTop: '0.6rem',
            paddingBottom: '1rem',
            paddingLeft: '0.25rem',
            paddingRight: '0.25rem',
            marginTop: '-0.6rem',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'thin',
          }}
        >
          {nearbyEvents.map((evt) => (
            <div
              key={evt.id}
              className="glass-panel"
              onClick={() => onSelectEvent(evt)}
              style={{
                minWidth: '280px',
                maxWidth: '280px',
                flexShrink: 0,
                scrollSnapAlign: 'start',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--accent-violet)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              <div style={{ position: 'relative', height: '140px' }}>
                <img src={evt.imageUrl} alt={evt.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    background: 'rgba(9, 7, 16, 0.75)',
                    color: 'var(--accent-cyan)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  {evt.distanceMiles} mi away
                </span>
              </div>

              <div style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  {evt.category}
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.2 }}>
                  {evt.title}
                </h4>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {evt.city} • {evt.date}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    From ${(evt.startingPriceCents / 100).toFixed(2)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-violet)', fontWeight: 600 }}>
                    Select Seats ➔
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

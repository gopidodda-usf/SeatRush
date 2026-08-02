import React, { useState, useMemo } from 'react';
import type { EventData } from '../types';
import { MOCK_EVENTS } from '../data/mockEvents';

interface EventsPageProps {
  onSelectEvent: (event: EventData) => void;
  initialCategory?: string;
}

export const EventsPage: React.FC<EventsPageProps> = ({ onSelectEvent, initialCategory = 'all' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<'popularity' | 'price_asc' | 'price_desc' | 'date_asc' | 'date_desc'>('popularity');

  const filteredEvents = useMemo(() => {
    return MOCK_EVENTS.filter((evt) => {
      const matchesCategory = categoryFilter === 'all' || evt.category === categoryFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        evt.title.toLowerCase().includes(q) ||
        evt.artist.toLowerCase().includes(q) ||
        evt.venue.toLowerCase().includes(q) ||
        evt.city.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') {
        return a.startingPriceCents - b.startingPriceCents;
      }
      if (sortBy === 'price_desc') {
        return b.startingPriceCents - a.startingPriceCents;
      }
      if (sortBy === 'date_asc') {
        const parseDate = (dStr: string) => {
          const cleaned = dStr.includes(',') ? dStr.split(',').slice(1).join(',').trim() : dStr;
          const timestamp = Date.parse(cleaned);
          return isNaN(timestamp) ? 0 : timestamp;
        };
        return parseDate(a.date) - parseDate(b.date);
      }
      if (sortBy === 'date_desc') {
        const parseDate = (dStr: string) => {
          const cleaned = dStr.includes(',') ? dStr.split(',').slice(1).join(',').trim() : dStr;
          const timestamp = Date.parse(cleaned);
          return isNaN(timestamp) ? 0 : timestamp;
        };
        return parseDate(b.date) - parseDate(a.date);
      }
      // popularity
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }, [searchQuery, categoryFilter, sortBy]);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
          Explore All Events
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Browse official tickets for concerts, sports finals, Broadway musicals, and comedy tours.
        </p>
      </div>

      {/* Control Bar: Search, Category Filters, and Sorting */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Top Row: Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: 'var(--text-muted)' }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by Artist, Team, Venue, or City (e.g. Coldplay, SoFi Stadium, Los Angeles)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.6rem',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Bottom Row: Category Filters & Sort By */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Categories' },
              { id: 'concert', label: 'Concerts' },
              { id: 'sports', label: 'Sports' },
              { id: 'theater', label: 'Theater' },
              { id: 'comedy', label: 'Comedy' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: categoryFilter === cat.id ? 'var(--accent-violet)' : 'rgba(255,255,255,0.1)',
                  background: categoryFilter === cat.id ? 'rgba(139, 92, 246, 0.25)' : 'rgba(0,0,0,0.3)',
                  color: categoryFilter === cat.id ? '#FFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '0.45rem 0.85rem',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="popularity">Popularity / Featured</option>
              <option value="date_asc">Date (Earliest First)</option>
              <option value="date_desc">Date (Latest First)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Results Count Header */}
      <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredEvents.length}</strong> events
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>No events found</h3>
          <p style={{ fontSize: '0.82rem' }}>Try clearing your search query or category filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="glass-panel"
              onClick={() => onSelectEvent(evt)}
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
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
              <div style={{ position: 'relative', height: '175px' }}>
                <img src={evt.imageUrl} alt={evt.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span
                  style={{
                    position: 'absolute',
                    top: '0.65rem',
                    left: '0.65rem',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    background: 'rgba(0,0,0,0.75)',
                    color: 'var(--accent-cyan)',
                    backdropFilter: 'blur(4px)',
                    textTransform: 'uppercase',
                  }}
                >
                  {evt.category}
                </span>

                {evt.isRushDeal && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '0.65rem',
                      right: '0.65rem',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(244, 63, 94, 0.9)',
                      color: '#FFF',
                    }}
                  >
                    SEATRUSH DEAL
                  </span>
                )}
              </div>

              <div style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.25 }}>
                  {evt.title}
                </h3>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  {evt.date} • {evt.time}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.1rem' }}>
                  {evt.venue}, {evt.city}, {evt.state}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.85rem' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Tickets From</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-heading)' }}>
                      ${(evt.startingPriceCents / 100).toFixed(2)}
                    </span>
                  </div>
                  <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}>
                    Select Seats ➔
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import type { ApiAuditLog } from '../types';

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ApiAuditLog[];
  onClearLogs: () => void;
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({ isOpen, onClose, logs, onClearLogs }) => {
  const [expandedId, setExpandedId] = useState<string | null>(logs[0]?.id || null);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '560px',
      maxWidth: '90vw',
      background: 'rgba(11, 15, 25, 0.96)',
      backdropFilter: 'blur(25px)',
      borderLeft: '1px solid var(--border-subtle)',
      boxShadow: '-20px 0 50px rgba(0,0,0,0.8)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(22, 30, 49, 0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <strong style={{ fontSize: '1.05rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-heading)' }}>
            Hyperswitch API Inspector
          </strong>
          <span className="badge badge-info">{logs.length} Requests</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button onClick={onClearLogs} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Clear</button>
          <button onClick={onClose} className="btn-secondary" title="Close Inspector" style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '0.9rem', borderRadius: '50%' }}>✕</button>
        </div>
      </div>

      {/* Logs List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', marginTop: '3rem' }}>
            No API requests logged yet. Complete checkout actions to inspect live HTTP payloads.
          </p>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const isSuccess = log.responseStatus >= 200 && log.responseStatus < 300;

            return (
              <div key={log.id} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '0.85rem',
                overflow: 'hidden',
              }}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: isExpanded ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontWeight: 800, color: log.method === 'POST' ? 'var(--accent-cyan)' : '#C084FC' }}>
                      {log.method}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.endpoint}</span>
                  </div>
                  <div>
                    <span style={{ color: isSuccess ? '#34D399' : '#FDA4AF', fontWeight: 700 }}>{log.responseStatus}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.6rem' }}>{log.durationMs}ms</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '1rem', background: '#070A12', borderTop: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                    {log.requestPayload && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '0.4rem' }}>▶ Request Payload</div>
                        <pre style={{
                          color: '#A5F3FC',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.75rem',
                          maxHeight: '280px',
                          overflowY: 'auto',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          margin: 0,
                        }}>
                          {JSON.stringify(log.requestPayload, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <div style={{ color: isSuccess ? '#34D399' : '#FDA4AF', fontWeight: 700, marginBottom: '0.4rem' }}>◀ Response Payload</div>
                      <pre style={{
                        color: '#CBD5E1',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.75rem',
                        maxHeight: '350px',
                        overflowY: 'auto',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                      }}>
                        {JSON.stringify(log.responsePayload, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

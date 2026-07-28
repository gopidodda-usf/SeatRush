import React from 'react';
import type { CheckoutStep } from '../types';

interface StepProgressProps {
  currentStep: CheckoutStep;
  onStepClick: (step: CheckoutStep) => void;
}

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep, onStepClick }) => {
  const steps = [
    { number: 1, label: 'Cart' },
    { number: 2, label: 'Payment' },
    { number: 3, label: 'Confirmation' },
  ];

  return (
    <div style={{ maxWidth: '680px', margin: '1rem auto 1.5rem', padding: '0 1rem', width: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}>
        {steps.map((s, idx) => {
          const isActive = currentStep === s.number;
          const isCompleted = currentStep > s.number;
          const isAccessible = s.number <= currentStep;
          const hasSegment = idx < steps.length - 1;
          const isSegmentCompleted = currentStep > s.number;

          return (
            <React.Fragment key={s.number}>
              {/* Step Pill Button */}
              <button
                disabled={!isAccessible}
                onClick={() => isAccessible && onStepClick(s.number as CheckoutStep)}
                style={{
                  padding: '0.35rem 0.95rem',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 800 : 600,
                  borderRadius: 'var(--radius-pill)',
                  background: isActive
                    ? 'linear-gradient(135deg, #8B5CF6 0%, #F43F5E 100%)'
                    : isCompleted
                    ? '#1E1638'
                    : 'rgba(9, 7, 16, 0.6)',
                  border: isActive
                    ? '1.5px solid rgba(255, 255, 255, 0.8)'
                    : isCompleted
                    ? '1px solid rgba(139, 92, 246, 0.5)'
                    : '1px solid var(--border-subtle)',
                  color: isActive ? '#FFFFFF' : isCompleted ? 'var(--accent-violet)' : 'var(--text-muted)',
                  cursor: isAccessible ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive
                    ? '0 0 14px rgba(139, 92, 246, 0.6), 0 2px 10px rgba(0, 0, 0, 0.5)'
                    : '0 2px 6px rgba(0,0,0,0.4)',
                  transform: isActive ? 'scale(1.03)' : 'scale(1)',
                  minWidth: '90px',
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                {s.label}
              </button>

              {/* Connecting Line Segment (STRICTLY in between adjacent pills - stops at outside boundary!) */}
              {hasSegment && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  margin: '0 0.5rem',
                  background: isSegmentCompleted
                    ? 'linear-gradient(90deg, #8B5CF6, #A855F7)'
                    : 'rgba(255, 255, 255, 0.12)',
                  boxShadow: isSegmentCompleted
                    ? '0 0 8px rgba(139, 92, 246, 0.6)'
                    : 'none',
                  borderRadius: '999px',
                  transition: 'all 0.3s ease',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

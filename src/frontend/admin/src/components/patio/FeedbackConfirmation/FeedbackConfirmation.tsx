// FeedbackConfirmation Component - Toast notification with undo option

import React, { useEffect, useState } from 'react';
import './FeedbackConfirmation.css';

export interface FeedbackConfirmationProps {
  show: boolean;
  onClose: () => void;
  onUndo?: () => void;
  undoTimeoutMs?: number;
}

export const FeedbackConfirmation: React.FC<FeedbackConfirmationProps> = ({
  show,
  onClose,
  onUndo,
  undoTimeoutMs = 5000,
}) => {
  const [undoAvailable, setUndoAvailable] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.floor(undoTimeoutMs / 1000));

  useEffect(() => {
    if (!show) {
      setUndoAvailable(true);
      setSecondsRemaining(Math.floor(undoTimeoutMs / 1000));
      return;
    }

    // Countdown timer for undo button
    const countdownInterval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setUndoAvailable(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-close after timeout
    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, undoTimeoutMs);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(autoCloseTimer);
    };
  }, [show, onClose, undoTimeoutMs]);

  const handleUndo = () => {
    if (onUndo && undoAvailable) {
      onUndo();
      onClose();
    }
  };

  if (!show) {
    return null;
  }

  return (
    <div
      className="feedback-confirmation-overlay"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="feedback-confirmation-toast">
        <div className="feedback-confirmation-content">
          <div className="feedback-confirmation-icon" aria-hidden="true">
            ✓
          </div>
          <div className="feedback-confirmation-text">
            <h4 className="feedback-confirmation-title">Thank you!</h4>
            <p className="feedback-confirmation-message">
              Your feedback helps improve sun predictions for everyone.
            </p>
          </div>
        </div>

        <div className="feedback-confirmation-actions">
          {undoAvailable && onUndo && (
            <button
              type="button"
              className="feedback-confirmation-undo"
              onClick={handleUndo}
              aria-label={`Undo feedback (${secondsRemaining}s remaining)`}
            >
              Undo ({secondsRemaining}s)
            </button>
          )}
          <button
            type="button"
            className="feedback-confirmation-close"
            onClick={onClose}
            aria-label="Close confirmation"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

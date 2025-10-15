// FeedbackButton Component

import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../../services/analyticsService';
import './FeedbackButton.css';

export interface FeedbackButtonProps {
  venueId: number;
  patioId: number;
  predictedSunExposure: number;
  predictedConfidence: number;
  onSubmit?: (wasActuallySunny: boolean) => void;
  showPrompt?: boolean;
  isSubmitting?: boolean;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  venueId,
  patioId,
  onSubmit,
  showPrompt = true,
  isSubmitting = false,
}) => {
  const [selectedValue, setSelectedValue] = useState<boolean | null>(null);

  // Track when prompt is shown to user
  useEffect(() => {
    if (showPrompt) {
      analyticsService.trackPromptShown(venueId, patioId);
    }
  }, [showPrompt, venueId, patioId]);

  const handleSelection = (value: boolean) => {
    setSelectedValue(value);
    if (onSubmit) {
      onSubmit(value);
    }
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="feedback-button-container" role="region" aria-label="Feedback prompt">
      <div className="feedback-prompt">
        <h3 className="feedback-prompt-title">Was it sunny?</h3>
        <p className="feedback-privacy-note">
          Your feedback is anonymous and helps improve sun predictions for everyone.
          We don't collect any personal information.
        </p>
      </div>

      <div className="feedback-buttons" role="group" aria-label="Feedback options">
        <button
          type="button"
          className={`feedback-button feedback-button-yes ${
            selectedValue === true ? 'feedback-button-active' : ''
          }`}
          onClick={() => handleSelection(true)}
          disabled={isSubmitting}
          aria-label="Yes, it was sunny"
        >
          <span className="feedback-icon" aria-hidden="true">
            ☀️
          </span>
          <span className="feedback-label">Yes</span>
        </button>

        <button
          type="button"
          className={`feedback-button feedback-button-no ${
            selectedValue === false ? 'feedback-button-active' : ''
          }`}
          onClick={() => handleSelection(false)}
          disabled={isSubmitting}
          aria-label="No, it was not sunny"
        >
          <span className="feedback-icon" aria-hidden="true">
            ☁️
          </span>
          <span className="feedback-label">No</span>
        </button>
      </div>

      {isSubmitting && (
        <div className="feedback-loading" role="status" aria-live="polite">
          Submitting feedback...
        </div>
      )}
    </div>
  );
};

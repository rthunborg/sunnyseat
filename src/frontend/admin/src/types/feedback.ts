// Feedback Type Definitions

export interface FeedbackSubmission {
  venueId: number;
  patioId: number;
  timestamp: Date;
  predictedSunExposure: number;
  predictedConfidence: number;
  actualSunny: boolean;
}

export interface FeedbackResponse {
  id: number;
  success: boolean;
  message: string;
}

export interface StoredFeedback {
  venueId: number;
  patioId: number;
  submittedAt: Date;
  expiresAt: Date; // 24 hours after submission
}

export interface FeedbackHistory {
  submissions: StoredFeedback[];
  lastCleanup: Date;
}

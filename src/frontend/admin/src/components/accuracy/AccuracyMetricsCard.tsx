import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import type { AccuracyMetrics } from '../../services/accuracyMetricsHub';

interface AccuracyMetricsCardProps {
  metrics: AccuracyMetrics | null;
  isAlertActive: boolean;
}

export const AccuracyMetricsCard = ({
  metrics,
  isAlertActive,
}: AccuracyMetricsCardProps) => {
  if (!metrics) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Overall Accuracy</h3>
        <p className="text-gray-500">Loading metrics...</p>
      </div>
    );
  }

  const getAccuracyColor = (rate: number) => {
    if (rate >= 85) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyBgColor = (rate: number) => {
    if (rate >= 85) return 'bg-green-50';
    if (rate >= 80) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Overall Accuracy (14-day)</h3>
        {isAlertActive ? (
          <XCircleIcon className="h-6 w-6 text-red-500" title="Alert Active" />
        ) : (
          <CheckCircleIcon className="h-6 w-6 text-green-500" title="On Track" />
        )}
      </div>

      <div
        className={`${getAccuracyBgColor(
          metrics.accuracyRate
        )} rounded-lg p-4 mb-4`}
      >
        <div className="text-center">
          <div className={`text-5xl font-bold ${getAccuracyColor(metrics.accuracyRate)}`}>
            {metrics.accuracyRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Target: ≥85% (Threshold: 80%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Total Feedback</div>
          <div className="text-2xl font-semibold">{metrics.totalFeedback}</div>
        </div>
        <div>
          <div className="text-gray-500">Correct Predictions</div>
          <div className="text-2xl font-semibold text-green-600">
            {metrics.correctPredictions}
          </div>
        </div>
      </div>

      {isAlertActive && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            ⚠️ Alert: Accuracy has been below 80% for 3+ consecutive days
          </p>
        </div>
      )}
    </div>
  );
};

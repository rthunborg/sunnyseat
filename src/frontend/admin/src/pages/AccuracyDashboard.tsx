import { useEffect, useState } from 'react';
import { AccuracyMetricsCard } from '../components/accuracy/AccuracyMetricsCard';
import { AccuracyChart } from '../components/accuracy/AccuracyChart';
import { ProblematicVenuesList } from '../components/accuracy/ProblematicVenuesList';
import { accuracyApi, type AccuracyTrendDataPoint } from '../services/accuracyApi';
import {
  accuracyMetricsHub,
  type AccuracyMetrics,
  type ProblematicVenue,
} from '../services/accuracyMetricsHub';

export const AccuracyDashboard = () => {
  const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);
  const [trendData, setTrendData] = useState<AccuracyTrendDataPoint[]>([]);
  const [problematicVenues, setProblematicVenues] = useState<ProblematicVenue[]>([]);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Calculate 14-day date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 14);

        // Fetch all data in parallel
        const [metricsData, trendData, venuesData, alertStatus] = await Promise.all([
          accuracyApi.getAccuracyMetrics(
            startDate.toISOString(),
            endDate.toISOString()
          ),
          accuracyApi.getAccuracyTrend(startDate.toISOString(), endDate.toISOString()),
          accuracyApi.getProblematicVenues(),
          accuracyApi.getAlertStatus(),
        ]);

        setMetrics(metricsData);
        setTrendData(trendData);
        setProblematicVenues(venuesData);
        setIsAlertActive(alertStatus);
      } catch (err) {
        console.error('Error fetching accuracy data:', err);
        setError('Failed to load accuracy data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Setup SignalR real-time updates
  useEffect(() => {
    const setupSignalR = async () => {
      try {
        await accuracyMetricsHub.start();

        // Subscribe to real-time updates
        accuracyMetricsHub.onAccuracyMetricsUpdated((updatedMetrics) => {
          console.log('Received accuracy metrics update:', updatedMetrics);
          setMetrics(updatedMetrics);
        });

        accuracyMetricsHub.onProblematicVenuesUpdated((updatedVenues) => {
          console.log('Received problematic venues update:', updatedVenues);
          setProblematicVenues(updatedVenues);
        });

        accuracyMetricsHub.onAlertStatusUpdated((alertStatus) => {
          console.log('Received alert status update:', alertStatus);
          setIsAlertActive(alertStatus);
        });
      } catch (err) {
        console.error('Failed to connect to SignalR hub:', err);
        // Continue without real-time updates
      }
    };

    setupSignalR();

    // Cleanup on unmount
    return () => {
      accuracyMetricsHub.stop();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Accuracy Tracking Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Accuracy Tracking Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Accuracy Tracking Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Monitor prediction accuracy and identify areas for improvement
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <AccuracyMetricsCard metrics={metrics} isAlertActive={isAlertActive} />
        </div>
        <div className="lg:col-span-2">
          <AccuracyChart data={trendData} />
        </div>
      </div>

      <div className="mb-6">
        <ProblematicVenuesList venues={problematicVenues} />
      </div>

      <div className="bg-white p-4 rounded-lg shadow text-sm text-gray-500">
        <p>
          <strong>Note:</strong> This dashboard updates automatically every 15 minutes
          via background service. Real-time updates are enabled via SignalR when
          available.
        </p>
      </div>
    </div>
  );
};

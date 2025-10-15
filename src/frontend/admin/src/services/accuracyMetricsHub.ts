import * as signalR from '@microsoft/signalr';

export interface AccuracyMetrics {
  startDate: string;
  endDate: string;
  totalFeedback: number;
  correctPredictions: number;
  accuracyRate: number;
  venueId?: number;
  venueName?: string;
}

export interface ProblematicVenue {
  venueId: number;
  venueName: string;
  accuracyRate: number;
  feedbackCount: number;
  daysBelowThreshold: number;
}

export type AccuracyMetricsCallback = (metrics: AccuracyMetrics) => void;
export type ProblematicVenuesCallback = (venues: ProblematicVenue[]) => void;
export type AlertStatusCallback = (isAlertActive: boolean) => void;

class AccuracyMetricsHubService {
  private connection: signalR.HubConnection | null = null;
  private readonly hubUrl: string;

  constructor() {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    this.hubUrl = `${baseUrl}/hubs/accuracy-metrics`;
  }

  async start(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('Already connected to AccuracyMetrics hub');
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    try {
      await this.connection.start();
      console.log('Connected to AccuracyMetrics SignalR hub');
    } catch (err) {
      console.error('Error connecting to AccuracyMetrics hub:', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      console.log('Disconnected from AccuracyMetrics hub');
    }
  }

  onAccuracyMetricsUpdated(callback: AccuracyMetricsCallback): void {
    if (!this.connection) {
      console.warn('Connection not established. Call start() first.');
      return;
    }

    this.connection.on('AccuracyMetricsUpdated', callback);
  }

  onProblematicVenuesUpdated(callback: ProblematicVenuesCallback): void {
    if (!this.connection) {
      console.warn('Connection not established. Call start() first.');
      return;
    }

    this.connection.on('ProblematicVenuesUpdated', callback);
  }

  onAlertStatusUpdated(callback: AlertStatusCallback): void {
    if (!this.connection) {
      console.warn('Connection not established. Call start() first.');
      return;
    }

    this.connection.on('AlertStatusUpdated', callback);
  }

  offAccuracyMetricsUpdated(callback: AccuracyMetricsCallback): void {
    this.connection?.off('AccuracyMetricsUpdated', callback);
  }

  offProblematicVenuesUpdated(callback: ProblematicVenuesCallback): void {
    this.connection?.off('ProblematicVenuesUpdated', callback);
  }

  offAlertStatusUpdated(callback: AlertStatusCallback): void {
    this.connection?.off('AlertStatusUpdated', callback);
  }
}

export const accuracyMetricsHub = new AccuracyMetricsHubService();

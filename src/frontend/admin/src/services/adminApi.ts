import { apiService } from './api';
import type { 
  Venue, 
  Patio, 
  VenueSearchParams, 
  PaginatedResponse, 
  ImportResult,
  ImportPreview,
  PatioMetadataForm 
} from '../types';

export class AdminApiService {
  // Venue management
  async getVenues(params?: VenueSearchParams): Promise<PaginatedResponse<Venue>> {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.append('query', params.query);
    if (params?.isMapped !== undefined) queryParams.append('isMapped', params.isMapped.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/api/admin/venues${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<PaginatedResponse<Venue>>(url);
  }

  async getUnmappedVenues(): Promise<Venue[]> {
    return apiService.get<Venue[]>('/api/admin/venues/unmapped');
  }

  async getVenue(id: number): Promise<Venue> {
    return apiService.get<Venue>(`/api/admin/venues/${id}`);
  }

  // Patio management
  async createPatio(venueId: number, polygon: GeoJSON.Polygon, metadata: PatioMetadataForm): Promise<Patio> {
    return apiService.post<Patio>(`/api/admin/venues/${venueId}/patios`, {
      polygon,
      ...metadata,
    });
  }

  async getPatio(id: number): Promise<Patio> {
    return apiService.get<Patio>(`/api/admin/patios/${id}`);
  }

  async updatePatio(id: number, updates: Partial<Patio>): Promise<Patio> {
    return apiService.put<Patio>(`/api/admin/patios/${id}`, updates);
  }

  async deletePatio(id: number): Promise<void> {
    return apiService.delete<void>(`/api/admin/patios/${id}`);
  }

  async updatePatioMetadata(id: number, metadata: PatioMetadataForm): Promise<Patio> {
    return apiService.put<Patio>(`/api/admin/patios/${id}/metadata`, metadata);
  }

  async updatePatioPolygon(id: number, polygon: GeoJSON.Polygon): Promise<Patio> {
    return apiService.put<Patio>(`/api/admin/patios/${id}/polygon`, { polygon });
  }

  // Import/Export
  async importGeoJSON(file: File, onProgress?: (progress: number) => void): Promise<ImportResult> {
    return apiService.uploadFile<ImportResult>('/api/admin/import/geojson', file, onProgress);
  }

  async importGeoPackage(file: File, onProgress?: (progress: number) => void): Promise<ImportResult> {
    return apiService.uploadFile<ImportResult>('/api/admin/import/gpkg', file, onProgress);
  }

  async previewImport(file: File): Promise<ImportPreview> {
    return apiService.uploadFile<ImportPreview>('/api/admin/import/preview', file);
  }

  async exportPatiosAsGeoJSON(venueIds?: number[]): Promise<Blob> {
    const params = venueIds ? { venueIds: venueIds.join(',') } : {};
    const response = await fetch(`${apiService['baseURL']}/api/admin/export/geojson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // Batch operations
  async batchCreatePatios(patios: Array<{ venueId: number; polygon: GeoJSON.Polygon; metadata: PatioMetadataForm }>): Promise<ImportResult> {
    return apiService.post<ImportResult>('/api/admin/patios/batch', { patios });
  }

  async batchUpdatePatios(updates: Array<{ id: number; updates: Partial<Patio> }>): Promise<ImportResult> {
    return apiService.put<ImportResult>('/api/admin/patios/batch', { updates });
  }

  async batchDeletePatios(ids: number[]): Promise<void> {
    return apiService.post<void>('/api/admin/patios/batch/delete', { ids });
  }

  // Quality control
  async getPatiosNeedingReview(): Promise<Patio[]> {
    return apiService.get<Patio[]>('/api/admin/patios/review');
  }

  async markPatioReviewed(id: number, approved: boolean, notes?: string): Promise<Patio> {
    return apiService.post<Patio>(`/api/admin/patios/${id}/review`, {
      approved,
      notes,
    });
  }

  // Statistics
  async getAdminStats(): Promise<{
    totalVenues: number;
    mappedVenues: number;
    totalPatios: number;
    patiosNeedingReview: number;
    averageQuality: number;
  }> {
    return apiService.get('/api/admin/stats');
  }
}

export const adminApi = new AdminApiService();
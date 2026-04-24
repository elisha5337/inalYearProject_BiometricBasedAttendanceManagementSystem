import { apiRequest } from './api';

export interface PublicLandingData {
  systemCapacity: Array<{ label: string; value: string; description: string; }>;
  stats: Array<{ label: string; value: string; }>;
  terminals: Array<{ name: string; status: string; traffic: string; lastSync: string; location: string; }>;
}

export async function fetchPublicLandingData() {
  try {
    const response = await apiRequest<{ success: boolean; data: PublicLandingData }>('/api/attendance/public-landing-data/');
    return response.data;
  } catch (err) {
    console.error('Failed to fetch public landing data:', err);
    return null;
  }
}

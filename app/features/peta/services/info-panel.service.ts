import { type GeoJSONFeature, type GeoJSONResponse } from '../types';
import { authService } from '~/services/auth.service';

export const infoPanelService = {
    getJalanById: async (id: string): Promise<GeoJSONFeature | null> => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/jalan/${id}/geojson`, {
                headers: authService.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch geojson: ${response.statusText}`);
            }
            const data: GeoJSONResponse = await response.json();
            return data.result || null;
        } catch (error) {
            console.error(`Error fetching geojson for ${id}:`, error);
            return null;
        }
    },
};

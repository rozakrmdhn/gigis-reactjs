import { type GeoJSONFeature } from '../types';
import { apiClient } from '~/lib/api-client';

export const infoPanelService = {
    getJalanById: async (id: string): Promise<GeoJSONFeature | null> => {
        const response = await apiClient.get<GeoJSONFeature>(`${import.meta.env.VITE_API_BASE_URL}/jalan/${id}/geojson`);
        return response.result || null;
    },
};


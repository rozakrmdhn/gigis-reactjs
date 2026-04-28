import { apiClient } from '~/lib/api-client';

export interface GeoNodeResource {
    id: number;
    pk: number;
    uuid: string;
    title: string;
    name: string;
    alternate: string;
    abstract: string;
    thumbnail_url: string;
    detail_url: string;
    resource_type: string;
    bbox_polygon?: any;
    ll_bbox?: number[];
}

export interface GeoNodeResponse {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: GeoNodeResource[];
    resources?: GeoNodeResource[]; // Alternative field
}

export const geonodeService = {
    /**
     * Fetch datasets from internal proxy (CORS safe)
     */
    getDatasets: async (params?: { page?: number; page_size?: number; search?: string }): Promise<GeoNodeResponse> => {
        // Gunakan proxy internal aplikasi
        const url = new URL(`${window.location.origin}/proxy/geonode-datasets`);
        
        url.searchParams.append('refresh', 'true'); // Paksa refresh untuk memastikan data tampil
        if (params?.search) url.searchParams.append('filter{title.icontains}', params.search);
        
        try {
            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`Failed to fetch datasets: ${response.statusText}`);
            }
            const data = await response.json();
            
            // Normalisasi: Pastikan 'results' selalu terisi jika ada 'resources'
            if (data.resources && !data.results) {
                data.results = data.resources;
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching GeoNode datasets:', error);
            throw error;
        }
    },

    /**
     * Get detail of a specific dataset via proxy
     */
    getDatasetDetail: async (id: string | number): Promise<GeoNodeResource> => {
        // Untuk detail, kita coba cari dari list di proxy atau hit langsung sebagai fallback
        try {
            const data = await geonodeService.getDatasets();
            const list = data.results || data.resources || [];
            const found = list.find(r => r.pk.toString() === id.toString() || r.id.toString() === id.toString());
            if (found) return found;
        } catch (e) {}

        const response = await fetch(`https://saggaserv.my.id/api/v2/resources/${id}/`);
        if (!response.ok) throw new Error(`Failed to fetch dataset detail`);
        return await response.json();
    }
};

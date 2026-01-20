import type { Feature, FeatureCollection, Geometry } from 'geojson';

export interface Jalan {
    id: string;
    kode_ruas: number;
    nama_ruas: string;
    desa: string;
    kecamatan: string;
    panjang: number;
    lebar: number;
    perkerasan: string;
    kondisi: string;
    status_awal: string;
    status_eksisting: string;
    sumber_data: string;
    created_at: string | null;
    updated_at: string | null;
}

export interface JalanResponse {
    status: string;
    message: string;
    result: Jalan[];
}

export type GeoJSONFeature = Feature<Geometry, Jalan>;

export interface GeoJSONResponse {
    status: string;
    message: string;
    result: GeoJSONFeature;
}

export type GeoJSONFeatureCollection = FeatureCollection<Geometry, Jalan>;

export interface GeoJSONFeatureCollectionResponse {
    status: string;
    message: string;
    result: GeoJSONFeatureCollection;
}

export const jalanDesaService = {
    getJalan: async (searchQuery?: string): Promise<Jalan[]> => {
        try {
            const url = searchQuery
                ? `${import.meta.env.VITE_API_BASE_URL}/jalan?nama_ruas=${encodeURIComponent(searchQuery)}`
                : `${import.meta.env.VITE_API_BASE_URL}/jalan`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }
            const data: JalanResponse = await response.json();
            return data.result || [];
        } catch (error) {
            console.error("Error fetching jalan data:", error);
            return [];
        }
    },
    getJalanById: async (id: string): Promise<GeoJSONFeature | null> => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/jalan/${id}/geojson`);
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
    getGeojsonJalan: async (idKecamatan?: string): Promise<GeoJSONFeatureCollection | null> => {
        try {
            const url = idKecamatan
                ? `${import.meta.env.VITE_API_BASE_URL}/jalan/geojson?id_kecamatan=${encodeURIComponent(idKecamatan)}`
                : `${import.meta.env.VITE_API_BASE_URL}/jalan/geojson`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch geojson collection: ${response.statusText}`);
            }
            const data: GeoJSONFeatureCollectionResponse = await response.json();
            return data.result || null;
        } catch (error) {
            console.error("Error fetching geojson collection:", error);
            return null;
        }
    },
};

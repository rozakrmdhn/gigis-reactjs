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

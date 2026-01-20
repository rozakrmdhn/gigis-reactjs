export interface Kecamatan {
    id: number;
    nama_kecamatan: string;
    created_at: string | null;
    updated_at: string | null;
}

export interface KecamatanResponse {
    status: string;
    message: string;
    result: Kecamatan[];
}

export const kecamatanService = {
    getKecamatan: async (): Promise<Kecamatan[]> => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/kecamatan`);
            if (!response.ok) {
                throw new Error(`Failed to fetch kecamatan data: ${response.statusText}`);
            }
            const data: KecamatanResponse = await response.json();
            return data.result || [];
        } catch (error) {
            console.error("Error fetching kecamatan data:", error);
            return [];
        }
    },
};

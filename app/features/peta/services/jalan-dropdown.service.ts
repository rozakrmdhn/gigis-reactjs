import { type Jalan, type JalanResponse } from '../types';

export const jalanDropdownService = {
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
};

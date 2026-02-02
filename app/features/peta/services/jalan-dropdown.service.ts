import { type Jalan } from '../types';
import { apiClient } from '~/lib/api-client';

export const jalanDropdownService = {
    getJalan: async (searchQuery?: string): Promise<Jalan[]> => {
        const url = searchQuery
            ? `${import.meta.env.VITE_API_BASE_URL}/jalan?nama_ruas=${encodeURIComponent(searchQuery)}`
            : `${import.meta.env.VITE_API_BASE_URL}/jalan`;

        const response = await apiClient.get<Jalan[]>(url);
        return response.result || [];
    },
};


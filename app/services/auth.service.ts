export interface User {
    id: string;
    nama: string;
    id_kecamatan: string | null;
    id_desa: string | null;
    role: string;
}

export interface AuthResponse {
    status: string;
    message: string;
    data: {
        user: User;
        accessToken: string;
    };
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Helper to check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

export const authService = {
    signin: async (email: string, password: string): Promise<AuthResponse> => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Authentication failed' }));
            throw new Error(error.message || 'Authentication failed');
        }

        const data: AuthResponse = await response.json();

        // Store token and user data
        if (isBrowser && data.status === 'success' && data.data) {
            localStorage.setItem(TOKEN_KEY, data.data.accessToken);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
        }

        return data;
    },

    signout: () => {
        if (isBrowser) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    },

    getToken: (): string | null => {
        if (!isBrowser) return null;
        return localStorage.getItem(TOKEN_KEY);
    },

    getUser: (): User | null => {
        if (!isBrowser) return null;
        const userStr = localStorage.getItem(USER_KEY);
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    },

    isAuthenticated: (): boolean => {
        return !!authService.getToken();
    },

    // Helper to get authorization headers for API requests
    getAuthHeaders: (): HeadersInit => {
        const token = authService.getToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    },
};

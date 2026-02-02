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
        accessTokenExpiresAt: number;
    };
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

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
            localStorage.setItem(TOKEN_EXPIRY_KEY, data.data.accessTokenExpiresAt.toString());
        }

        return data;
    },

    signout: () => {
        if (isBrowser) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(TOKEN_EXPIRY_KEY);
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
        if (!isBrowser) return false;

        const token = authService.getToken();
        const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);

        if (!token || !expiryStr) return false;

        const expiry = parseInt(expiryStr, 10);
        const now = Date.now();

        // Check if token has expired
        if (now >= expiry) {
            authService.signout();
            // Dispatch event to show session expired alert
            window.dispatchEvent(new CustomEvent("auth-session-expired"));
            return false;
        }

        return true;
    },

    // Helper to get authorization headers for API requests
    getAuthHeaders: (): HeadersInit => {
        const token = authService.getToken();

        // Also check authentication status which includes expiry check
        if (!authService.isAuthenticated()) {
            return {
                'Content-Type': 'application/json',
            };
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    },
};


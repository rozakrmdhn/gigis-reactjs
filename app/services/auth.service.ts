export interface User {
    id: string;
    nama: string;
    email: string;
    id_kecamatan: string | null;
    id_desa: string | null;
    role: string;
}

export interface AuthResponse {
    status: string;
    message: string;
    data: {
        user: User & { rules?: any[] };
        accessToken: string;
        accessTokenExpiresAt: number;
        refreshToken?: string;
        rules?: any[];
    };
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';
const RULES_KEY = 'auth_rules';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

// How many ms before expiry to proactively refresh (5 minutes)
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

// Helper to check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

// Singleton refresh promise — prevents concurrent refresh calls
let refreshPromise: Promise<boolean> | null = null;

export const authService = {
    signin: async (email: string, password: string): Promise<AuthResponse> => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/auth/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // send/receive cookies
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
            if (data.data.refreshToken) {
                localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
            }
            // rules are nested inside user object from backend
            const rules = data.data.rules || data.data.user?.rules;
            if (rules) {
                localStorage.setItem(RULES_KEY, JSON.stringify(rules));
            }
        }

        return data;
    },

    signout: async () => {
        // Tell backend to clear refreshToken cookie and revoke database session
        try {
            const token = authService.getToken();
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/auth/signout`, {
                method: 'POST',
                credentials: 'include',
                headers
            });
        } catch {
            // best-effort — clear local state regardless
        }

        if (isBrowser) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(TOKEN_EXPIRY_KEY);
            localStorage.removeItem(RULES_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
    },

    getToken: (): string | null => {
        if (!isBrowser) return null;
        return localStorage.getItem(TOKEN_KEY);
    },

    getRules: (): any[] => {
        if (!isBrowser) return [];
        const rulesStr = localStorage.getItem(RULES_KEY);
        if (!rulesStr) return [];
        try {
            return JSON.parse(rulesStr);
        } catch {
            return [];
        }
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

    setUser: (updatedData: Partial<User>): User | null => {
        if (!isBrowser) return null;
        const currentUser = authService.getUser();
        if (!currentUser) return null;
        const newUser = { ...currentUser, ...updatedData };
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        return newUser;
    },

    isAuthenticated: (): boolean => {
        if (!isBrowser) return false;
        const token = authService.getToken();
        const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
        if (!token || !expiryStr) return false;

        const expiry = parseInt(expiryStr, 10);
        const now = Date.now();

        return now < expiry;
    },

    /**
     * Returns true if accessToken will expire within the given threshold.
     * Used for proactive refresh before the token actually expires.
     */
    isTokenExpiringSoon: (thresholdMs = REFRESH_THRESHOLD_MS): boolean => {
        if (!isBrowser) return false;
        const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
        if (!expiryStr) return true;
        const expiry = parseInt(expiryStr, 10);
        return Date.now() >= expiry - thresholdMs;
    },

    /**
     * Silently refresh the accessToken using the refreshToken cookie.
     * Returns true if successful, false if the session is fully expired.
     * Uses a singleton promise to prevent concurrent refresh calls.
     */
    refreshAccessToken: (): Promise<boolean> => {
        // Return existing in-flight promise if one is already running
        if (refreshPromise) return refreshPromise;

        refreshPromise = (async () => {
            try {
                const storedRefreshToken = isBrowser ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/auth/refresh`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: storedRefreshToken ? JSON.stringify({ refreshToken: storedRefreshToken }) : undefined,
                });

                if (!response.ok) {
                    // Refresh token is also expired — full logout required
                    return false;
                }

                const data = await response.json();

                if (data.status === 'success' && data.data?.accessToken) {
                    localStorage.setItem(TOKEN_KEY, data.data.accessToken);
                    localStorage.setItem(TOKEN_EXPIRY_KEY, data.data.accessTokenExpiresAt.toString());
                    const rules = data.data.rules || data.data.user?.rules;
                    if (rules) {
                        localStorage.setItem(RULES_KEY, JSON.stringify(rules));
                    }
                    return true;
                }

                return false;
            } catch {
                return false;
            } finally {
                // Clear the singleton so the next call can run
                refreshPromise = null;
            }
        })();

        return refreshPromise;
    },

    checkSession: (): boolean => {
        if (!isBrowser) return false;

        const token = authService.getToken();
        if (!token) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(TOKEN_EXPIRY_KEY);
            window.dispatchEvent(new CustomEvent("auth-session-expired"));
            return false;
        }

        if (!authService.isAuthenticated()) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(TOKEN_EXPIRY_KEY);
            window.dispatchEvent(new CustomEvent("auth-session-expired"));
            return false;
        }

        return true;
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

    getExpiry: (): number | null => {
        if (!isBrowser) return null;
        const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
        return expiryStr ? parseInt(expiryStr, 10) : null;
    },

    getActiveSessions: async (): Promise<any> => {
        const token = authService.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/auth/sessions`, {
            method: 'GET',
            credentials: 'include',
            headers
        });
        if (!response.ok) {
            const bodyText = await response.text().catch(() => '');
            console.error('getActiveSessions error:', response.status, bodyText);
            
            if (response.status === 401 || response.status === 403) {
                // Clear state and force redirect if unauthorized
                if (isBrowser) {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    localStorage.removeItem(TOKEN_EXPIRY_KEY);
                    window.dispatchEvent(new CustomEvent("auth-session-expired"));
                }
                throw new Error("Sesi Anda telah berakhir. Silakan masuk kembali.");
            }
            throw new Error('Gagal mengambil sesi aktif');
        }
        return response.json();
    },

    revokeSession: async (id: string): Promise<any> => {
        const token = authService.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/auth/sessions/${id}/revoke`, {
            method: 'POST',
            credentials: 'include',
            headers
        });
        if (!response.ok) {
            const bodyText = await response.text().catch(() => '');
            console.error('revokeSession error:', response.status, bodyText);
            
            if (response.status === 401 || response.status === 403) {
                if (isBrowser) {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    localStorage.removeItem(TOKEN_EXPIRY_KEY);
                    window.dispatchEvent(new CustomEvent("auth-session-expired"));
                }
                throw new Error("Sesi Anda telah berakhir. Silakan masuk kembali.");
            }
            throw new Error('Gagal mencabut sesi perangkat');
        }
        return response.json();
    },

    logoutAllDevices: async (): Promise<any> => {
        const token = authService.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/auth/logout-all`, {
            method: 'POST',
            credentials: 'include',
            headers
        });
        if (!response.ok) {
            const bodyText = await response.text().catch(() => '');
            console.error('logoutAllDevices error:', response.status, bodyText);
            
            if (response.status === 401 || response.status === 403) {
                if (isBrowser) {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    localStorage.removeItem(TOKEN_EXPIRY_KEY);
                    window.dispatchEvent(new CustomEvent("auth-session-expired"));
                }
                throw new Error("Sesi Anda telah berakhir. Silakan masuk kembali.");
            }
            throw new Error('Gagal melakukan logout masal');
        }
        return response.json();
    },

    register: async (payload: any): Promise<any> => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Registrasi gagal' }));
            throw new Error(error.message || 'Registrasi gagal');
        }

        return response.json();
    },
};

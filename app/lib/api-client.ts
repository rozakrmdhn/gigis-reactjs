import { toast } from "sonner";
import { authService } from "~/services/auth.service";

let lastErrorToastMessage = "";
let lastErrorToastTime = 0;

const showUniqueErrorToast = (message: string) => {
    const now = Date.now();
    if (message === lastErrorToastMessage && now - lastErrorToastTime < 1000) {
        return;
    }
    lastErrorToastMessage = message;
    lastErrorToastTime = now;
    toast.error(message);
};

export interface ApiResponse<T = any> {
    status: string;
    message: string;
    result?: T;
    data?: T;
    pagination?: any;
}

export interface ApiError {
    message: string;
    status?: number;
}

interface FetchOptions extends RequestInit {
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
    successMessage?: string;
    errorMessage?: string;
    /** @internal used to mark a retried request to prevent infinite loops */
    _isRetry?: boolean;
}

/**
 * Dispatch a global logout event and clear local auth state.
 */
const forceLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token_expiry");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_rules");
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-session-expired"));
    }
};

/**
 * API client wrapper with automatic toast notifications and silent token refresh.
 */
export const apiClient = {
    /**
     * Make a fetch request with automatic toast notifications.
     * - Proactive refresh: if the token is within 5 min of expiry, silently refresh before sending.
     * - Reactive refresh: if the server returns 401, attempt one silent refresh and retry.
     */
    async fetch<T = any>(
        url: string,
        options: FetchOptions = {}
    ): Promise<ApiResponse<T>> {
        const {
            showSuccessToast = false,
            showErrorToast = true,
            successMessage,
            errorMessage,
            _isRetry = false,
            ...fetchOptions
        } = options;

        const isGetRequest = !fetchOptions.method || fetchOptions.method === "GET";
        const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

        try {
            // ── Proactive refresh ─────────────────────────────────────────────────
            // Before any request, if the token is about to expire, silently refresh.
            const currentToken = authService.getToken();
            if (!_isRetry && currentToken && authService.isTokenExpiringSoon()) {
                // Try to refresh; ignore failure here — the reactive path below handles it.
                await authService.refreshAccessToken();
            }

            // ── Session check for write operations or admin routes ────────────────
            const isPublicFormRoute = typeof window !== "undefined" && (window.location.pathname.includes("/form-id/") || window.location.pathname.includes("/form-realisasi-infrastruktur/"));
            const shouldCheckAuth = (!isGetRequest || isAdminRoute) && !isPublicFormRoute && !_isRetry;
            if (shouldCheckAuth) {
                // After proactive refresh, re-check session validity
                if (!authService.isAuthenticated()) {
                    // Try one last reactive refresh before giving up
                    const storedRefresh = localStorage.getItem("auth_refresh_token");
                    if (storedRefresh) {
                        const refreshed = await authService.refreshAccessToken();
                        if (!refreshed) {
                            forceLogout();
                            throw new Error("Unauthorized");
                        }
                    } else {
                        forceLogout();
                        throw new Error("Unauthorized");
                    }
                }
            }

            // ── Build headers ─────────────────────────────────────────────────────
            const headers: Record<string, string> = {
                ...(authService.getAuthHeaders() as Record<string, string>),
                ...(fetchOptions.headers as Record<string, string> || {}),
            };

            if (fetchOptions.body instanceof FormData) {
                delete headers["Content-Type"];
            }

            const response = await fetch(url, {
                ...fetchOptions,
                credentials: "include", // always send cookies for refresh token flow
                headers,
            });

            // ── Reactive refresh on 401 ───────────────────────────────────────────
            if (response.status === 401) {
                if (!_isRetry) {
                    // Attempt silent refresh once
                    const refreshed = await authService.refreshAccessToken();
                    if (refreshed) {
                        // Retry the original request with the new token
                        return this.fetch<T>(url, {
                            ...options,
                            _isRetry: true,
                        });
                    }
                }
                
                // If not an admin route, do not force logout or redirect
                if (!isAdminRoute) {
                    throw new Error("Gagal mengambil data");
                }
                
                // Refresh failed — notify user then full logout
                toast.error("Sesi Anda telah berakhir. Silakan masuk kembali.", {
                    id: "session-expired",
                    duration: 4000,
                });
                forceLogout();
                throw new Error("Unauthorized");
            }

            // ── Other auth errors ────────────────────────────────────────────────
            if (response.status === 403) {
                if (!isAdminRoute) {
                    throw new Error("Gagal mengambil data");
                }
                const forbiddenMsg = "Anda tidak memiliki hak akses untuk melakukan aksi ini.";
                toast.warning(forbiddenMsg, {
                    id: "forbidden-access",
                    duration: 5000,
                    description: "Hubungi administrator jika Anda merasa ini keliru.",
                });
                throw new Error(forbiddenMsg);
            }

            const data: ApiResponse<T> = await response.json().catch(() => ({
                status: "error",
                message: response.statusText || "Unknown error",
            }));

            if (!response.ok) {
                const errMsg = errorMessage || data.message || "Terjadi kesalahan";
                throw new Error(errMsg);
            }

            // Show success toast if enabled
            if (showSuccessToast && (successMessage || data.message)) {
                toast.success(successMessage || data.message);
            }

            return data;
        } catch (error) {
            if (error instanceof Error) {
                const alreadyToasted =
                    error.message === "Unauthorized" ||
                    error.message.startsWith("Anda tidak memiliki hak akses");
                if (showErrorToast && !alreadyToasted) {
                    showUniqueErrorToast(errorMessage || error.message);
                }
                throw error;
            }
            throw new Error("Unknown error occurred");
        }
    },

    /**
     * GET request
     */
    async get<T = any>(url: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
        return this.fetch<T>(url, { ...options, method: "GET" });
    },

    /**
     * POST request with success toast by default
     */
    async post<T = any>(url: string, body: any, options: FetchOptions = {}): Promise<ApiResponse<T>> {
        return this.fetch<T>(url, {
            ...options,
            method: "POST",
            body: JSON.stringify(body),
            showSuccessToast: options.showSuccessToast ?? true,
        });
    },

    /**
     * POST FormData request (file upload)
     */
    async postForm<T = any>(url: string, formData: FormData, options: FetchOptions = {}): Promise<ApiResponse<T>> {
        return this.fetch<T>(url, {
            ...options,
            method: "POST",
            body: formData,
            showSuccessToast: options.showSuccessToast ?? true,
        });
    },

    /**
     * PUT request with success toast by default
     */
    async put<T = any>(url: string, body: any, options: FetchOptions = {}): Promise<ApiResponse<T>> {
        return this.fetch<T>(url, {
            ...options,
            method: "PUT",
            body: JSON.stringify(body),
            showSuccessToast: options.showSuccessToast ?? true,
        });
    },

    /**
     * PATCH request with success toast by default
     */
    async patch<T = any>(url: string, body: any, options: FetchOptions = {}): Promise<ApiResponse<T>> {
        return this.fetch<T>(url, {
            ...options,
            method: "PATCH",
            body: JSON.stringify(body),
            showSuccessToast: options.showSuccessToast ?? true,
        });
    },

    /**
     * DELETE request with success toast by default
     */
    async delete<T = any>(url: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
        return this.fetch<T>(url, {
            ...options,
            method: "DELETE",
            showSuccessToast: options.showSuccessToast ?? true,
        });
    },
};

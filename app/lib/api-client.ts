import { toast } from "sonner";
import { authService } from "~/services/auth.service";

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
}

/**
 * API client wrapper with automatic toast notifications
 */
export const apiClient = {
    /**
     * Make a fetch request with automatic toast notifications
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
            ...fetchOptions
        } = options;

        try {
            const response = await fetch(url, {
                ...fetchOptions,
                headers: {
                    ...authService.getAuthHeaders(),
                    ...fetchOptions.headers,
                },
            });

            // Handle authentication errors
            if (response.status === 401 || response.status === 403) {
                authService.signout();
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("auth-session-expired"));
                }
                throw new Error("Unauthorized");
            }

            const data: ApiResponse<T> = await response.json().catch(() => ({
                status: "error",
                message: response.statusText || "Unknown error",
            }));

            if (!response.ok) {
                const errMsg = errorMessage || data.message || "Terjadi kesalahan";
                if (showErrorToast) {
                    toast.error(errMsg);
                }
                throw new Error(errMsg);
            }

            // Show success toast if enabled
            if (showSuccessToast && (successMessage || data.message)) {
                toast.success(successMessage || data.message);
            }

            return data;
        } catch (error) {
            if (error instanceof Error) {
                if (showErrorToast && error.message !== "Unauthorized") {
                    toast.error(errorMessage || error.message);
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

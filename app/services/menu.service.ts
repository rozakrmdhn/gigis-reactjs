import { apiClient, type ApiResponse } from '~/lib/api-client';

export interface SidebarSubmenu {
    id: string;
    title: string;
    url: string;
}

export interface SidebarMenuDetail {
    id: string;
    title: string;
    url: string;
    icon: string | null;
    items?: SidebarSubmenu[];
}

export interface MenuDetail {
    id: string;
    title: string;
    url: string;
    icon: string | null;
    parent_id: string | null;
    order: number;
    created_at?: string;
    updated_at?: string;
}

export interface RoleMenuMapping {
    role_id: string;
    menu_id: string;
}

export const menuService = {
    getSidebarMenus: async (): Promise<ApiResponse<SidebarMenuDetail[]>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/auth/menus`;
        return apiClient.get<SidebarMenuDetail[]>(url);
    },

    getAllMenus: async (): Promise<ApiResponse<MenuDetail[]>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/menus`;
        return apiClient.get<MenuDetail[]>(url);
    },

    getRoleMenuMappings: async (): Promise<ApiResponse<RoleMenuMapping[]>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/role-menus`;
        return apiClient.get<RoleMenuMapping[]>(url);
    },

    updateRoleMenuMappings: async (mappings: RoleMenuMapping[]): Promise<ApiResponse<any>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/role-menus`;
        return apiClient.post(url, { mappings });
    },

    createMenu: async (menu: Omit<MenuDetail, 'created_at' | 'updated_at'>): Promise<ApiResponse<MenuDetail>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/menus`;
        return apiClient.post<MenuDetail>(url, menu);
    },

    updateMenu: async (id: string, menu: Omit<MenuDetail, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<MenuDetail>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/menus/${id}`;
        return apiClient.put<MenuDetail>(url, menu);
    },

    deleteMenu: async (id: string): Promise<ApiResponse<any>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/menus/${id}`;
        return apiClient.delete(url);
    }
};

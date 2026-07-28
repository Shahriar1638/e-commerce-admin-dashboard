import api from './api';

export interface Permission {
  id: string;
  name: string;
  description: string | null;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionGroupResponse {
  data: PermissionGroup[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreatePermissionGroupPayload {
  name: string;
  description?: string;
  actions: string[];
  customActions?: string[];
}

export interface UpdatePermissionGroupPayload {
  name?: string;
  description?: string;
  actions?: string[];
  customActions?: string[];
}

export const permissionApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PermissionGroupResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    const url = `/permission-groups${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return response.data;
  },

  getById: async (id: string): Promise<PermissionGroup> => {
    const response = await api.get(`/permission-groups/${id}`);
    return response.data;
  },

  create: async (data: CreatePermissionGroupPayload): Promise<PermissionGroup> => {
    const response = await api.post('/permission-groups', data);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdatePermissionGroupPayload
  ): Promise<PermissionGroup> => {
    const response = await api.patch(`/permission-groups/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/permission-groups/${id}`);
  },
};

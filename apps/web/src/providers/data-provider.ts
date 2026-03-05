import type { DataProvider } from "@refinedev/core";
import axios, { type InternalAxiosRequestConfig } from "axios";

const API_URL = "/api/v1";

const api = axios.create({
  baseURL: API_URL,
});

// Inject X-User-Role header from localStorage
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const role = localStorage.getItem("cds-role") || "customer";
  config.headers["X-User-Role"] = role;
  return config;
});

// Global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem("cds-role");
      window.location.href = "/login";
      return Promise.reject(error);
    }
    // Extract backend error message if available
    const backendMessage =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message;
    if (backendMessage) {
      error.message = backendMessage;
    }
    return Promise.reject(error);
  }
);

interface Envelope {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;
}

/**
 * Custom Refine data provider for CDS backend.
 * Backend wraps all responses in: { success, data, meta: { timestamp, page?, size?, total? } }
 */
export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    const params: Record<string, unknown> = {};

    if (pagination) {
      params.page = pagination.current ?? 1;
      params.pageSize = pagination.pageSize ?? 20;
    }

    if (filters) {
      for (const filter of filters) {
        if ("field" in filter && filter.value !== undefined) {
          params[filter.field] = filter.value;
        }
      }
    }

    if (sorters && sorters.length > 0) {
      params.sortBy = sorters[0]?.field;
      params.sortOrder = sorters[0]?.order;
    }

    const url = (meta?.endpoint as string) || `/${resource}`;
    const { data: envelope } = await api.get<Envelope>(url, { params });

    const responseData = envelope.data;

    if (Array.isArray(responseData)) {
      return {
        data: responseData,
        total: envelope.meta?.total ?? responseData.length,
      };
    }

    if (responseData?.items) {
      return {
        data: responseData.items,
        total: responseData.total ?? responseData.items.length,
      };
    }

    return { data: responseData ? [responseData] : [], total: 0 };
  },

  getOne: async ({ resource, id, meta }) => {
    const url = (meta?.endpoint as string) || `/${resource}/${id}`;
    const { data: envelope } = await api.get<Envelope>(url);
    return { data: envelope.data };
  },

  create: async ({ resource, variables, meta }) => {
    const url = (meta?.endpoint as string) || `/${resource}`;
    const { data: envelope } = await api.post<Envelope>(url, variables);
    return { data: envelope.data };
  },

  update: async ({ resource, id, variables, meta }) => {
    const url = (meta?.endpoint as string) || `/${resource}/${id}`;
    const { data: envelope } = await api.patch<Envelope>(url, variables);
    return { data: envelope.data };
  },

  deleteOne: async ({ resource, id, meta }) => {
    const url = (meta?.endpoint as string) || `/${resource}/${id}`;
    const { data: envelope } = await api.delete<Envelope>(url);
    return { data: envelope.data };
  },

  getMany: async ({ resource, ids, meta }) => {
    const results = await Promise.all(
      ids.map((id) =>
        api
          .get<Envelope>((meta?.endpoint as string) || `/${resource}/${id}`)
          .then((r) => r.data.data)
      )
    );
    return { data: results };
  },

  custom: async ({ url, method, payload, query, headers }) => {
    const config = { params: query, headers };
    let response;

    switch (method) {
      case "get":
        response = await api.get(url, config);
        break;
      case "post":
        response = await api.post(url, payload, config);
        break;
      case "put":
        response = await api.put(url, payload, config);
        break;
      case "patch":
        response = await api.patch(url, payload, config);
        break;
      case "delete":
        response = await api.delete(url, config);
        break;
      default:
        response = await api.get(url, config);
    }

    return { data: response.data?.data ?? response.data };
  },
};

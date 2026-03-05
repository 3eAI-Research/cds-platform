/**
 * Standard API response wrapper.
 * All endpoints return this format (enforced by ResponseWrapperInterceptor).
 *
 * @see docs/domain-model/api-contracts.ts
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiFieldError[];
}

export interface ApiFieldError {
  field: string;
  message: string;
  constraint: string;
}

export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
}

/**
 * Paginated response for list endpoints.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

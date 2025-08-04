/**
 * API Type Definitions
 *
 * This file contains TypeScript type definitions related to API requests,
 * responses, and error handling.
 */

/**
 * Pagination parameters for API requests
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Search parameters for API requests
 */
export interface SearchParams {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Combined query parameters for API requests
 */
export interface QueryParams extends PaginationParams, SearchParams {}

/**
 * Pagination metadata for API responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Generic paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * API error response structure
 */
export interface ApiError {
  error: string;
  details?: any;
  status?: number;
}

/**
 * API success response structure
 */
export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

/**
 * Dashboard statistics response
 */
export interface DashboardStats {
  totalInvoices: number;
  totalPaid: number;
  totalOverdue: number;
  totalDraft: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowth: number;
  topCustomers: {
    _id: string;
    name: string;
    total: number;
    count: number;
  }[];
  invoicesByStatus: {
    status: string;
    count: number;
  }[];
  recentActivity: {
    type:
      | "invoice_created"
      | "invoice_sent"
      | "invoice_paid"
      | "customer_added";
    date: string;
    description: string;
    entityId: string;
  }[];
}

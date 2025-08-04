/**
 * API Response Utilities
 *
 * This file provides utility functions for creating standardized API responses.
 */

import {
  ApiError,
  ApiSuccess,
  PaginatedResponse,
  PaginationMeta,
} from "@/types/api";
import { NextResponse } from "next/server";

/**
 * Creates a success response
 *
 * @param data The data to include in the response
 * @param message Optional success message
 * @param status HTTP status code (default: 200)
 * @returns NextResponse with standardized success format
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: ApiSuccess<T> = {
    data,
    ...(message && { message }),
  };

  return NextResponse.json(response, { status });
}

/**
 * Creates a paginated response
 *
 * @param data Array of data items
 * @param pagination Pagination metadata
 * @param status HTTP status code (default: 200)
 * @returns NextResponse with standardized paginated format
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  status: number = 200
): NextResponse {
  const response: PaginatedResponse<T> = {
    data,
    pagination,
  };

  return NextResponse.json(response, { status });
}

/**
 * Creates an error response
 *
 * @param error Error message
 * @param details Optional error details
 * @param status HTTP status code (default: 500)
 * @returns NextResponse with standardized error format
 */
export function errorResponse(
  error: string,
  details?: any,
  status: number = 500
): NextResponse {
  const response: ApiError = {
    error,
    ...(details && { details }),
    status,
  };

  return NextResponse.json(response, { status });
}

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: () => errorResponse("Unauthorized", null, 401),
  forbidden: () => errorResponse("Forbidden", null, 403),
  notFound: (resource: string = "Resource") =>
    errorResponse(`${resource} not found`, null, 404),
  badRequest: (message: string = "Invalid request") =>
    errorResponse(message, null, 400),
  conflict: (message: string = "Resource already exists") =>
    errorResponse(message, null, 409),
  serverError: (details?: any) =>
    errorResponse("Internal server error", details, 500),
  validationError: (details: any) =>
    errorResponse("Validation error", details, 400),
};

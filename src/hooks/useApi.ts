/**
 * Type-Safe API Hook
 *
 * This file provides a custom hook for making type-safe API calls.
 */

import { ApiError } from "@/types/api";
import { useCallback, useState } from "react";

interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface ApiOptions {
  headers?: HeadersInit;
  withCredentials?: boolean;
}

/**
 * Custom hook for making type-safe API calls
 */
export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  /**
   * Makes a GET request to the specified URL
   */
  const get = useCallback(async (url: string, options?: ApiOptions) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        credentials: options?.withCredentials ? "include" : "same-origin",
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ApiError;
        throw new Error(errorData.error || "An error occurred");
      }

      const data = await response.json();
      setState({ data: data.data, isLoading: false, error: null });
      return data.data as T;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Makes a POST request to the specified URL
   */
  const post = useCallback(
    async <D>(url: string, body: D, options?: ApiOptions) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...options?.headers,
          },
          credentials: options?.withCredentials ? "include" : "same-origin",
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as ApiError;
          throw new Error(errorData.error || "An error occurred");
        }

        const data = await response.json();
        setState({ data: data.data, isLoading: false, error: null });
        return data.data as T;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    []
  );

  /**
   * Makes a PATCH request to the specified URL
   */
  const patch = useCallback(
    async <D>(url: string, body: D, options?: ApiOptions) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...options?.headers,
          },
          credentials: options?.withCredentials ? "include" : "same-origin",
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as ApiError;
          throw new Error(errorData.error || "An error occurred");
        }

        const data = await response.json();
        setState({ data: data.data, isLoading: false, error: null });
        return data.data as T;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    []
  );

  /**
   * Makes a DELETE request to the specified URL
   */
  const del = useCallback(async (url: string, options?: ApiOptions) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        credentials: options?.withCredentials ? "include" : "same-origin",
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ApiError;
        throw new Error(errorData.error || "An error occurred");
      }

      setState({ data: null, isLoading: false, error: null });
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Resets the state
   */
  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    get,
    post,
    patch,
    del,
    reset,
  };
}

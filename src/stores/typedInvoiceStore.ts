/**
 * Type-Safe Invoice Store
 *
 * This file demonstrates how to create a type-safe store using Zustand
 * with our custom type definitions.
 */

import { InvoiceModel, InvoiceStatus } from "@/types/models";
import { InvoiceStoreState } from "@/types/ui";
import { create } from "zustand";

/**
 * Creates a type-safe invoice store
 */
export const useInvoiceStore = create<InvoiceStoreState>((set, get) => ({
  // State
  invoices: [],
  currentInvoice: null,
  isLoading: false,
  error: null,

  // Actions
  fetchInvoices: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch("/api/invoices");

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch invoices");
      }

      const data = await response.json();
      set({ invoices: data.data, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
    }
  },

  fetchInvoiceById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/invoices/${id}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch invoice");
      }

      const data = await response.json();
      set({ currentInvoice: data.data, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
    }
  },

  createInvoice: async (invoice: Partial<InvoiceModel>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoice),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create invoice");
      }

      const data = await response.json();
      set((state) => ({
        invoices: [...state.invoices, data.data],
        currentInvoice: data.data,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
    }
  },

  updateInvoice: async (id: string, invoice: Partial<InvoiceModel>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoice),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update invoice");
      }

      const data = await response.json();
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv._id === id ? data.data : inv
        ),
        currentInvoice: data.data,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
    }
  },

  deleteInvoice: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete invoice");
      }

      set((state) => ({
        invoices: state.invoices.filter((inv) => inv._id !== id),
        currentInvoice:
          state.currentInvoice?._id === id ? null : state.currentInvoice,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
    }
  },

  sendInvoice: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/invoices/${id}/send`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invoice");
      }

      const data = await response.json();
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv._id === id ? { ...inv, status: "sent" as InvoiceStatus } : inv
        ),
        currentInvoice: data.data,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
    }
  },

  markAsPaid: async (id: string, amount?: number) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/invoices/${id}/mark-paid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to mark invoice as paid");
      }

      const data = await response.json();
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv._id === id ? { ...inv, status: "paid" as InvoiceStatus } : inv
        ),
        currentInvoice: data.data,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      });
    }
  },

  clearCurrentInvoice: () => {
    set({ currentInvoice: null });
  },
}));

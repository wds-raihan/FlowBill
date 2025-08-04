/**
 * UI Type Definitions
 *
 * This file contains TypeScript type definitions related to UI components,
 * state management, and user interactions.
 */

import { ReactNode } from "react";
import { CustomerModel, InvoiceModel } from "./models";

/**
 * Common props for UI components
 */
export interface CommonProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Modal state interface
 */
export interface ModalState {
  isOpen: boolean;
  type?: string;
  data?: any;
}

/**
 * Toast notification interface
 */
export interface ToastNotification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

/**
 * UI store state interface
 */
export interface UIStoreState {
  theme: "light" | "dark" | "system";
  sidebarOpen: boolean;
  modal: ModalState;
  loading: boolean;
  notifications: ToastNotification[];
  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (type: string, data?: any) => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<ToastNotification, "id">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

/**
 * Invoice store state interface
 */
export interface InvoiceStoreState {
  invoices: InvoiceModel[];
  currentInvoice: InvoiceModel | null;
  isLoading: boolean;
  error: string | null;
  fetchInvoices: () => Promise<void>;
  fetchInvoiceById: (id: string) => Promise<void>;
  createInvoice: (invoice: Partial<InvoiceModel>) => Promise<void>;
  updateInvoice: (id: string, invoice: Partial<InvoiceModel>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  sendInvoice: (id: string) => Promise<void>;
  markAsPaid: (id: string, amount?: number) => Promise<void>;
  clearCurrentInvoice: () => void;
}

/**
 * Customer store state interface
 */
export interface CustomerStoreState {
  customers: CustomerModel[];
  currentCustomer: CustomerModel | null;
  isLoading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  fetchCustomerById: (id: string) => Promise<void>;
  createCustomer: (customer: Partial<CustomerModel>) => Promise<void>;
  updateCustomer: (
    id: string,
    customer: Partial<CustomerModel>
  ) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  clearCurrentCustomer: () => void;
}

/**
 * Form field interface
 */
export interface FormField {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "select"
    | "textarea"
    | "date"
    | "checkbox";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string | number }[];
  validation?: {
    required?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: {
      value: RegExp;
      message: string;
    };
  };
}

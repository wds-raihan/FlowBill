/**
 * Model Type Definitions
 *
 * This file contains TypeScript type definitions related to database models
 * and their relationships.
 */

import { Document, Types } from "mongoose";

/**
 * Base model interface with common fields
 */
export interface BaseModel extends Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User preferences interface
 */
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  currency: string;
  dateFormat: string;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  autoSave: boolean;
  defaultDueDays: number;
  defaultTax: number;
}

/**
 * User model interface
 */
export interface UserModel extends BaseModel {
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  role: "owner" | "admin" | "user";
  orgId: Types.ObjectId;
  emailVerified?: Date;
  lastLoginAt?: Date;
  preferences: UserPreferences;
  isActive: boolean;
}

/**
 * Address interface for customer and organization models
 */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

/**
 * Customer model interface
 */
export interface CustomerModel extends BaseModel {
  name: string;
  email: string;
  phone?: string;
  website?: string;
  taxId?: string;
  address?: Address;
  billingAddress?: Address;
  notes?: string;
  orgId: Types.ObjectId;
  createdBy: Types.ObjectId | UserModel;
  isActive: boolean;
}

/**
 * Organization model interface
 */
export interface OrganizationModel extends BaseModel {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
  address?: Address;
  logo?: string;
  settings: {
    fiscalYear: {
      startMonth: number;
      startDay: number;
    };
    defaultCurrency: string;
    defaultTaxRate: number;
    defaultDueDays: number;
  };
  isActive: boolean;
}

/**
 * Invoice item interface
 */
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
  total: number;
}

/**
 * Invoice status type
 */
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "cancelled";

/**
 * Invoice model interface
 */
export interface InvoiceModel extends BaseModel {
  invoiceNumber: string;
  customer: Types.ObjectId | CustomerModel;
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  notes?: string;
  terms?: string;
  status: InvoiceStatus;
  paymentDetails?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    routingNumber?: string;
    swiftBic?: string;
  };
  orgId: Types.ObjectId;
  createdBy: Types.ObjectId | UserModel;
  lastSentAt?: Date;
  lastViewedAt?: Date;
  paidAt?: Date;
  paidAmount?: number;
}

import { OrganizationModel } from "@/types/models";
import mongoose, { Schema } from "mongoose";

// Define organization-specific interfaces
interface OrganizationTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

interface OrganizationSettings {
  currency: string;
  taxRate: number;
  paymentTerms: number;
  invoicePrefix: string;
  theme: OrganizationTheme;
}

interface OrganizationContact {
  phone?: string;
  website?: string;
}

interface OrganizationBankDetails {
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
}

const OrganizationSettingsSchema = new Schema<OrganizationSettings>({
  currency: {
    type: String,
    default: "USD",
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  paymentTerms: {
    type: Number,
    default: 30,
    min: 1,
    max: 365,
  },
  invoicePrefix: {
    type: String,
    default: "INV",
    trim: true,
    maxlength: 10,
  },
  theme: {
    primaryColor: {
      type: String,
      default: "#3B82F6",
    },
    secondaryColor: {
      type: String,
      default: "#1E40AF",
    },
    accentColor: {
      type: String,
      default: "#F59E0B",
    },
  },
});

const OrganizationSchema = new Schema<OrganizationModel>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    contact: {
      phone: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    taxId: {
      type: String,
      trim: true,
    },
    bankDetails: {
      bankName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      routingNumber: { type: String, trim: true },
    },
    settings: {
      type: OrganizationSettingsSchema,
      default: () => ({}),
    },
    isSetupComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
OrganizationSchema.index({ ownerId: 1 });
OrganizationSchema.index({ email: 1 });

// Virtual to check if basic setup is complete
OrganizationSchema.virtual("hasBasicInfo").get(function () {
  return !!(
    this.name &&
    this.email &&
    this.address?.street &&
    this.address?.city &&
    this.address?.state &&
    this.address?.zipCode &&
    this.address?.country
  );
});

// Methods
OrganizationSchema.methods.updateSettings = function (
  settings: Partial<OrganizationSettings>
) {
  this.settings = { ...this.settings, ...settings };
  return this.save();
};

OrganizationSchema.methods.completeSetup = function () {
  this.isSetupComplete = true;
  return this.save();
};

export const Organization =
  mongoose.models.Organization ||
  mongoose.model<OrganizationModel>("Organization", OrganizationSchema);

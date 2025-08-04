import mongoose, { Schema, Document } from "mongoose";

export interface ICustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface ICustomer extends Document {
  _id: string;
  orgId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  taxId?: string;
  address: ICustomerAddress;
  billingAddress?: ICustomerAddress;
  notes?: string;
  isActive: boolean;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  lastInvoiceDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerAddressSchema = new Schema<ICustomerAddress>({
  street: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  zipCode: { type: String, trim: true },
  country: { type: String, trim: true },
});

const CustomerSchema = new Schema<ICustomer>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
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
      maxlength: 255,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    website: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    taxId: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    address: {
      type: CustomerAddressSchema,
      default: () => ({}),
    },
    billingAddress: {
      type: CustomerAddressSchema,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalInvoiced: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
    },
    lastInvoiceDate: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CustomerSchema.index({ orgId: 1, email: 1 }, { unique: true });
CustomerSchema.index({ orgId: 1, name: 1 });
CustomerSchema.index({ orgId: 1, isActive: 1 });
CustomerSchema.index({ createdBy: 1 });

// Virtual for full address
CustomerSchema.virtual("fullAddress").get(function () {
  const addr = this.address;
  if (!addr) return "";
  
  const parts = [
    addr.street,
    addr.city,
    addr.state,
    addr.zipCode,
    addr.country,
  ].filter(Boolean);
  
  return parts.join(", ");
});

CustomerSchema.virtual("fullBillingAddress").get(function () {
  const addr = this.billingAddress || this.address;
  if (!addr) return "";
  
  const parts = [
    addr.street,
    addr.city,
    addr.state,
    addr.zipCode,
    addr.country,
  ].filter(Boolean);
  
  return parts.join(", ");
});

// Methods
CustomerSchema.methods.updateFinancials = function (invoiceAmount: number, paidAmount: number = 0) {
  this.totalInvoiced += invoiceAmount;
  this.totalPaid += paidAmount;
  this.outstandingBalance = this.totalInvoiced - this.totalPaid;
  this.lastInvoiceDate = new Date();
  return this.save();
};

CustomerSchema.methods.markPayment = function (amount: number) {
  this.totalPaid += amount;
  this.outstandingBalance = this.totalInvoiced - this.totalPaid;
  return this.save();
};

CustomerSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

CustomerSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

// Pre-save middleware to calculate outstanding balance
CustomerSchema.pre("save", function (next) {
  this.outstandingBalance = this.totalInvoiced - this.totalPaid;
  next();
});

export const Customer = mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);
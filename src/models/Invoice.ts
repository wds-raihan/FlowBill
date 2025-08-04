import mongoose, { Schema, Document } from "mongoose";

export interface IInvoiceItem {
  description: string;
  pageQty: number;
  serviceCharge: number;
  rate: number;
  amount: number;
}

export interface IInvoice extends Document {
  _id: string;
  orgId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  invoiceNo: string;
  issueDate: Date;
  dueDate: Date;
  items: IInvoiceItem[];
  subTotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  status: "draft" | "sent" | "paid" | "overdue";
  createdBy: mongoose.Types.ObjectId;
  pdfUrl?: string;
  sentAt?: Date;
  remindersSent?: Array<{
    sentAt: Date;
    sentBy: mongoose.Types.ObjectId;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: {
    type: String,
    required: true,
    trim: true,
  },
  pageQty: {
    type: Number,
    required: true,
    min: 0,
  },
  serviceCharge: {
    type: Number,
    required: true,
    min: 0,
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
});

const ReminderSchema = new Schema({
  sentAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  sentBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const InvoiceSchema = new Schema<IInvoice>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    items: [InvoiceItemSchema],
    subTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue"],
      default: "draft",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pdfUrl: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
    remindersSent: [ReminderSchema],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate subTotal, tax, discount, and total
InvoiceSchema.pre("save", function (next) {
  // Calculate subTotal from items
  this.subTotal = this.items.reduce((sum, item) => sum + item.amount, 0);

  // Calculate total
  this.total = this.subTotal + this.tax - this.discount;

  // Ensure total is not negative
  if (this.total < 0) this.total = 0;

  next();
});

// Auto-generate invoice number if not provided
InvoiceSchema.pre("save", async function (next) {
  // Only generate invoice number if it's a new document and invoiceNo is not set
  if (this.isNew && !this.invoiceNo) {
    try {
      // Get the current year
      const year = new Date().getFullYear();

      // Find the highest invoice number for this year and organization
      const highestInvoice = await this.constructor.findOne(
        {
          orgId: this.orgId,
          invoiceNo: new RegExp(`^INV-${year}-`),
        },
        {},
        { sort: { invoiceNo: -1 } }
      );

      let nextNumber = 1;

      if (highestInvoice) {
        // Extract the number part from the highest invoice number
        const parts = highestInvoice.invoiceNo.split("-");
        if (parts.length === 3) {
          const number = parseInt(parts[2], 10);
          if (!isNaN(number)) {
            nextNumber = number + 1;
          }
        }
      }

      // Format the invoice number with leading zeros (5 digits)
      this.invoiceNo = `INV-${year}-${nextNumber.toString().padStart(5, "0")}`;

      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

// Virtual to check if invoice is overdue
InvoiceSchema.virtual("isOverdue").get(function () {
  return this.status !== "paid" && new Date(this.dueDate) < new Date();
});

// Virtual to get days overdue
InvoiceSchema.virtual("daysOverdue").get(function () {
  if (this.status === "paid") return 0;
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  if (dueDate >= today) return 0;
  return Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
});

// Method to check if reminder can be sent
InvoiceSchema.methods.canSendReminder = function () {
  if (this.status === "paid" || this.status === "draft") return false;
  
  // Check if a reminder was sent in the last 24 hours
  if (this.remindersSent && this.remindersSent.length > 0) {
    const lastReminder = this.remindersSent[this.remindersSent.length - 1];
    const daysSinceLastReminder = (Date.now() - lastReminder.sentAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastReminder >= 1; // Allow one reminder per day
  }
  
  return true;
};

// Indexes
InvoiceSchema.index({ orgId: 1, invoiceNo: 1 }, { unique: true });
InvoiceSchema.index({ orgId: 1, status: 1 });
InvoiceSchema.index({ orgId: 1, dueDate: 1 });
InvoiceSchema.index({ customerId: 1, status: 1 });

// TTL index for soft-deleted drafts (30 days)
InvoiceSchema.index(
  { status: 1, updatedAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    partialFilterExpression: { status: "draft" },
  }
);

export const Invoice = mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  type: "invoice_sent" | "invoice_paid" | "invoice_overdue" | "general";
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["invoice_sent", "invoice_paid", "invoice_overdue", "general"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
NotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

import mongoose, { Schema, Document } from "mongoose";

export interface IUserPreferences {
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

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  role: "owner" | "admin" | "user";
  orgId: mongoose.Types.ObjectId;
  emailVerified?: Date;
  lastLoginAt?: Date;
  preferences: IUserPreferences;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferencesSchema = new Schema<IUserPreferences>({
  theme: {
    type: String,
    enum: ["light", "dark", "system"],
    default: "system",
  },
  currency: {
    type: String,
    default: "USD",
  },
  dateFormat: {
    type: String,
    default: "MM/dd/yyyy",
  },
  timezone: {
    type: String,
    default: "UTC",
  },
  language: {
    type: String,
    default: "en",
  },
  emailNotifications: {
    type: Boolean,
    default: true,
  },
  autoSave: {
    type: Boolean,
    default: true,
  },
  defaultDueDays: {
    type: Number,
    default: 30,
    min: 1,
    max: 365,
  },
  defaultTax: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
});

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    password: {
      type: String,
      select: false, // Don't include password in queries by default
      minlength: 8,
    },
    avatar: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "user"],
      default: "user",
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    emailVerified: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
    preferences: {
      type: UserPreferencesSchema,
      default: () => ({}),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ orgId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

// Virtual for full name
UserSchema.virtual("initials").get(function () {
  return this.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});

// Pre-save middleware to update lastLoginAt
UserSchema.pre("save", function (next) {
  if (this.isModified("lastLoginAt")) {
    this.lastLoginAt = new Date();
  }
  next();
});

// Methods
UserSchema.methods.updateLastLogin = function () {
  this.lastLoginAt = new Date();
  return this.save();
};

UserSchema.methods.updatePreferences = function (
  preferences: Partial<IUserPreferences>
) {
  this.preferences = { ...this.preferences, ...preferences };
  return this.save();
};

UserSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

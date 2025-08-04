--npx shadcn@latest add cardimport { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    const { name, email, password, companyName } = validatedData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create organization first
    const organization = new Organization({
      name: companyName,
      email: email,
      settings: {
        currency: "USD",
        taxRate: 0,
        paymentTerms: 30,
        invoicePrefix: "INV",
        theme: {
          primaryColor: "#3B82F6",
          secondaryColor: "#1E40AF",
          accentColor: "#F59E0B",
        },
      },
    });

    const savedOrganization = await organization.save();

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: "owner",
      orgId: savedOrganization._id,
      emailVerified: null, // Will be set when email is verified
      preferences: {
        theme: "system",
        currency: "USD",
        dateFormat: "MM/dd/yyyy",
        timezone: "UTC",
        language: "en",
        emailNotifications: true,
        autoSave: true,
        defaultDueDays: 30,
        defaultTax: 0,
      },
    });

    const savedUser = await user.save();

    // Update organization with owner reference
    await Organization.findByIdAndUpdate(savedOrganization._id, {
      ownerId: savedUser._id,
    });

    // Return success response (don't include password)
    const userResponse = {
      id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
      role: savedUser.role,
      orgId: savedUser.orgId,
      createdAt: savedUser.createdAt,
    };

    return NextResponse.json(
      {
        message: "User created successfully",
        user: userResponse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Handle specific MongoDB errors
      if (error.message.includes("E11000")) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
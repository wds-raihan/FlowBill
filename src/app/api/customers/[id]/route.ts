import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { User } from "@/models/User";
import { Invoice } from "@/models/Invoice";

const customerUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  email: z.string().email("Invalid email address").max(255).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().max(255).optional(),
  taxId: z.string().max(50).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  notes: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/customers/[id] - Get customer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const customer = await Customer.findOne({
      _id: params.id,
      orgId: user.orgId,
    }).populate("createdBy", "name email");

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Get customer's invoice statistics
    const invoiceStats = await Invoice.aggregate([
      { $match: { customerId: customer._id } },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          paidAmount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } },
          overdueAmount: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, "$total", 0] } },
          lastInvoiceDate: { $max: "$createdAt" },
        },
      },
    ]);

    const stats = invoiceStats[0] || {
      totalInvoices: 0,
      totalAmount: 0,
      paidAmount: 0,
      overdueAmount: 0,
      lastInvoiceDate: null,
    };

    return NextResponse.json({
      ...customer.toObject(),
      stats,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = customerUpdateSchema.parse(body);

    // Check if customer exists and belongs to user's organization
    const customer = await Customer.findOne({
      _id: params.id,
      orgId: user.orgId,
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // If email is being updated, check for duplicates
    if (validatedData.email && validatedData.email !== customer.email) {
      const existingCustomer = await Customer.findOne({
        orgId: user.orgId,
        email: validatedData.email,
        _id: { $ne: params.id },
      });

      if (existingCustomer) {
        return NextResponse.json(
          { error: "Customer with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Update customer
    Object.assign(customer, validatedData);
    const updatedCustomer = await customer.save();

    // Populate created by user
    await updatedCustomer.populate("createdBy", "name email");

    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error("Error updating customer:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if customer exists and belongs to user's organization
    const customer = await Customer.findOne({
      _id: params.id,
      orgId: user.orgId,
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Check if customer has any invoices
    const invoiceCount = await Invoice.countDocuments({
      customerId: customer._id,
    });

    if (invoiceCount > 0) {
      // Don't delete, just deactivate
      customer.isActive = false;
      await customer.save();
      
      return NextResponse.json({
        message: "Customer deactivated (has existing invoices)",
        customer,
      });
    }

    // Safe to delete
    await Customer.findByIdAndDelete(params.id);

    return NextResponse.json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
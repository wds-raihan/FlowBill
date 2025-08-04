import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Invoice } from "@/models/Invoice";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const orgId = session.user.orgId;

    // Build query
    const query: any = { orgId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (from || to) {
      query.issueDate = {};

      if (from) {
        query.issueDate.$gte = new Date(from);
      }

      if (to) {
        // Add one day to include the end date
        const endDate = new Date(to);
        endDate.setDate(endDate.getDate() + 1);
        query.issueDate.$lt = endDate;
      }
    }

    const invoices = await Invoice.find(query)
      .populate("customerId", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      customerId,
      issueDate,
      dueDate,
      items,
      tax,
      discount,
      notes,
      orgId,
      createdBy,
    } = await request.json();

    // Check if user has permission to create invoice for this organization
    const user = await User.findById(session.user.id);

    if (!user || (user.role !== "ADMIN" && user.orgId.toString() !== orgId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoice = new Invoice({
      orgId,
      customerId,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      items,
      tax,
      discount,
      notes,
      status: "draft",
      createdBy,
    });

    await invoice.save();

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

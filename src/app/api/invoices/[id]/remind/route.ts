import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Invoice } from "@/models/Invoice";
import { User } from "@/models/User";
import { emailService } from "@/lib/email/emailService";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Fetch invoice with populated data
    const invoice = await Invoice.findOne({
      _id: params.id,
      orgId: session.user.orgId,
    })
      .populate("customerId")
      .populate("orgId")
      .lean();

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check if invoice can have payment reminder sent
    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Cannot send reminder for paid invoice" },
        { status: 400 }
      );
    }

    if (invoice.status === "draft") {
      return NextResponse.json(
        { error: "Cannot send reminder for draft invoice" },
        { status: 400 }
      );
    }

    // Check if user has permission
    const user = await User.findById(session.user.id);
    if (!user || user.orgId.toString() !== invoice.orgId._id.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare email data
    const emailData = {
      invoice: {
        _id: invoice._id.toString(),
        invoiceNo: invoice.invoiceNo,
        issueDate: new Date(invoice.issueDate),
        dueDate: new Date(invoice.dueDate),
        items: invoice.items,
        subTotal: invoice.subTotal,
        tax: invoice.tax,
        discount: invoice.discount,
        total: invoice.total,
        notes: invoice.notes,
        status: invoice.status,
      },
      customer: {
        name: invoice.customerId.name,
        email: invoice.customerId.email,
        phone: invoice.customerId.phone,
        address: invoice.customerId.address || {},
        taxId: invoice.customerId.taxId,
      },
      organization: {
        name: invoice.orgId.name,
        logoUrl: invoice.orgId.logoUrl,
        address: invoice.orgId.address || {},
        contact: {
          email: invoice.orgId.email,
          phone: invoice.orgId.contact?.phone,
          website: invoice.orgId.contact?.website,
        },
        taxId: invoice.orgId.taxId,
        settings: invoice.orgId.settings,
      },
    };

    // Send payment reminder email
    const emailResult = await emailService.sendPaymentReminderEmail(emailData);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send reminder" },
        { status: 500 }
      );
    }

    // Update invoice with reminder sent timestamp
    await Invoice.findByIdAndUpdate(params.id, {
      $push: {
        remindersSent: {
          sentAt: new Date(),
          sentBy: session.user.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      message: "Payment reminder sent successfully",
    });
  } catch (error) {
    console.error("Error sending payment reminder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
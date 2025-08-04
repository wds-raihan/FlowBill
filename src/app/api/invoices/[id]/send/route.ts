import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Invoice } from "@/models/Invoice";
import { User } from "@/models/User";
import { Customer } from "@/models/Customer";
import { Organization } from "@/models/Organization";
import { emailService } from "@/lib/email/emailService";

// Rate limiting store (in-memory, for production use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired rate limits
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

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

    // Rate limiting: 10 emails per 15 minutes per user
    const userId = session.user.id;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 10;

    const userRateLimit = rateLimitStore.get(userId);

    if (userRateLimit) {
      if (userRateLimit.resetTime < now) {
        // Reset window
        rateLimitStore.set(userId, {
          count: 1,
          resetTime: now + windowMs,
        });
      } else if (userRateLimit.count >= maxRequests) {
        return NextResponse.json(
          { 
            error: "Too many email requests. Please try again later.",
            retryAfter: Math.ceil((userRateLimit.resetTime - now) / 1000)
          },
          { status: 429 }
        );
      } else {
        // Increment count
        rateLimitStore.set(userId, {
          count: userRateLimit.count + 1,
          resetTime: userRateLimit.resetTime,
        });
      }
    } else {
      // Initialize rate limit
      rateLimitStore.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
    }

    // Parse request body (optional custom email data)
    const body = await request.json().catch(() => ({}));
    const { customMessage, sendCopy = false } = body;

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

    // Check if user has permission to send this invoice
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
        notes: customMessage || invoice.notes,
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

    // Send invoice email
    const emailResult = await emailService.sendInvoiceEmail(emailData);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send email" },
        { status: 500 }
      );
    }

    // Update invoice status to 'sent' if it was draft
    if (invoice.status === "draft") {
      await Invoice.findByIdAndUpdate(params.id, {
        status: "sent",
        sentAt: new Date(),
      });
    }

    // Send copy to sender if requested
    if (sendCopy && user.email) {
      try {
        const copyEmailData = {
          ...emailData,
          customer: {
            name: user.name,
            email: user.email,
            phone: "",
            address: {},
          },
        };
        await emailService.sendInvoiceEmail(copyEmailData);
      } catch (error) {
        console.warn("Failed to send copy to sender:", error);
        // Don't fail the main request if copy fails
      }
    }

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      message: "Invoice sent successfully",
    });
  } catch (error) {
    console.error("Error sending invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check if invoice can be sent
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

    const invoice = await Invoice.findOne({
      _id: params.id,
      orgId: session.user.orgId,
    })
      .populate("customerId", "name email")
      .lean();

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check rate limiting
    const userId = session.user.id;
    const userRateLimit = rateLimitStore.get(userId);
    const canSend = !userRateLimit || userRateLimit.count < 10;

    return NextResponse.json({
      canSend,
      customer: {
        name: invoice.customerId.name,
        email: invoice.customerId.email,
      },
      invoice: {
        invoiceNo: invoice.invoiceNo,
        status: invoice.status,
        total: invoice.total,
      },
      rateLimitRemaining: userRateLimit ? Math.max(0, 10 - userRateLimit.count) : 10,
    });
  } catch (error) {
    console.error("Error checking send status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
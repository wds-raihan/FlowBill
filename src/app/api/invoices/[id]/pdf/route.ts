import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Invoice } from "@/models/Invoice";
import { Customer } from "@/models/Customer";
import { Organization } from "@/models/Organization";
import { renderToBuffer } from "@react-pdf/renderer";
import { EnhancedInvoicePDF } from "@/features/pdf/EnhancedInvoicePdf";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

// Generate PDF access token
export async function generatePDFToken(invoiceId: string) {
  const { SignJWT } = await import("jose");
  
  return await new SignJWT({ invoiceId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m") // 5 minutes
    .sign(JWT_SECRET);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Check for token-based access (for email links)
    const token = request.nextUrl.searchParams.get("token");
    const format = request.nextUrl.searchParams.get("format") || "pdf";

    if (token) {
      // Verify JWT token
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);

        // Check if token is for this invoice
        if (payload.invoiceId !== params.id) {
          return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
      } catch (error) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }
    } else {
      // Check session-based access
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Fetch invoice with populated data
    const invoice = await Invoice.findById(params.id)
      .populate("customerId")
      .populate("orgId")
      .lean();

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Transform data for PDF component
    const invoiceData = {
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
    };

    const customerData = {
      name: invoice.customerId.name,
      email: invoice.customerId.email,
      phone: invoice.customerId.phone,
      address: invoice.customerId.address || {},
      taxId: invoice.customerId.taxId,
    };

    const organizationData = {
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
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <EnhancedInvoicePDF
        invoice={invoiceData}
        customer={customerData}
        organization={organizationData}
      />
    );

    // Set response headers
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    
    if (format === "download") {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${invoice.invoiceNo}.pdf"`
      );
    } else {
      headers.set(
        "Content-Disposition",
        `inline; filename="${invoice.invoiceNo}.pdf"`
      );
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
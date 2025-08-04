import { NextRequest, NextResponse } from "next/server";
import { notifyInvoiceOverdue } from "@/lib/notifications";

// This endpoint should be protected and only called by authorized systems
export async function GET(request: NextRequest) {
  try {
    // In a real application, you would verify a secret key or token here
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await notifyInvoiceOverdue();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in overdue check cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Invoice } from "@/models/Invoice";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // Total revenue for current month
    const revenuePipeline = [
      {
        $match: {
          orgId,
          status: "paid",
          paidAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
        },
      },
    ];

    const revenueResult = await Invoice.aggregate(revenuePipeline);
    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Overdue invoices count
    const overdueCount = await Invoice.countDocuments({
      orgId,
      status: { $ne: "paid" },
      dueDate: { $lt: now },
    });

    // Average payment time (in days)
    const paymentTimePipeline = [
      {
        $match: {
          orgId,
          status: "paid",
          paidAt: { $exists: true },
        },
      },
      {
        $project: {
          paymentDays: {
            $divide: [
              { $subtract: ["$paidAt", "$issueDate"] },
              1000 * 60 * 60 * 24, // Convert milliseconds to days
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgPaymentTime: { $avg: "$paymentDays" },
        },
      },
    ];

    const paymentTimeResult = await Invoice.aggregate(paymentTimePipeline);
    const avgPaymentTime =
      paymentTimeResult.length > 0 ? paymentTimeResult[0].avgPaymentTime : 0;

    // Recent invoices
    const recentInvoices = await Invoice.find({ orgId })
      .populate("customerId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    return NextResponse.json({
      totalRevenue,
      overdueInvoices: overdueCount,
      avgPaymentTime,
      recentInvoices,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Invoice } from "@/models/Invoice";
import { Customer } from "@/models/Customer";
import { User } from "@/models/User";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Parallel aggregation queries for better performance
    const [
      revenueStats,
      invoiceStats,
      customerStats,
      monthlyTrends,
      statusDistribution,
      topCustomers,
      overdueAnalysis,
      recentActivity
    ] = await Promise.all([
      // Revenue Statistics
      Invoice.aggregate([
        { $match: { orgId: user.orgId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            paidRevenue: {
              $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] }
            },
            pendingRevenue: {
              $sum: { $cond: [{ $eq: ["$status", "sent"] }, "$total", 0] }
            },
            overdueRevenue: {
              $sum: { $cond: [{ $eq: ["$status", "overdue"] }, "$total", 0] }
            },
            averageInvoiceValue: { $avg: "$total" },
            count: { $sum: 1 }
          }
        }
      ]),

      // Invoice Statistics
      Invoice.aggregate([
        { $match: { orgId: user.orgId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$total" }
          }
        }
      ]),

      // Customer Statistics
      Customer.aggregate([
        { $match: { orgId: user.orgId } },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            activeCustomers: {
              $sum: { $cond: ["$isActive", 1, 0] }
            },
            totalOutstanding: { $sum: "$outstandingBalance" },
            averageOutstanding: { $avg: "$outstandingBalance" }
          }
        }
      ]),

      // Monthly Revenue Trends (last 12 months)
      Invoice.aggregate([
        {
          $match: {
            orgId: user.orgId,
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            revenue: { $sum: "$total" },
            invoiceCount: { $sum: 1 },
            paidRevenue: {
              $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] }
            }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),

      // Status Distribution
      Invoice.aggregate([
        { $match: { orgId: user.orgId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            percentage: { $sum: 1 }
          }
        }
      ]),

      // Top Customers by Revenue
      Invoice.aggregate([
        { $match: { orgId: user.orgId } },
        {
          $group: {
            _id: "$customerId",
            totalRevenue: { $sum: "$total" },
            invoiceCount: { $sum: 1 },
            lastInvoiceDate: { $max: "$createdAt" }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "customers",
            localField: "_id",
            foreignField: "_id",
            as: "customer"
          }
        },
        { $unwind: "$customer" }
      ]),

      // Overdue Analysis
      Invoice.aggregate([
        {
          $match: {
            orgId: user.orgId,
            status: { $in: ["sent", "overdue"] },
            dueDate: { $lt: new Date() }
          }
        },
        {
          $addFields: {
            daysOverdue: {
              $divide: [
                { $subtract: [new Date(), "$dueDate"] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $lte: ["$daysOverdue", 30] }, then: "1-30 days" },
                  { case: { $lte: ["$daysOverdue", 60] }, then: "31-60 days" },
                  { case: { $lte: ["$daysOverdue", 90] }, then: "61-90 days" }
                ],
                default: "90+ days"
              }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: "$total" }
          }
        }
      ]),

      // Recent Activity (last 10 invoices)
      Invoice.find({ orgId: user.orgId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("customerId", "name email")
        .select("invoiceNo total status createdAt customerId")
        .lean()
    ]);

    // Calculate growth rates
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(period) * 2);
    previousPeriodStart.setDate(previousPeriodStart.getDate() + parseInt(period));

    const previousPeriodStats = await Invoice.aggregate([
      {
        $match: {
          orgId: user.orgId,
          createdAt: { $gte: previousPeriodStart, $lt: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate growth percentages
    const currentRevenue = revenueStats[0]?.totalRevenue || 0;
    const previousRevenue = previousPeriodStats[0]?.totalRevenue || 0;
    const revenueGrowth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    const currentInvoiceCount = revenueStats[0]?.count || 0;
    const previousInvoiceCount = previousPeriodStats[0]?.count || 0;
    const invoiceGrowth = previousInvoiceCount > 0 
      ? ((currentInvoiceCount - previousInvoiceCount) / previousInvoiceCount) * 100 
      : 0;

    // Format response
    const analytics = {
      overview: {
        totalRevenue: currentRevenue,
        revenueGrowth,
        totalInvoices: currentInvoiceCount,
        invoiceGrowth,
        paidRevenue: revenueStats[0]?.paidRevenue || 0,
        pendingRevenue: revenueStats[0]?.pendingRevenue || 0,
        overdueRevenue: revenueStats[0]?.overdueRevenue || 0,
        averageInvoiceValue: revenueStats[0]?.averageInvoiceValue || 0,
        totalCustomers: customerStats[0]?.totalCustomers || 0,
        activeCustomers: customerStats[0]?.activeCustomers || 0,
        totalOutstanding: customerStats[0]?.totalOutstanding || 0,
        collectionRate: currentRevenue > 0 
          ? ((revenueStats[0]?.paidRevenue || 0) / currentRevenue) * 100 
          : 0
      },
      trends: {
        monthly: monthlyTrends.map(trend => ({
          month: `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`,
          revenue: trend.revenue,
          invoiceCount: trend.invoiceCount,
          paidRevenue: trend.paidRevenue,
          collectionRate: trend.revenue > 0 ? (trend.paidRevenue / trend.revenue) * 100 : 0
        }))
      },
      distribution: {
        byStatus: invoiceStats.map(stat => ({
          status: stat._id,
          count: stat.count,
          totalAmount: stat.totalAmount
        })),
        overdue: overdueAnalysis
      },
      topCustomers: topCustomers.map(customer => ({
        id: customer._id,
        name: customer.customer.name,
        email: customer.customer.email,
        totalRevenue: customer.totalRevenue,
        invoiceCount: customer.invoiceCount,
        lastInvoiceDate: customer.lastInvoiceDate
      })),
      recentActivity: recentActivity.map(invoice => ({
        id: invoice._id,
        invoiceNo: invoice.invoiceNo,
        customerName: invoice.customerId.name,
        total: invoice.total,
        status: invoice.status,
        createdAt: invoice.createdAt
      }))
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
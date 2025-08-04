import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Invoice } from "@/models/Invoice";
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
    const period = searchParams.get("period") || "year"; // year, quarter, month, week
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    let groupBy: any;
    let matchCondition: any = { orgId: user.orgId };

    // Set up grouping and date filtering based on period
    switch (period) {
      case "year":
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        };
        matchCondition.createdAt = {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1)
        };
        break;
      case "quarter":
        const quarter = parseInt(searchParams.get("quarter") || "1");
        const quarterStart = new Date(year, (quarter - 1) * 3, 1);
        const quarterEnd = new Date(year, quarter * 3, 1);
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          week: { $week: "$createdAt" }
        };
        matchCondition.createdAt = { $gte: quarterStart, $lt: quarterEnd };
        break;
      case "month":
        const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" }
        };
        matchCondition.createdAt = {
          $gte: new Date(year, month - 1, 1),
          $lt: new Date(year, month, 1)
        };
        break;
      case "week":
        const weekStart = new Date(searchParams.get("startDate") || new Date().toISOString());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" }
        };
        matchCondition.createdAt = { $gte: weekStart, $lt: weekEnd };
        break;
    }

    // Revenue trends aggregation
    const revenueTrends = await Invoice.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: groupBy,
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
          invoiceCount: { $sum: 1 },
          paidCount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] }
          },
          averageValue: { $avg: "$total" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    // Revenue by customer aggregation
    const revenueByCustomer = await Invoice.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$customerId",
          totalRevenue: { $sum: "$total" },
          paidRevenue: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] }
          },
          invoiceCount: { $sum: 1 },
          averageInvoiceValue: { $avg: "$total" },
          lastInvoiceDate: { $max: "$createdAt" }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customer"
        }
      },
      { $unwind: "$customer" },
      {
        $project: {
          customerId: "$_id",
          customerName: "$customer.name",
          customerEmail: "$customer.email",
          totalRevenue: 1,
          paidRevenue: 1,
          invoiceCount: 1,
          averageInvoiceValue: 1,
          lastInvoiceDate: 1,
          collectionRate: {
            $cond: [
              { $gt: ["$totalRevenue", 0] },
              { $multiply: [{ $divide: ["$paidRevenue", "$totalRevenue"] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    // Revenue by service/item analysis
    const revenueByService = await Invoice.aggregate([
      { $match: matchCondition },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.description",
          totalRevenue: { $sum: "$items.amount" },
          totalQuantity: { $sum: "$items.pageQty" },
          averageRate: { $avg: "$items.rate" },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 15 }
    ]);

    // Payment patterns analysis
    const paymentPatterns = await Invoice.aggregate([
      {
        $match: {
          ...matchCondition,
          status: "paid"
        }
      },
      {
        $addFields: {
          paymentDelay: {
            $divide: [
              { $subtract: ["$updatedAt", "$dueDate"] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lte: ["$paymentDelay", 0] }, then: "On Time" },
                { case: { $lte: ["$paymentDelay", 7] }, then: "1-7 days late" },
                { case: { $lte: ["$paymentDelay", 30] }, then: "8-30 days late" }
              ],
              default: "30+ days late"
            }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          averageDelay: { $avg: "$paymentDelay" }
        }
      }
    ]);

    // Seasonal analysis (if yearly period)
    let seasonalAnalysis = [];
    if (period === "year") {
      seasonalAnalysis = await Invoice.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: {
              quarter: {
                $switch: {
                  branches: [
                    { case: { $lte: [{ $month: "$createdAt" }, 3] }, then: "Q1" },
                    { case: { $lte: [{ $month: "$createdAt" }, 6] }, then: "Q2" },
                    { case: { $lte: [{ $month: "$createdAt" }, 9] }, then: "Q3" }
                  ],
                  default: "Q4"
                }
              }
            },
            totalRevenue: { $sum: "$total" },
            invoiceCount: { $sum: 1 },
            averageValue: { $avg: "$total" }
          }
        },
        { $sort: { "_id.quarter": 1 } }
      ]);
    }

    // Calculate summary statistics
    const totalRevenue = revenueTrends.reduce((sum, trend) => sum + trend.totalRevenue, 0);
    const totalPaid = revenueTrends.reduce((sum, trend) => sum + trend.paidRevenue, 0);
    const totalInvoices = revenueTrends.reduce((sum, trend) => sum + trend.invoiceCount, 0);

    const analytics = {
      summary: {
        totalRevenue,
        totalPaid,
        totalPending: revenueTrends.reduce((sum, trend) => sum + trend.pendingRevenue, 0),
        totalOverdue: revenueTrends.reduce((sum, trend) => sum + trend.overdueRevenue, 0),
        totalInvoices,
        averageInvoiceValue: totalInvoices > 0 ? totalRevenue / totalInvoices : 0,
        collectionRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0
      },
      trends: revenueTrends.map(trend => ({
        period: trend._id,
        totalRevenue: trend.totalRevenue,
        paidRevenue: trend.paidRevenue,
        pendingRevenue: trend.pendingRevenue,
        overdueRevenue: trend.overdueRevenue,
        invoiceCount: trend.invoiceCount,
        paidCount: trend.paidCount,
        averageValue: trend.averageValue,
        collectionRate: trend.totalRevenue > 0 ? (trend.paidRevenue / trend.totalRevenue) * 100 : 0
      })),
      byCustomer: revenueByCustomer,
      byService: revenueByService.map(service => ({
        service: service._id,
        totalRevenue: service.totalRevenue,
        totalQuantity: service.totalQuantity,
        averageRate: service.averageRate,
        invoiceCount: service.invoiceCount
      })),
      paymentPatterns: paymentPatterns.map(pattern => ({
        category: pattern._id,
        count: pattern.count,
        totalAmount: pattern.totalAmount,
        averageDelay: pattern.averageDelay
      })),
      seasonal: seasonalAnalysis.map(season => ({
        quarter: season._id.quarter,
        totalRevenue: season.totalRevenue,
        invoiceCount: season.invoiceCount,
        averageValue: season.averageValue
      }))
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
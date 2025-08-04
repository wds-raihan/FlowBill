import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Invoice } from "@/models/Invoice";
import { Customer } from "@/models/Customer";
import { User } from "@/models/User";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

// PDF Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 30,
  },
  header: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 5,
  },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableColHeader: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f0f0f0",
    padding: 5,
  },
  tableCol: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: "bold",
  },
  tableCell: {
    fontSize: 9,
  },
  summary: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: {
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
  },
});

// PDF Report Component
const ReportPDF = ({ data, period, year }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Revenue Report - {year} ({period})</Text>
      
      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Revenue:</Text>
            <Text>${data.summary.totalRevenue.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Paid:</Text>
            <Text>${data.summary.totalPaid.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Collection Rate:</Text>
            <Text>{data.summary.collectionRate.toFixed(1)}%</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Invoice Value:</Text>
            <Text>${data.summary.averageInvoiceValue.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Invoices:</Text>
            <Text>{data.summary.totalInvoices}</Text>
          </View>
        </View>
      </View>

      {/* Top Customers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top 10 Customers by Revenue</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Customer</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Revenue</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Invoices</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Collection Rate</Text>
            </View>
          </View>
          {data.byCustomer.slice(0, 10).map((customer: any, index: number) => (
            <View style={styles.tableRow} key={index}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{customer.customerName}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>${customer.totalRevenue.toFixed(2)}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{customer.invoiceCount}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{customer.collectionRate.toFixed(1)}%</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Revenue by Service */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue by Service</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Service</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Revenue</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Quantity</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Avg Rate</Text>
            </View>
          </View>
          {data.byService.slice(0, 10).map((service: any, index: number) => (
            <View style={styles.tableRow} key={index}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{service.service}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>${service.totalRevenue.toFixed(2)}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{service.totalQuantity}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>${service.averageRate.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.footer}>
        Generated on {new Date().toLocaleDateString()} • Revenue Report
      </Text>
    </Page>
  </Document>
);

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
    const period = searchParams.get("period") || "year";
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const format = searchParams.get("format") || "pdf";

    // Build date filter based on period
    let matchCondition: any = { orgId: user.orgId };
    
    switch (period) {
      case "year":
        matchCondition.createdAt = {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1)
        };
        break;
      case "quarter":
        const quarter = parseInt(searchParams.get("quarter") || "1");
        const quarterStart = new Date(year, (quarter - 1) * 3, 1);
        const quarterEnd = new Date(year, quarter * 3, 1);
        matchCondition.createdAt = { $gte: quarterStart, $lt: quarterEnd };
        break;
      case "month":
        const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
        matchCondition.createdAt = {
          $gte: new Date(year, month - 1, 1),
          $lt: new Date(year, month, 1)
        };
        break;
    }

    // Fetch analytics data
    const [summaryData, customerData, serviceData] = await Promise.all([
      // Summary statistics
      Invoice.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            totalPaid: {
              $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] }
            },
            totalInvoices: { $sum: 1 },
            averageInvoiceValue: { $avg: "$total" }
          }
        }
      ]),

      // Top customers
      Invoice.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: "$customerId",
            totalRevenue: { $sum: "$total" },
            paidRevenue: {
              $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] }
            },
            invoiceCount: { $sum: 1 }
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
            customerName: "$customer.name",
            customerEmail: "$customer.email",
            totalRevenue: 1,
            paidRevenue: 1,
            invoiceCount: 1,
            collectionRate: {
              $cond: [
                { $gt: ["$totalRevenue", 0] },
                { $multiply: [{ $divide: ["$paidRevenue", "$totalRevenue"] }, 100] },
                0
              ]
            }
          }
        }
      ]),

      // Revenue by service
      Invoice.aggregate([
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
        { $limit: 15 },
        {
          $project: {
            service: "$_id",
            totalRevenue: 1,
            totalQuantity: 1,
            averageRate: 1,
            invoiceCount: 1
          }
        }
      ])
    ]);

    const summary = summaryData[0] || {
      totalRevenue: 0,
      totalPaid: 0,
      totalInvoices: 0,
      averageInvoiceValue: 0
    };

    summary.collectionRate = summary.totalRevenue > 0 
      ? (summary.totalPaid / summary.totalRevenue) * 100 
      : 0;

    const reportData = {
      summary,
      byCustomer: customerData,
      byService: serviceData
    };

    if (format === "csv") {
      // Generate CSV
      let csv = "Revenue Report\n\n";
      
      // Summary
      csv += "Summary\n";
      csv += `Total Revenue,${summary.totalRevenue.toFixed(2)}\n`;
      csv += `Total Paid,${summary.totalPaid.toFixed(2)}\n`;
      csv += `Collection Rate,${summary.collectionRate.toFixed(1)}%\n`;
      csv += `Average Invoice Value,${summary.averageInvoiceValue.toFixed(2)}\n`;
      csv += `Total Invoices,${summary.totalInvoices}\n\n`;

      // Top Customers
      csv += "Top Customers by Revenue\n";
      csv += "Customer,Email,Revenue,Invoices,Collection Rate\n";
      customerData.forEach((customer: any) => {
        csv += `"${customer.customerName}","${customer.customerEmail}",${customer.totalRevenue.toFixed(2)},${customer.invoiceCount},${customer.collectionRate.toFixed(1)}%\n`;
      });

      csv += "\nRevenue by Service\n";
      csv += "Service,Revenue,Quantity,Average Rate\n";
      serviceData.forEach((service: any) => {
        csv += `"${service.service}",${service.totalRevenue.toFixed(2)},${service.totalQuantity},${service.averageRate.toFixed(2)}\n`;
      });

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="revenue-report-${year}-${period}.csv"`,
        },
      });
    } else {
      // Generate PDF
      const pdfBuffer = await pdf(
        <ReportPDF data={reportData} period={period} year={year} />
      ).toBuffer();

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="revenue-report-${year}-${period}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
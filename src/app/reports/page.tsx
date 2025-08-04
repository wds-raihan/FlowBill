"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  DollarSign,
  Users,
  FileText,
  PieChart,
  Activity,
  Filter
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface RevenueAnalytics {
  summary: {
    totalRevenue: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    totalInvoices: number;
    averageInvoiceValue: number;
    collectionRate: number;
  };
  trends: Array<{
    period: any;
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    overdueRevenue: number;
    invoiceCount: number;
    paidCount: number;
    averageValue: number;
    collectionRate: number;
  }>;
  byCustomer: Array<{
    customerId: string;
    customerName: string;
    customerEmail: string;
    totalRevenue: number;
    paidRevenue: number;
    invoiceCount: number;
    averageInvoiceValue: number;
    lastInvoiceDate: string;
    collectionRate: number;
  }>;
  byService: Array<{
    service: string;
    totalRevenue: number;
    totalQuantity: number;
    averageRate: number;
    invoiceCount: number;
  }>;
  paymentPatterns: Array<{
    category: string;
    count: number;
    totalAmount: number;
    averageDelay: number;
  }>;
  seasonal: Array<{
    quarter: string;
    totalRevenue: number;
    invoiceCount: number;
    averageValue: number;
  }>;
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("year");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, period, year]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        year,
      });

      const response = await fetch(`/api/analytics/revenue?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load reports data");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'csv') => {
    try {
      const params = new URLSearchParams({
        period,
        year,
        format,
      });

      const response = await fetch(`/api/reports/export?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to export report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue-report-${year}-${period}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export report");
    }
  };

  const formatPeriodLabel = (periodData: any) => {
    if (period === "year") {
      return `${periodData.year}-${String(periodData.month).padStart(2, '0')}`;
    } else if (period === "month") {
      return `${periodData.year}-${String(periodData.month).padStart(2, '0')}-${String(periodData.day).padStart(2, '0')}`;
    }
    return JSON.stringify(periodData);
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to view reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive business insights and revenue analysis
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">Yearly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const yearOption = (new Date().getFullYear() - i).toString();
                return (
                  <SelectItem key={yearOption} value={yearOption}>
                    {yearOption}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => exportReport('pdf')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport('csv')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analytics ? (
        <>
          {/* Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.summary.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.summary.totalInvoices} invoices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.summary.collectionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics.summary.totalPaid)} collected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Invoice Value</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.summary.averageInvoiceValue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per invoice
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.summary.totalPending + analytics.summary.totalOverdue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics.summary.totalOverdue)} overdue
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Detailed Reports */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="trends" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
                <TabsTrigger value="customers">Top Customers</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="payments">Payment Patterns</TabsTrigger>
                <TabsTrigger value="seasonal">Seasonal Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="trends" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Revenue Trends
                    </CardTitle>
                    <CardDescription>
                      Revenue performance over the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.trends.map((trend, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {formatPeriodLabel(trend.period)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {trend.invoiceCount} invoices • {trend.collectionRate.toFixed(1)}% collected
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {formatCurrency(trend.totalRevenue)}
                            </div>
                            <div className="text-sm text-green-600">
                              {formatCurrency(trend.paidRevenue)} paid
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="customers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Top Customers by Revenue
                    </CardTitle>
                    <CardDescription>
                      Your highest value customers in the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.byCustomer.slice(0, 15).map((customer, index) => (
                        <div key={customer.customerId} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                              {customer.customerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{customer.customerName}</div>
                              <div className="text-sm text-gray-500">
                                {customer.customerEmail} • {customer.invoiceCount} invoices
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {formatCurrency(customer.totalRevenue)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {customer.collectionRate.toFixed(1)}% collected
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="services" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Revenue by Service
                    </CardTitle>
                    <CardDescription>
                      Breakdown of revenue by service type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.byService.map((service, index) => (
                        <div key={service.service} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <div className="font-medium">{service.service}</div>
                              <div className="text-sm text-gray-500">
                                {service.totalQuantity} units • {service.invoiceCount} invoices
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {formatCurrency(service.totalRevenue)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Avg: {formatCurrency(service.averageRate)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Payment Patterns
                    </CardTitle>
                    <CardDescription>
                      Analysis of payment timing and behavior
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.paymentPatterns.map((pattern, index) => (
                        <div key={pattern.category} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              pattern.category === "On Time" 
                                ? "bg-green-100 dark:bg-green-900/20" 
                                : "bg-red-100 dark:bg-red-900/20"
                            }`}>
                              <Calendar className={`w-5 h-5 ${
                                pattern.category === "On Time" 
                                  ? "text-green-600 dark:text-green-400" 
                                  : "text-red-600 dark:text-red-400"
                              }`} />
                            </div>
                            <div>
                              <div className="font-medium">{pattern.category}</div>
                              <div className="text-sm text-gray-500">
                                {pattern.count} payments
                                {pattern.averageDelay > 0 && (
                                  <span> • Avg delay: {pattern.averageDelay.toFixed(1)} days</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {formatCurrency(pattern.totalAmount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seasonal" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Seasonal Analysis
                    </CardTitle>
                    <CardDescription>
                      Quarterly revenue patterns and trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.seasonal.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {analytics.seasonal.map((quarter) => (
                          <div key={quarter.quarter} className="p-4 border rounded-lg text-center">
                            <div className="text-lg font-bold mb-2">{quarter.quarter}</div>
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                              {formatCurrency(quarter.totalRevenue)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {quarter.invoiceCount} invoices
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Avg: {formatCurrency(quarter.averageValue)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-2" />
                        <p>No seasonal data available for the selected period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No data available</h3>
          <p className="text-gray-600 mb-4">
            Start by creating invoices to see detailed reports and analytics.
          </p>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Plus, 
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface AnalyticsOverview {
  overview: {
    totalRevenue: number;
    revenueGrowth: number;
    totalInvoices: number;
    invoiceGrowth: number;
    paidRevenue: number;
    pendingRevenue: number;
    overdueRevenue: number;
    averageInvoiceValue: number;
    totalCustomers: number;
    activeCustomers: number;
    totalOutstanding: number;
    collectionRate: number;
  };
  trends: {
    monthly: Array<{
      month: string;
      revenue: number;
      invoiceCount: number;
      paidRevenue: number;
      collectionRate: number;
    }>;
  };
  distribution: {
    byStatus: Array<{
      status: string;
      count: number;
      totalAmount: number;
    }>;
    overdue: Array<{
      _id: string;
      count: number;
      totalAmount: number;
    }>;
  };
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    totalRevenue: number;
    invoiceCount: number;
    lastInvoiceDate: string;
  }>;
  recentActivity: Array<{
    id: string;
    invoiceNo: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/overview?period=${period}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-600 bg-green-100";
      case "sent":
        return "text-blue-600 bg-blue-100";
      case "overdue":
        return "text-red-600 bg-red-100";
      case "draft":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        <span className="text-xs font-medium">
          {Math.abs(growth).toFixed(1)}%
        </span>
      </div>
    );
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to view the dashboard.</p>
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
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back, {session.user?.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/invoices/create">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Invoice
            </Button>
          </Link>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(8)].map((_, i) => (
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
          {/* Key Metrics */}
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
                  {formatCurrency(analytics.overview.totalRevenue)}
                </div>
                {formatGrowth(analytics.overview.revenueGrowth)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.overview.totalInvoices}
                </div>
                {formatGrowth(analytics.overview.invoiceGrowth)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.overview.collectionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics.overview.paidRevenue)} collected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.overview.totalOutstanding)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics.overview.overdueRevenue)} overdue
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Secondary Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Invoice Value</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.overview.averageInvoiceValue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per invoice
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.overview.activeCustomers}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {analytics.overview.totalCustomers} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.overview.pendingRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting payment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Revenue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(analytics.overview.overdueRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Detailed Analytics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="customers">Top Customers</TabsTrigger>
                <TabsTrigger value="status">Status Breakdown</TabsTrigger>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue Trends */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Revenue Trends
                      </CardTitle>
                      <CardDescription>
                        Monthly revenue over the last 12 months
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analytics.trends.monthly.slice(-6).map((trend, index) => (
                          <div key={trend.month} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium">
                                {new Date(trend.month + "-01").toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(trend.revenue)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {trend.invoiceCount} invoices
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Overdue Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Overdue Analysis
                      </CardTitle>
                      <CardDescription>
                        Breakdown of overdue invoices by age
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analytics.distribution.overdue.length > 0 ? (
                          analytics.distribution.overdue.map((item) => (
                            <div key={item._id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="text-sm font-medium">{item._id}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {formatCurrency(item.totalAmount)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.count} invoice{item.count !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                            <p>No overdue invoices!</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
                      {analytics.topCustomers.slice(0, 10).map((customer, index) => (
                        <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.email}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(customer.totalRevenue)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {customer.invoiceCount} invoice{customer.invoiceCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="status" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Invoice Status Distribution
                    </CardTitle>
                    <CardDescription>
                      Breakdown of invoices by current status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {analytics.distribution.byStatus.map((status) => (
                        <div key={status.status} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getStatusColor(status.status)}>
                              {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                            </Badge>
                            <span className="text-sm font-medium">{status.count}</span>
                          </div>
                          <div className="text-lg font-bold">
                            {formatCurrency(status.totalAmount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Avg: {formatCurrency(status.totalAmount / status.count)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>
                      Latest invoice activity and updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="font-medium">
                                Invoice {activity.invoiceNo}
                              </div>
                              <div className="text-sm text-gray-500">
                                {activity.customerName} • {formatDate(activity.createdAt, "short")}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(activity.total)}
                            </div>
                            <Badge className={getStatusColor(activity.status)}>
                              {activity.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No data available</h3>
          <p className="text-gray-600 mb-4">
            Start by creating your first invoice to see analytics.
          </p>
          <Link href="/invoices/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
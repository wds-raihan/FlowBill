"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, Users, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { useModal } from "@/stores/uiStore";
import { toast } from "sonner";

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  averageOrderValue: number;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  lastInvoiceDate?: string;
  isActive: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const customerFormModal = useModal("customer-form");

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
        status: statusFilter,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      const response = await fetch(`/api/customers?${params}`);
      if (!response.ok) throw new Error("Failed to fetch customers");

      const data = await response.json();
      setCustomers(data.customers);
      setTotalPages(data.pagination.totalPages);

      // Calculate stats
      const totalCustomers = data.pagination.total;
      const activeCustomers = data.customers.filter((c: Customer) => c.isActive).length;
      const totalRevenue = data.customers.reduce((sum: number, c: Customer) => sum + c.totalPaid, 0);
      const averageOrderValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

      setStats({
        totalCustomers,
        activeCustomers,
        totalRevenue,
        averageOrderValue,
      });
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchCustomers();
    }
  }, [session, currentPage, searchTerm, statusFilter]);

  const handleCreateCustomer = () => {
    customerFormModal.open({ mode: "create" });
  };

  const handleEditCustomer = (customer: Customer) => {
    customerFormModal.open({ mode: "edit", customer });
  };

  const handleCustomerSaved = () => {
    fetchCustomers();
    customerFormModal.close();
    toast.success("Customer saved successfully");
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete customer");

      const data = await response.json();
      toast.success(data.message);
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to view customers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Customers
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your customer relationships and track their activity
            </p>
          </div>
          <Button onClick={handleCreateCustomer} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeCustomers} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                From all customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.averageOrderValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per customer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${customers.reduce((sum, c) => sum + c.outstandingBalance, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Unpaid invoices
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Customer Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <CustomerTable
          customers={customers}
          loading={loading}
          onEdit={handleEditCustomer}
          onDelete={handleDeleteCustomer}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </motion.div>

      {/* Customer Form Modal */}
      <CustomerForm
        isOpen={customerFormModal.isOpen}
        onClose={customerFormModal.close}
        onSave={handleCustomerSaved}
        customer={customerFormModal.data?.customer}
        mode={customerFormModal.data?.mode || "create"}
      />
    </div>
  );
}
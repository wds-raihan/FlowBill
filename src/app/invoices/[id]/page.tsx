"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Calendar,
  User,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Invoice {
  _id: string;
  invoiceNo: string;
  customerId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  orgId: {
    _id: string;
    name: string;
    email: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  issueDate: string;
  dueDate: string;
  items: Array<{
    description: string;
    pageQty: number;
    serviceCharge: number;
    rate: number;
    amount: number;
  }>;
  subTotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  status: "draft" | "sent" | "paid" | "overdue";
  createdAt: string;
  updatedAt: string;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoices/${invoiceId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch invoice");
        }

        const data = await response.json();
        setInvoice(data);
      } catch (error) {
        console.error("Error fetching invoice:", error);
        toast.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice?.invoiceNo || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const handleSendInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to send invoice");

      toast.success("Invoice sent successfully");
      // Refresh invoice data
      window.location.reload();
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice");
    }
  };

  const handleDeleteInvoice = async () => {
    if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete invoice");

      toast.success("Invoice deleted successfully");
      router.push("/invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: "secondary", className: "text-gray-600 bg-gray-100" },
      sent: { variant: "default", className: "text-blue-600 bg-blue-100" },
      paid: { variant: "default", className: "text-green-600 bg-green-100" },
      overdue: { variant: "destructive", className: "text-red-600 bg-red-100" },
    } as const;

    const config = variants[status as keyof typeof variants] || variants.draft;

    return (
      <Badge className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== "paid" && new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Loading Invoice</h3>
                <p className="text-gray-600">Please wait while we fetch the invoice details...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Invoice Not Found</h3>
              <p className="text-gray-600 mb-4">
                The invoice you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link href="/invoices">
                <Button>Back to Invoices</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/invoices">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Invoices
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {invoice.invoiceNo}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(invoice.status)}
                {isOverdue(invoice.dueDate, invoice.status) && (
                  <Badge variant="destructive">Overdue</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            
            {invoice.status === "draft" && (
              <Button
                onClick={handleSendInvoice}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Invoice
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/invoices/edit/${invoice._id}`}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Invoice
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDeleteInvoice}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Invoice Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{invoice.orgId.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {invoice.orgId.address && (
                        <div className="text-sm">
                          {invoice.orgId.address.street && <div>{invoice.orgId.address.street}</div>}
                          <div>
                            {[
                              invoice.orgId.address.city,
                              invoice.orgId.address.state,
                              invoice.orgId.address.zipCode
                            ].filter(Boolean).join(", ")}
                          </div>
                          {invoice.orgId.address.country && <div>{invoice.orgId.address.country}</div>}
                        </div>
                      )}
                      <div className="mt-1">{invoice.orgId.email}</div>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{invoice.invoiceNo}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Invoice Date: {formatDate(invoice.issueDate)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Due Date: {formatDate(invoice.dueDate)}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Customer Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Bill To
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="font-medium text-lg">{invoice.customerId.name}</div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    {invoice.customerId.email}
                  </div>
                  {invoice.customerId.phone && (
                    <div className="text-gray-600 dark:text-gray-400">
                      {invoice.customerId.phone}
                    </div>
                  )}
                  {invoice.customerId.address && (
                    <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <div>
                        {invoice.customerId.address.street && <div>{invoice.customerId.address.street}</div>}
                        <div>
                          {[
                            invoice.customerId.address.city,
                            invoice.customerId.address.state,
                            invoice.customerId.address.zipCode
                          ].filter(Boolean).join(", ")}
                        </div>
                        {invoice.customerId.address.country && <div>{invoice.customerId.address.country}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Invoice Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Invoice Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Page Qty</th>
                        <th className="text-right py-2">Service Charge</th>
                        <th className="text-right py-2">Rate</th>
                        <th className="text-right py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3">{item.description}</td>
                          <td className="text-right py-3">{item.pageQty}</td>
                          <td className="text-right py-3">{formatCurrency(item.serviceCharge)}</td>
                          <td className="text-right py-3">{formatCurrency(item.rate)}</td>
                          <td className="text-right py-3 font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(invoice.subTotal)}</span>
                  </div>
                  {invoice.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatCurrency(invoice.tax)}</span>
                    </div>
                  )}
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(invoice.discount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notes */}
          {invoice.notes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {invoice.notes}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invoice Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(invoice.total)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Amount
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="flex justify-between">
                    <span>Issue Date:</span>
                    <span>{formatDate(invoice.issueDate, "short")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Due Date:</span>
                    <span className={isOverdue(invoice.dueDate, invoice.status) ? "text-red-600" : ""}>
                      {formatDate(invoice.dueDate, "short")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{formatDate(invoice.createdAt, "short")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleDownloadPDF}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                
                {invoice.status === "draft" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleSendInvoice}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send to Customer
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={`/invoices/edit/${invoice._id}`}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Invoice
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
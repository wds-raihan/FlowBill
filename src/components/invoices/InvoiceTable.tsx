"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Edit, 
  Trash2, 
  Download, 
  Send, 
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileText,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

interface Invoice {
  _id: string;
  invoiceNo: string;
  customerId: {
    _id: string;
    name: string;
    email: string;
  };
  issueDate: string;
  dueDate: string;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue";
  createdAt: string;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  loading: boolean;
  onDelete: (invoiceId: string) => void;
  onSend: (invoiceId: string) => void;
  onDownload: (invoiceId: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function InvoiceTable({
  invoices,
  loading,
  onDelete,
  onSend,
  onDownload,
  currentPage,
  totalPages,
  onPageChange,
}: InvoiceTableProps) {
  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      sent: "default",
      paid: "default",
      overdue: "destructive",
    } as const;

    const colors = {
      draft: "text-gray-600 bg-gray-100",
      sent: "text-blue-600 bg-blue-100",
      paid: "text-green-600 bg-green-100",
      overdue: "text-red-600 bg-red-100",
    } as const;

    return (
      <Badge 
        variant={variants[status as keyof typeof variants] || "secondary"}
        className={colors[status as keyof typeof colors]}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== "paid" && new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-8 w-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
              <FileText className="w-full h-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No invoices found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Get started by creating your first invoice.
            </p>
            <Link href="/invoices/create">
              <Button>Create Invoice</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Invoice
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Issue Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Due Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, index) => (
                    <motion.tr
                      key={invoice._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-medium">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <Link 
                              href={`/invoices/${invoice._id}`}
                              className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600"
                            >
                              {invoice.invoiceNo}
                            </Link>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Created {formatDate(invoice.createdAt, "short")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {invoice.customerId.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice.customerId.email}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(invoice.total)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(invoice.issueDate, "short")}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className={`text-sm ${
                          isOverdue(invoice.dueDate, invoice.status)
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {formatDate(invoice.dueDate, "short")}
                          {isOverdue(invoice.dueDate, invoice.status) && (
                            <div className="text-xs">Overdue</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Link href={`/invoices/${invoice._id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDownload(invoice._id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/invoices/edit/${invoice._id}`}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              {invoice.status === "draft" && (
                                <DropdownMenuItem onClick={() => onSend(invoice._id)}>
                                  <Send className="w-4 h-4 mr-2" />
                                  Send
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => onDelete(invoice._id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {invoices.map((invoice, index) => (
              <motion.div
                key={invoice._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-medium">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <Link 
                        href={`/invoices/${invoice._id}`}
                        className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600"
                      >
                        {invoice.invoiceNo}
                      </Link>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {invoice.customerId.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invoice.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/invoices/${invoice._id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/invoices/edit/${invoice._id}`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDownload(invoice._id)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        {invoice.status === "draft" && (
                          <DropdownMenuItem onClick={() => onSend(invoice._id)}>
                            <Send className="w-4 h-4 mr-2" />
                            Send
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => onDelete(invoice._id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                    <span className="font-medium">{formatCurrency(invoice.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Issue Date:</span>
                    <span>{formatDate(invoice.issueDate, "short")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
                    <span className={
                      isOverdue(invoice.dueDate, invoice.status)
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : ''
                    }>
                      {formatDate(invoice.dueDate, "short")}
                      {isOverdue(invoice.dueDate, invoice.status) && " (Overdue)"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
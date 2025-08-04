"use client";

import { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  Row,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MoreHorizontal,
  Search,
  Download,
  Send,
  Copy,
  Trash2,
  Edit,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { SendInvoiceModal } from "@/components/invoices/SendInvoiceModal";
import { generatePDFToken } from "@/lib/pdf";

interface Invoice {
  _id: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue";
  customer: {
    _id: string;
    name: string;
    email: string;
  };
  total: number;
  pdfUrl?: string;
}

export function InvoiceTable() {
  const { data: session } = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoiceNo",
      header: "Invoice #",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.invoiceNo}</div>
      ),
    },
    {
      accessorKey: "customer.name",
      header: "Customer",
      cell: ({ row }) => <div>{row.original.customer.name}</div>,
    },
    {
      accessorKey: "issueDate",
      header: "Issue Date",
      cell: ({ row }) => (
        <div>{format(new Date(row.original.issueDate), "MMM dd, yyyy")}</div>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (
        <div>{format(new Date(row.original.dueDate), "MMM dd, yyyy")}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        let variant: "default" | "secondary" | "destructive" | "outline" =
          "default";

        switch (status) {
          case "draft":
            variant = "secondary";
            break;
          case "sent":
            variant = "default";
            break;
          case "paid":
            variant = "outline";
            break;
          case "overdue":
            variant = "destructive";
            break;
        }

        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <div className="text-right font-medium">
          ${row.original.total.toFixed(2)}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleDownload(row.original)}
              className="cursor-pointer"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleSendInvoice(row.original)}
              className="cursor-pointer"
            >
              <Send className="mr-2 h-4 w-4" />
              Send Invoice
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDuplicate(row.original)}
              className="cursor-pointer"
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleEdit(row.original)}
              className="cursor-pointer"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {row.original.status === "draft" && (
              <DropdownMenuItem
                onClick={() => handleDelete(row.original)}
                className="cursor-pointer text-red-500 focus:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: invoices,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (dateRange.from) {
        params.append("from", dateRange.from);
      }

      if (dateRange.to) {
        params.append("to", dateRange.to);
      }

      const response = await fetch(`/api/invoices?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      } else {
        toast.error("Failed to fetch invoices");
      }
    } catch (error) {
      toast.error("Failed to fetch invoices");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      // Generate a token for PDF access
      const token = await generatePDFToken(invoice._id);

      // Create download link
      const link = document.createElement("a");
      link.href = `/api/invoices/${invoice._id}/pdf?token=${token}`;
      link.download = `${invoice.invoiceNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error("Failed to download invoice");
      console.error(error);
    }
  };

  const handleSendInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsSendModalOpen(true);
  };

  const handleDuplicate = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice._id}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to duplicate invoice");
      }

      const newInvoice = await response.json();
      toast.success("Invoice duplicated successfully");

      // Navigate to edit page for the new invoice
      window.location.href = `/invoices/${newInvoice._id}/edit`;
    } catch (error) {
      toast.error("Failed to duplicate invoice");
      console.error(error);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    window.location.href = `/invoices/${invoice._id}/edit`;
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm("Are you sure you want to delete this invoice?")) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoice._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete invoice");
      }

      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch (error) {
      toast.error("Failed to delete invoice");
      console.error(error);
    }
  };

  const handleCreateNew = () => {
    window.location.href = "/invoices/create";
  };

  const applyFilters = () => {
    fetchInvoices();
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setDateRange({ from: "", to: "" });
    setTimeout(fetchInvoices, 0);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track your invoices
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter invoices by status and date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="from" className="text-sm font-medium">
                From Date
              </label>
              <Input
                id="from"
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="to" className="text-sm font-medium">
                To Date
              </label>
              <Input
                id="to"
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
              />
            </div>

            <div className="flex items-end space-x-2">
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>A list of all your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center py-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter invoices..."
                value={
                  (table.getColumn("invoiceNo")?.getFilterValue() as string) ??
                  ""
                }
                onChange={(event) =>
                  table
                    .getColumn("invoiceNo")
                    ?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No invoices found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedInvoice && (
        <SendInvoiceModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
          invoiceId={selectedInvoice._id}
          invoiceNo={selectedInvoice.invoiceNo}
          customerEmail={selectedInvoice.customer.email}
          customerName={selectedInvoice.customer.name}
        />
      )}
    </div>
  );
}

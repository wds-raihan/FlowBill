"use client";

import { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, Trash2, Plus, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  addressStreet: z.string().min(1, "Street is required"),
  addressCity: z.string().min(1, "City is required"),
  addressState: z.string().min(1, "State is required"),
  addressZipCode: z.string().min(1, "Zip code is required"),
  addressCountry: z.string().min(1, "Country is required"),
  taxId: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface Customer {
  _id: string;
  name: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  taxId?: string;
  createdAt: string;
  updatedAt: string;
}

export function CustomerTable() {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div>{row.original.email}</div>,
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.address.street}, {row.original.address.city},{" "}
          {row.original.address.state} {row.original.address.zipCode},{" "}
          {row.original.address.country}
        </div>
      ),
    },
    {
      accessorKey: "taxId",
      header: "Tax ID",
      cell: ({ row }) =>
        row.original.taxId ? (
          <Badge variant="secondary">{row.original.taxId}</Badge>
        ) : (
          <span className="text-muted-foreground">Not provided</span>
        ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48">
            <div className="flex flex-col space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => handleEdit(row.original)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-red-500 hover:text-red-700"
                onClick={() => handleDelete(row.original._id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ),
    },
  ];

  const table = useReactTable({
    data: customers,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        toast.error("Failed to fetch customers");
      }
    } catch (error) {
      toast.error("Failed to fetch customers");
      console.error(error);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    setIsLoading(true);
    try {
      const url =
        isEditing && currentCustomer
          ? `/api/customers/${currentCustomer._id}`
          : "/api/customers";

      const method = isEditing && currentCustomer ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          orgId: session?.user?.orgId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save customer");
      }

      toast.success(
        isEditing
          ? "Customer updated successfully"
          : "Customer created successfully"
      );

      reset();
      setIsEditing(false);
      setCurrentCustomer(null);
      fetchCustomers();
    } catch (error) {
      toast.error("Failed to save customer");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setCurrentCustomer(customer);
    setIsEditing(true);

    reset({
      name: customer.name,
      email: customer.email,
      addressStreet: customer.address.street,
      addressCity: customer.address.city,
      addressState: customer.address.state,
      addressZipCode: customer.address.zipCode,
      addressCountry: customer.address.country,
      taxId: customer.taxId || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) {
      return;
    }

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete customer");
      }

      toast.success("Customer deleted successfully");
      fetchCustomers();
    } catch (error) {
      toast.error("Failed to delete customer");
      console.error(error);
    }
  };

  const handleNewCustomer = () => {
    setCurrentCustomer(null);
    setIsEditing(true);
    reset();
  };

  const closeForm = () => {
    setIsEditing(false);
    setCurrentCustomer(null);
    reset();
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter customers..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <Button onClick={handleNewCustomer}>
          <Plus className="mr-2 h-4 w-4" />
          New Customer
        </Button>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  {currentCustomer ? "Edit Customer" : "Add New Customer"}
                </h3>
                <Button variant="ghost" onClick={closeForm}>
                  Cancel
                </Button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Name
                    </label>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="Customer name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="customer@example.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="addressStreet"
                      className="text-sm font-medium"
                    >
                      Street
                    </label>
                    <Input
                      id="addressStreet"
                      {...register("addressStreet")}
                      placeholder="123 Main St"
                    />
                    {errors.addressStreet && (
                      <p className="text-sm text-red-500">
                        {errors.addressStreet.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="addressCity"
                      className="text-sm font-medium"
                    >
                      City
                    </label>
                    <Input
                      id="addressCity"
                      {...register("addressCity")}
                      placeholder="New York"
                    />
                    {errors.addressCity && (
                      <p className="text-sm text-red-500">
                        {errors.addressCity.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="addressState"
                      className="text-sm font-medium"
                    >
                      State
                    </label>
                    <Input
                      id="addressState"
                      {...register("addressState")}
                      placeholder="NY"
                    />
                    {errors.addressState && (
                      <p className="text-sm text-red-500">
                        {errors.addressState.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="addressZipCode"
                      className="text-sm font-medium"
                    >
                      Zip Code
                    </label>
                    <Input
                      id="addressZipCode"
                      {...register("addressZipCode")}
                      placeholder="10001"
                    />
                    {errors.addressZipCode && (
                      <p className="text-sm text-red-500">
                        {errors.addressZipCode.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label
                      htmlFor="addressCountry"
                      className="text-sm font-medium"
                    >
                      Country
                    </label>
                    <Input
                      id="addressCountry"
                      {...register("addressCountry")}
                      placeholder="United States"
                    />
                    {errors.addressCountry && (
                      <p className="text-sm text-red-500">
                        {errors.addressCountry.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="taxId" className="text-sm font-medium">
                      Tax ID (Optional)
                    </label>
                    <Input
                      id="taxId"
                      {...register("taxId")}
                      placeholder="Tax ID"
                    />
                    {errors.taxId && (
                      <p className="text-sm text-red-500">
                        {errors.taxId.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Customer"}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            {table.getRowModel().rows?.length ? (
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
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

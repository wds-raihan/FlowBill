"use client";

import { useEffect, useState } from "react";
import { Control } from "react-hook-form";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Check, 
  Calendar, 
  User, 
  Mail, 
  MapPin, 
  Building,
  Search,
  Loader2
} from "lucide-react";
import { InvoiceFormData } from "./InvoiceFormSchema";
import { toast } from "sonner";

interface Customer {
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
  taxId?: string;
  totalInvoiced: number;
  outstandingBalance: number;
  isActive: boolean;
}

interface Step1CustomerProps {
  form: {
    control: Control<InvoiceFormData>;
    setValue: (name: keyof InvoiceFormData, value: any) => void;
    watch: (name: keyof InvoiceFormData) => any;
    trigger: (name: keyof InvoiceFormData) => Promise<boolean>;
    formState: { errors: any };
  };
}

export function Step1Customer({ form }: Step1CustomerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    taxId: "",
  });

  const selectedCustomerId = form.watch("customerId");
  const issueDate = form.watch("issueDate");
  const dueDate = form.watch("dueDate");

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Filter customers based on search term
    if (searchTerm) {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [customers, searchTerm]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/customers?status=active&limit=100");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      } else {
        throw new Error("Failed to fetch customers");
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) {
      toast.error("Name and email are required");
      return;
    }

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCustomer),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create customer");
      }

      const customer = await response.json();
      setCustomers((prev) => [customer, ...prev]);
      form.setValue("customerId", customer._id);
      setIsCreating(false);
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
        },
        taxId: "",
      });
      toast.success("Customer created successfully");
    } catch (error) {
      console.error("Error creating customer:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create customer");
    }
  };

  const selectedCustomer = customers.find((c) => c._id === selectedCustomerId);

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Customer Information
          </CardTitle>
          <CardDescription>
            Select an existing customer or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create New Customer</DialogTitle>
                    <DialogDescription>
                      Add a new customer to your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={newCustomer.name}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, name: e.target.value })
                          }
                          placeholder="Customer name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, email: e.target.value })
                          }
                          placeholder="customer@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newCustomer.phone}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, phone: e.target.value })
                        }
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Address</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Street"
                          value={newCustomer.address.street}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              address: { ...newCustomer.address, street: e.target.value }
                            })
                          }
                        />
                        <Input
                          placeholder="City"
                          value={newCustomer.address.city}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              address: { ...newCustomer.address, city: e.target.value }
                            })
                          }
                        />
                        <Input
                          placeholder="State"
                          value={newCustomer.address.state}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              address: { ...newCustomer.address, state: e.target.value }
                            })
                          }
                        />
                        <Input
                          placeholder="ZIP Code"
                          value={newCustomer.address.zipCode}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              address: { ...newCustomer.address, zipCode: e.target.value }
                            })
                          }
                        />
                      </div>
                      <Input
                        placeholder="Country"
                        value={newCustomer.address.country}
                        onChange={(e) =>
                          setNewCustomer({
                            ...newCustomer,
                            address: { ...newCustomer.address, country: e.target.value }
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input
                        id="taxId"
                        value={newCustomer.taxId}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, taxId: e.target.value })
                        }
                        placeholder="Tax identification number"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreating(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCustomer}>
                        Create Customer
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <Select
              value={selectedCustomerId || ""}
              onValueChange={(value) => form.setValue("customerId", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading customers...
                    </div>
                  </SelectItem>
                ) : filteredCustomers.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {searchTerm ? "No customers found" : "No customers available"}
                  </SelectItem>
                ) : (
                  filteredCustomers.map((customer) => (
                    <SelectItem key={customer._id} value={customer._id}>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                        {customer.outstandingBalance > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            ${customer.outstandingBalance.toFixed(2)} due
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.customerId && (
              <p className="text-sm text-red-600">
                {form.formState.errors.customerId.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Invoice Dates
          </CardTitle>
          <CardDescription>
            Set the issue date and due date for this invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date *</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate ? issueDate.toISOString().split('T')[0] : ''}
                onChange={(e) => form.setValue("issueDate", new Date(e.target.value))}
              />
              {form.formState.errors.issueDate && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.issueDate.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate ? dueDate.toISOString().split('T')[0] : ''}
                onChange={(e) => form.setValue("dueDate", new Date(e.target.value))}
              />
              {form.formState.errors.dueDate && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.dueDate.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Customer Details */}
      {selectedCustomer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Customer Details
                </span>
                <Check className="h-5 w-5 text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedCustomer.name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Email
                    </p>
                    <p className="font-medium">{selectedCustomer.email}</p>
                  </div>

                  {selectedCustomer.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedCustomer.phone}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {selectedCustomer.address && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Address
                      </p>
                      <div className="font-medium text-sm">
                        {selectedCustomer.address.street && (
                          <div>{selectedCustomer.address.street}</div>
                        )}
                        <div>
                          {[
                            selectedCustomer.address.city,
                            selectedCustomer.address.state,
                            selectedCustomer.address.zipCode
                          ].filter(Boolean).join(", ")}
                        </div>
                        {selectedCustomer.address.country && (
                          <div>{selectedCustomer.address.country}</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.taxId && (
                      <Badge variant="secondary">
                        Tax ID: {selectedCustomer.taxId}
                      </Badge>
                    )}
                    {selectedCustomer.outstandingBalance > 0 && (
                      <Badge variant="destructive">
                        ${selectedCustomer.outstandingBalance.toFixed(2)} Outstanding
                      </Badge>
                    )}
                    <Badge variant={selectedCustomer.isActive ? "default" : "secondary"}>
                      {selectedCustomer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
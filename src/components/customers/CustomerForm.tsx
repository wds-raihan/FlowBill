"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { X, Save, User, Mail, Phone, Globe, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  phone: z.string().max(20).optional().or(z.literal("")),
  website: z.string().max(255).optional().or(z.literal("")),
  taxId: z.string().max(50).optional().or(z.literal("")),
  address: z.object({
    street: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    state: z.string().optional().or(z.literal("")),
    zipCode: z.string().optional().or(z.literal("")),
    country: z.string().optional().or(z.literal("")),
  }),
  billingAddress: z.object({
    street: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    state: z.string().optional().or(z.literal("")),
    zipCode: z.string().optional().or(z.literal("")),
    country: z.string().optional().or(z.literal("")),
  }),
  notes: z.string().max(1000).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  useSameAddress: z.boolean().default(true),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  taxId?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  notes?: string;
  isActive: boolean;
}

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  customer?: Customer;
  mode: "create" | "edit";
}

export function CustomerForm({ isOpen, onClose, onSave, customer, mode }: CustomerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [useSameAddress, setUseSameAddress] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      website: "",
      taxId: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      billingAddress: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      notes: "",
      isActive: true,
      useSameAddress: true,
    },
  });

  const watchedAddress = watch("address");

  // Update billing address when main address changes and useSameAddress is true
  useEffect(() => {
    if (useSameAddress && watchedAddress) {
      setValue("billingAddress", watchedAddress);
    }
  }, [watchedAddress, useSameAddress, setValue]);

  // Reset form when modal opens/closes or customer changes
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && customer) {
        const hasDifferentBillingAddress = customer.billingAddress && 
          JSON.stringify(customer.address) !== JSON.stringify(customer.billingAddress);
        
        setUseSameAddress(!hasDifferentBillingAddress);
        
        reset({
          name: customer.name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          website: customer.website || "",
          taxId: customer.taxId || "",
          address: {
            street: customer.address?.street || "",
            city: customer.address?.city || "",
            state: customer.address?.state || "",
            zipCode: customer.address?.zipCode || "",
            country: customer.address?.country || "",
          },
          billingAddress: {
            street: customer.billingAddress?.street || customer.address?.street || "",
            city: customer.billingAddress?.city || customer.address?.city || "",
            state: customer.billingAddress?.state || customer.address?.state || "",
            zipCode: customer.billingAddress?.zipCode || customer.address?.zipCode || "",
            country: customer.billingAddress?.country || customer.address?.country || "",
          },
          notes: customer.notes || "",
          isActive: customer.isActive,
          useSameAddress: !hasDifferentBillingAddress,
        });
      } else {
        reset({
          name: "",
          email: "",
          phone: "",
          website: "",
          taxId: "",
          address: {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
          },
          billingAddress: {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
          },
          notes: "",
          isActive: true,
          useSameAddress: true,
        });
        setUseSameAddress(true);
      }
    }
  }, [isOpen, mode, customer, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    setIsLoading(true);

    try {
      // Remove useSameAddress from the data before sending
      const { useSameAddress: _, ...submitData } = data;

      // If using same address, copy address to billingAddress
      if (useSameAddress) {
        submitData.billingAddress = submitData.address;
      }

      const url = mode === "edit" ? `/api/customers/${customer?._id}` : "/api/customers";
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save customer");
      }

      toast.success(
        mode === "edit" ? "Customer updated successfully" : "Customer created successfully"
      );
      onSave();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save customer");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {mode === "edit" ? "Edit Customer" : "Add New Customer"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {mode === "edit" 
                ? "Update customer information and settings" 
                : "Create a new customer profile"
              }
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Essential customer details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Customer Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Enter customer name"
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="customer@example.com"
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      {...register("phone")}
                      placeholder="+1 (555) 123-4567"
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="website"
                      {...register("website")}
                      placeholder="https://example.com"
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.website && (
                    <p className="text-sm text-red-600">{errors.website.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    {...register("taxId")}
                    placeholder="Tax identification number"
                    disabled={isLoading}
                  />
                  {errors.taxId && (
                    <p className="text-sm text-red-600">{errors.taxId.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    {...register("isActive")}
                    disabled={isLoading}
                  />
                  <Label htmlFor="isActive">Active Customer</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address Information
              </CardTitle>
              <CardDescription>
                Customer's primary address details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address.street">Street Address</Label>
                  <Input
                    id="address.street"
                    {...register("address.street")}
                    placeholder="123 Main Street"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address.city">City</Label>
                  <Input
                    id="address.city"
                    {...register("address.city")}
                    placeholder="New York"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address.state">State/Province</Label>
                  <Input
                    id="address.state"
                    {...register("address.state")}
                    placeholder="NY"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address.zipCode">ZIP/Postal Code</Label>
                  <Input
                    id="address.zipCode"
                    {...register("address.zipCode")}
                    placeholder="10001"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address.country">Country</Label>
                  <Input
                    id="address.country"
                    {...register("address.country")}
                    placeholder="United States"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
              <CardDescription>
                Separate billing address if different from primary address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useSameAddress"
                  checked={useSameAddress}
                  onCheckedChange={setUseSameAddress}
                  disabled={isLoading}
                />
                <Label htmlFor="useSameAddress">Same as primary address</Label>
              </div>

              {!useSameAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="billingAddress.street">Street Address</Label>
                    <Input
                      id="billingAddress.street"
                      {...register("billingAddress.street")}
                      placeholder="123 Billing Street"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billingAddress.city">City</Label>
                    <Input
                      id="billingAddress.city"
                      {...register("billingAddress.city")}
                      placeholder="New York"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billingAddress.state">State/Province</Label>
                    <Input
                      id="billingAddress.state"
                      {...register("billingAddress.state")}
                      placeholder="NY"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billingAddress.zipCode">ZIP/Postal Code</Label>
                    <Input
                      id="billingAddress.zipCode"
                      {...register("billingAddress.zipCode")}
                      placeholder="10001"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billingAddress.country">Country</Label>
                    <Input
                      id="billingAddress.country"
                      {...register("billingAddress.country")}
                      placeholder="United States"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Additional Notes
              </CardTitle>
              <CardDescription>
                Any additional information about this customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Add any notes about this customer..."
                  className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  disabled={isLoading}
                />
                {errors.notes && (
                  <p className="text-sm text-red-600">{errors.notes.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isLoading 
                ? (mode === "edit" ? "Updating..." : "Creating...") 
                : (mode === "edit" ? "Update Customer" : "Create Customer")
              }
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
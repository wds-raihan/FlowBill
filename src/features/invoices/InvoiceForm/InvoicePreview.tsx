"use client";

import { Control } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InvoiceFormData } from "./invoiceFormSchema";
import { format } from "date-fns";
import { useEffect, useState } from "react";

interface InvoicePreviewProps {
  form: {
    control: Control<InvoiceFormData>;
    watch: (name: keyof InvoiceFormData) => any;
  };
}

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
}

interface Organization {
  _id: string;
  name: string;
  logoUrl?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    email: string;
    phone: string;
    website?: string;
  };
  taxId: string;
}

export function InvoicePreview({ form }: InvoicePreviewProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  const customerId = form.watch("customerId");
  const issueDate = form.watch("issueDate");
  const dueDate = form.watch("dueDate");
  const items = form.watch("items");
  const tax = form.watch("tax");
  const discount = form.watch("discount");
  const notes = form.watch("notes");

  useEffect(() => {
    if (customerId) {
      fetchCustomer(customerId);
    }
  }, [customerId]);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchCustomer = async (id: string) => {
    try {
      const response = await fetch(`/api/customers/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  };

  const fetchOrganization = async () => {
    try {
      const response = await fetch("/api/organizations/current");
      if (response.ok) {
        const data = await response.json();
        setOrganization(data);
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
    }
  };

  // Calculate totals
  const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const serviceCharges = items.reduce(
    (sum, item) => sum + item.serviceCharge,
    0
  );
  const total = subTotal + serviceCharges + tax - discount;

  // Generate invoice number (placeholder)
  const invoiceNo = "INV-2023-00001";

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Invoice Preview
          <Badge variant="outline">Draft</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            {organization?.logoUrl && (
              <div className="h-16 w-16 mb-2 bg-gray-100 rounded-md flex items-center justify-center">
                <span className="text-xs text-gray-500">Logo</span>
              </div>
            )}
            <h3 className="font-bold">
              {organization?.name || "Your Company"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {organization?.address.street}, {organization?.address.city},{" "}
              {organization?.address.state} {organization?.address.zipCode},{" "}
              {organization?.address.country}
            </p>
            <p className="text-sm text-muted-foreground">
              {organization?.contact.email} | {organization?.contact.phone}
            </p>
          </div>

          <div className="text-right">
            <h3 className="font-bold text-lg">INVOICE</h3>
            <p className="text-sm text-muted-foreground">
              <strong>Invoice #:</strong> {invoiceNo}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Date:</strong>{" "}
              {issueDate instanceof Date
                ? format(issueDate, "MMM dd, yyyy")
                : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Due:</strong>{" "}
              {dueDate instanceof Date ? format(dueDate, "MMM dd, yyyy") : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Bill To:</h4>
            {customer ? (
              <>
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm">{customer.email}</p>
                <p className="text-sm">
                  {customer.address.street}, {customer.address.city},{" "}
                  {customer.address.state} {customer.address.zipCode},{" "}
                  {customer.address.country}
                </p>
                {customer.taxId && (
                  <p className="text-sm">Tax ID: {customer.taxId}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No customer selected
              </p>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-2">Pay To:</h4>
            <p className="font-medium">
              {organization?.name || "Your Company"}
            </p>
            <p className="text-sm">
              {organization?.address.street}, {organization?.address.city},{" "}
              {organization?.address.state} {organization?.address.zipCode},{" "}
              {organization?.address.country}
            </p>
            <p className="text-sm">Tax ID: {organization?.taxId}</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Items:</h4>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Pages</th>
                  <th className="text-right p-2">Rate</th>
                  <th className="text-right p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">
                        <div>{item.description}</div>
                        {item.serviceCharge > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Service Charge: ${item.serviceCharge.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-right">{item.pageQty}</td>
                      <td className="p-2 text-right">
                        ${item.rate.toFixed(2)}
                      </td>
                      <td className="p-2 text-right">
                        ${item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-4 text-center text-muted-foreground"
                    >
                      No items added
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${subTotal.toFixed(2)}</span>
          </div>

          {serviceCharges > 0 && (
            <div className="flex justify-between">
              <span>Service Charges:</span>
              <span>${serviceCharges.toFixed(2)}</span>
            </div>
          )}

          {tax > 0 && (
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>${tax.toFixed(2)}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {notes && (
          <div>
            <h4 className="font-semibold mb-2">Notes:</h4>
            <p className="text-sm whitespace-pre-line">{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

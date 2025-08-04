"use client";

import { Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { InvoiceFormData } from "./invoiceFormSchema";

interface Step3SummaryProps {
  form: {
    control: Control<InvoiceFormData>;
    setValue: (name: keyof InvoiceFormData, value: any) => void;
    watch: (name: keyof InvoiceFormData) => any;
    trigger: (name: keyof InvoiceFormData) => Promise<boolean>;
  };
}

export function Step3Summary({ form }: Step3SummaryProps) {
  const issueDate = form.watch("issueDate");
  const dueDate = form.watch("dueDate");
  const tax = form.watch("tax");
  const discount = form.watch("discount");
  const notes = form.watch("notes");
  const items = form.watch("items");

  // Calculate totals
  const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const serviceCharges = items.reduce(
    (sum, item) => sum + item.serviceCharge,
    0
  );
  const total = subTotal + serviceCharges + tax - discount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="date"
                value={
                  issueDate instanceof Date
                    ? issueDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  form.setValue("issueDate", new Date(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={
                  dueDate instanceof Date
                    ? dueDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  form.setValue("dueDate", new Date(e.target.value))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax">Tax ($)</Label>
              <Input
                id="tax"
                type="number"
                min="0"
                step="0.01"
                value={tax}
                onChange={(e) => form.setValue("tax", Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount ($)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) =>
                  form.setValue("discount", Number(e.target.value))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes || ""}
              onChange={(e) => form.setValue("notes", e.target.value)}
              placeholder="Additional notes or payment instructions"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Service Charges:</span>
              <span>${serviceCharges.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Tax:</span>
              <span>${tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-${discount.toFixed(2)}</span>
            </div>

            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-medium">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { InvoiceStepper } from "@/features/invoices/InvoiceForm/InvoiceStepper";
import { InvoiceFormData } from "@/features/invoices/InvoiceForm/InvoiceFormSchema";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function EditInvoicePage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [initialData, setInitialData] = useState<Partial<InvoiceFormData> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoices/${invoiceId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch invoice");
        }

        const invoice = await response.json();
        
        // Transform the invoice data to match the form schema
        const formData: Partial<InvoiceFormData> = {
          customerId: invoice.customerId._id || invoice.customerId,
          issueDate: new Date(invoice.issueDate),
          dueDate: new Date(invoice.dueDate),
          items: invoice.items.map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            description: item.description,
            pageQty: item.pageQty,
            serviceCharge: item.serviceCharge,
            rate: item.rate,
            amount: item.amount,
          })),
          tax: invoice.tax,
          discount: invoice.discount,
          notes: invoice.notes || "",
        };

        setInitialData(formData);
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

  if (!initialData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Invoice Not Found</h3>
              <p className="text-gray-600">The invoice you're looking for doesn't exist or you don't have permission to edit it.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <InvoiceStepper initialData={initialData} invoiceId={invoiceId} />;
}
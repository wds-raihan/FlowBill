import { z } from "zod";

export const invoiceItemSchema = z
  .object({
    id: z.string(),
    description: z.string().min(1, "Description is required"),
    pageQty: z.number().min(0, "Page quantity must be 0 or greater"),
    serviceCharge: z.number().min(0, "Service charge must be 0 or greater"),
    rate: z.number().min(0, "Rate must be 0 or greater"),
    amount: z.number().min(0, "Amount must be 0 or greater"),
  })
  .refine((data) => data.amount === data.pageQty * data.rate, {
    message: "Amount must equal page quantity multiplied by rate",
    path: ["amount"],
  });

export const invoiceFormSchema = z
  .object({
    customerId: z.string().min(1, "Customer is required"),
    issueDate: z.date(),
    dueDate: z.date(),
    items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
    tax: z.number().min(0, "Tax must be 0 or greater"),
    discount: z.number().min(0, "Discount must be 0 or greater"),
    notes: z.string().optional(),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: "Due date must be on or after issue date",
    path: ["dueDate"],
  });

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>;

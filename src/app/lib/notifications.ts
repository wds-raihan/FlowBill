import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { Invoice } from "@/models/Invoice";

export async function createNotification(
  userId: string,
  type: "invoice_sent" | "invoice_paid" | "invoice_overdue" | "general",
  title: string,
  message: string,
  data: Record<string, any> = {}
) {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

export async function notifyInvoiceSent(invoiceId: string) {
  try {
    const invoice = await Invoice.findById(invoiceId).populate("createdBy");

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    await createNotification(
      invoice.createdBy._id.toString(),
      "invoice_sent",
      "Invoice Sent",
      `Invoice ${invoice.invoiceNo} has been sent to the customer`,
      { invoiceId: invoice._id, invoiceNo: invoice.invoiceNo }
    );
  } catch (error) {
    console.error("Error creating invoice sent notification:", error);
  }
}

export async function notifyInvoicePaid(invoiceId: string) {
  try {
    const invoice = await Invoice.findById(invoiceId).populate("createdBy");

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    await createNotification(
      invoice.createdBy._id.toString(),
      "invoice_paid",
      "Invoice Paid",
      `Invoice ${invoice.invoiceNo} has been paid!`,
      { invoiceId: invoice._id, invoiceNo: invoice.invoiceNo }
    );
  } catch (error) {
    console.error("Error creating invoice paid notification:", error);
  }
}

export async function notifyInvoiceOverdue() {
  try {
    // Find all overdue invoices that haven't been notified yet
    const overdueInvoices = await Invoice.find({
      dueDate: { $lt: new Date() },
      status: { $ne: "paid" },
    }).populate("createdBy");

    for (const invoice of overdueInvoices) {
      // Check if we already sent a notification for this invoice
      const existingNotification = await Notification.findOne({
        userId: invoice.createdBy._id,
        type: "invoice_overdue",
        "data.invoiceId": invoice._id,
      });

      if (!existingNotification) {
        await createNotification(
          invoice.createdBy._id.toString(),
          "invoice_overdue",
          "Invoice Overdue",
          `Invoice ${invoice.invoiceNo} is overdue`,
          { invoiceId: invoice._id, invoiceNo: invoice.invoiceNo }
        );
      }
    }
  } catch (error) {
    console.error("Error creating invoice overdue notifications:", error);
  }
}

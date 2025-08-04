"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  X, 
  Send, 
  Mail, 
  User, 
  FileText, 
  DollarSign, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Copy,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

const sendInvoiceSchema = z.object({
  customMessage: z.string().optional(),
  sendCopy: z.boolean().default(false),
});

type SendInvoiceFormData = z.infer<typeof sendInvoiceSchema>;

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
  invoiceId: string;
}

interface InvoiceData {
  canSend: boolean;
  customer: {
    name: string;
    email: string;
  };
  invoice: {
    invoiceNo: string;
    status: string;
    total: number;
  };
  rateLimitRemaining: number;
}

export function EnhancedSendInvoiceModal({ 
  isOpen, 
  onClose, 
  onSent, 
  invoiceId 
}: SendInvoiceModalProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<SendInvoiceFormData>({
    resolver: zodResolver(sendInvoiceSchema),
    defaultValues: {
      customMessage: "",
      sendCopy: false,
    },
  });

  const customMessage = watch("customMessage");
  const sendCopy = watch("sendCopy");

  // Fetch invoice data when modal opens
  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoiceData();
    }
  }, [isOpen, invoiceId]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/${invoiceId}/send`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch invoice data");
      }

      const data = await response.json();
      setInvoiceData(data);
    } catch (error) {
      console.error("Error fetching invoice data:", error);
      toast.error("Failed to load invoice data");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SendInvoiceFormData) => {
    if (!invoiceData?.canSend) {
      toast.error("Cannot send invoice at this time");
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invoice");
      }

      const result = await response.json();
      
      toast.success("Invoice sent successfully!", {
        description: `Email sent to ${invoiceData.customer.email}`,
      });

      onSent();
      onClose();
      reset();
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send invoice"
      );
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: "secondary", className: "text-gray-600 bg-gray-100" },
      sent: { variant: "default", className: "text-blue-600 bg-blue-100" },
      paid: { variant: "default", className: "text-green-600 bg-green-100" },
      overdue: { variant: "destructive", className: "text-red-600 bg-red-100" },
    } as const;

    const config = variants[status as keyof typeof variants] || variants.draft;

    return (
      <Badge className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const generateEmailPreview = () => {
    if (!invoiceData) return "";

    const defaultMessage = `Dear ${invoiceData.customer.name},

Thank you for your business! Please find your invoice ${invoiceData.invoice.invoiceNo} attached.

Invoice Details:
• Invoice Number: ${invoiceData.invoice.invoiceNo}
• Amount: ${formatCurrency(invoiceData.invoice.total)}
• Status: ${invoiceData.invoice.status}

Please don't hesitate to contact us if you have any questions.

Best regards`;

    return customMessage || defaultMessage;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Send Invoice
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send invoice via email with PDF attachment
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading invoice data...</p>
              </div>
            </div>
          </div>
        ) : !invoiceData ? (
          <div className="p-6">
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Failed to Load Invoice
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Unable to load invoice data. Please try again.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Invoice Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Invoice</p>
                      <p className="font-medium">{invoiceData.invoice.invoiceNo}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                      <p className="font-medium">{formatCurrency(invoiceData.invoice.total)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                      {getStatusBadge(invoiceData.invoice.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recipient Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Recipient
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                    {invoiceData.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {invoiceData.customer.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {invoiceData.customer.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rate Limit Warning */}
            {invoiceData.rateLimitRemaining <= 3 && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm">
                      You have {invoiceData.rateLimitRemaining} email{invoiceData.rateLimitRemaining !== 1 ? 's' : ''} remaining in the current rate limit window.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cannot Send Warning */}
            {!invoiceData.canSend && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm">
                      You have reached the email rate limit. Please try again later.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Email Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customMessage">Custom Message (Optional)</Label>
                  <textarea
                    id="customMessage"
                    {...register("customMessage")}
                    placeholder="Add a personal message to include with the invoice..."
                    className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    disabled={sending}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Leave empty to use the default message template
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendCopy"
                    {...register("sendCopy")}
                    disabled={sending}
                  />
                  <Label htmlFor="sendCopy" className="text-sm">
                    Send a copy to myself
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {previewMode ? "Hide" : "Preview"} Email
                  </Button>
                </div>

                <AnimatePresence>
                  {previewMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50"
                    >
                      <h4 className="font-medium mb-2">Email Preview:</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {generateEmailPreview()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={sending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={sending || !invoiceData.canSend}
                className="flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invoice
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
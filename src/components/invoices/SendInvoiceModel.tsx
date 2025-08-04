"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Send } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";

const sendEmailSchema = z.object({
  to: z.string().email("Invalid email address"),
  cc: z.string().email("Invalid CC email").optional().or(z.literal("")),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

type SendEmailFormData = z.infer<typeof sendEmailSchema>;

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNo: string;
  customerEmail: string;
  customerName: string;
}

export function SendInvoiceModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNo,
  customerEmail,
  customerName,
}: SendInvoiceModalProps) {
  const { data: session } = useSession();
  const [isSending, setIsSending] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SendEmailFormData>({
    resolver: zodResolver(sendEmailSchema),
    defaultValues: {
      to: customerEmail,
      cc: "",
      subject: `Invoice ${invoiceNo} from ${
        session?.user?.name || "our company"
      }`,
      message: `Dear ${customerName},\n\nPlease find attached the invoice ${invoiceNo} for your records.\n\nIf you have any questions, please don't hesitate to contact us.\n\nThank you for your business!\n\nBest regards,\n${
        session?.user?.name || "Our team"
      }`,
    },
  });

  const onSubmit = async (data: SendEmailFormData) => {
    setIsSending(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      toast.success("Invoice sent successfully");
      reset();
      onClose();
    } catch (error) {
      toast.error("Failed to send invoice");
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invoice
          </DialogTitle>
          <DialogDescription>
            Send invoice {invoiceNo} to {customerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="email"
              {...register("to")}
              placeholder="customer@example.com"
            />
            {errors.to && (
              <p className="text-sm text-red-500">{errors.to.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc">CC (Optional)</Label>
            <Input
              id="cc"
              type="email"
              {...register("cc")}
              placeholder="cc@example.com"
            />
            {errors.cc && (
              <p className="text-sm text-red-500">{errors.cc.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              {...register("subject")}
              placeholder="Invoice subject"
            />
            {errors.subject && (
              <p className="text-sm text-red-500">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              rows={5}
              {...register("message")}
              placeholder="Your message..."
            />
            {errors.message && (
              <p className="text-sm text-red-500">{errors.message.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

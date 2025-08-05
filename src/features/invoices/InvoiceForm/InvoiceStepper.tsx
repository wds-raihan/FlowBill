"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Step, StepLabel, Stepper } from "@/components/ui/stepper";
import { useInvoiceSelectors, useInvoiceStore } from "@/stores/invoiceStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Save, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { InvoiceFormData, invoiceFormSchema } from "./InvoiceFormSchema";
import { InvoicePreview } from "./InvoicePreview";
import { Step1Customer } from "./Step1Customer";
import { Step2Items } from "./Step2Items";
import { Step3Summary } from "./Step3Summery";

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  invoiceId?: string;
}

export function InvoiceStepper({ initialData, invoiceId }: InvoiceFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Zustand store integration
  const {
    currentStep,
    formData,
    items,
    setCurrentStep,
    updateFormData,
    addItem,
    updateItem,
    removeItem,
    calculateTotals,
    resetForm,
    setSubmitting,
    saveDraft,
  } = useInvoiceStore();

  const { isFormValid, canProceedToNext, hasUnsavedChanges } =
    useInvoiceSelectors();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customerId: formData.customerId || initialData?.customerId || "",
      issueDate: formData.issueDate || initialData?.issueDate || new Date(),
      dueDate:
        formData.dueDate ||
        initialData?.dueDate ||
        new Date(new Date().setDate(new Date().getDate() + 30)),
      items:
        items.length > 0
          ? items
          : initialData?.items || [
              {
                id: crypto.randomUUID(),
                description: "",
                pageQty: 0,
                serviceCharge: 0,
                rate: 0,
                amount: 0,
              },
            ],
      tax: formData.tax || initialData?.tax || 0,
      discount: formData.discount || initialData?.discount || 0,
      notes: formData.notes || initialData?.notes || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch form changes and sync with Zustand
  const watchedValues = form.watch();

  useEffect(() => {
    updateFormData(watchedValues);
    calculateTotals();
  }, [watchedValues, updateFormData, calculateTotals]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (hasUnsavedChanges && !invoiceId) {
      const interval = setInterval(() => {
        saveDraft();
        toast.success("Draft saved automatically");
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [hasUnsavedChanges, invoiceId, saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!invoiceId) {
        // Only reset if creating new invoice
        resetForm();
      }
    };
  }, [invoiceId, resetForm]);

  const steps = [
    {
      label: "Customer",
      description: "Select customer and set dates",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      label: "Items",
      description: "Add invoice items and services",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      label: "Summary",
      description: "Review and finalize invoice",
      icon: <FileText className="w-4 h-4" />,
    },
  ];

  const handleNext = async () => {
    let isValid = false;

    if (currentStep === 0) {
      isValid = await form.trigger("customerId");
    } else if (currentStep === 1) {
      isValid = await form.trigger("items");
    } else {
      isValid = await form.trigger();
    }

    if (isValid && canProceedToNext(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setIsSubmitting(true);
      const formValues = form.getValues();

      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formValues,
          status: "draft",
          orgId: session?.user?.orgId,
          createdBy: session?.user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save draft");
      }

      const result = await response.json();
      saveDraft();
      toast.success("Draft saved successfully");

      // Redirect to edit mode
      router.push(`/invoices/edit/${result._id}`);
    } catch (error) {
      toast.error("Failed to save draft");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    setSubmitting(true);

    try {
      const url = invoiceId ? `/api/invoices/${invoiceId}` : "/api/invoices";
      const method = invoiceId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          status: "sent",
          orgId: session?.user?.orgId,
          createdBy: session?.user?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save invoice");
      }

      const result = await response.json();

      toast.success(
        invoiceId
          ? "Invoice updated successfully"
          : "Invoice created successfully"
      );

      // Reset form state
      resetForm();

      // Redirect to invoice detail page
      router.push(`/invoices/${result._id || invoiceId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save invoice"
      );
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <Step1Customer form={form} />;
      case 1:
        return (
          <Step2Items
            form={form}
            fields={fields}
            append={append}
            remove={remove}
          />
        );
      case 2:
        return <Step3Summary form={form} />;
      default:
        return "Unknown step";
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {invoiceId ? "Edit Invoice" : "Create New Invoice"}
            </h1>
            <p className="text-muted-foreground">
              {invoiceId
                ? "Update invoice details"
                : "Fill in the details to create a new invoice"}
            </p>
          </div>

          {/* Draft indicator */}
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Unsaved changes</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoice Details</CardTitle>
                  <CardDescription>
                    Step {currentStep + 1} of {steps.length} -{" "}
                    {steps[currentStep]?.description}
                  </CardDescription>
                </div>

                {/* Save Draft Button */}
                {!invoiceId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || !form.getValues("customerId")}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Draft
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Stepper activeStep={currentStep} className="mb-8">
                {steps.map((step, index) => (
                  <Step key={index}>
                    <StepLabel>
                      <div className="flex items-center gap-2">
                        {step.icon}
                        {step.label}
                      </div>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {getStepContent(currentStep)}
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                >
                  Back
                </Button>
                <div className="flex space-x-2">
                  {currentStep === steps.length - 1 ? (
                    <div className="flex gap-2">
                      {!invoiceId && (
                        <Button
                          variant="outline"
                          onClick={handleSaveDraft}
                          disabled={isSubmitting || !isFormValid}
                          className="flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save as Draft
                        </Button>
                      )}
                      <Button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={isSubmitting || !isFormValid}
                        className="flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {isSubmitting
                          ? "Saving..."
                          : invoiceId
                          ? "Update Invoice"
                          : "Create & Send Invoice"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceedToNext(currentStep)}
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <InvoicePreview form={form} />
        </div>
      </div>
    </div>
  );
}

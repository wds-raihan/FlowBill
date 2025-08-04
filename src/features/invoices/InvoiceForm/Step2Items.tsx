"use client";

import {
  Control,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { InvoiceFormData, InvoiceItemFormData } from "./invoiceFormSchema";

interface Step2ItemsProps {
  form: {
    control: Control<InvoiceFormData>;
    setValue: (name: keyof InvoiceFormData, value: any) => void;
    watch: (name: keyof InvoiceFormData) => any;
    trigger: (name: keyof InvoiceFormData) => Promise<boolean>;
  };
  fields: {
    id: string;
  }[];
  append: UseFieldArrayAppend<InvoiceFormData, "items">;
  remove: UseFieldArrayRemove;
}

export function Step2Items({ form, fields, append, remove }: Step2ItemsProps) {
  const items = form.watch("items");

  const addItem = () => {
    append({
      id: crypto.randomUUID(),
      description: "",
      pageQty: 0,
      serviceCharge: 0,
      rate: 0,
      amount: 0,
    });
  };

  const updateItem = (
    index: number,
    field: keyof InvoiceItemFormData,
    value: any
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate amount when pageQty or rate changes
    if (field === "pageQty" || field === "rate") {
      newItems[index].amount = newItems[index].pageQty * newItems[index].rate;
    }

    form.setValue("items", newItems);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Invoice Items</h3>
        <Button type="button" variant="outline" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex justify-between items-center text-base">
                Item {index + 1}
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor={`items.${index}.description`}>
                    Description
                  </Label>
                  <Input
                    id={`items.${index}.description`}
                    value={items[index]?.description || ""}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="Service description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`items.${index}.pageQty`}>Pages</Label>
                  <Input
                    id={`items.${index}.pageQty`}
                    type="number"
                    min="0"
                    value={items[index]?.pageQty || 0}
                    onChange={(e) =>
                      updateItem(index, "pageQty", Number(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`items.${index}.rate`}>Rate ($)</Label>
                  <Input
                    id={`items.${index}.rate`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={items[index]?.rate || 0}
                    onChange={(e) =>
                      updateItem(index, "rate", Number(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`items.${index}.amount`}>Amount ($)</Label>
                  <Input
                    id={`items.${index}.amount`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={items[index]?.amount || 0}
                    onChange={(e) =>
                      updateItem(index, "amount", Number(e.target.value))
                    }
                    readOnly
                  />
                </div>

                <div className="md:col-span-4 space-y-2">
                  <Label htmlFor={`items.${index}.serviceCharge`}>
                    Service Charge ($)
                  </Label>
                  <Input
                    id={`items.${index}.serviceCharge`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={items[index]?.serviceCharge || 0}
                    onChange={(e) =>
                      updateItem(index, "serviceCharge", Number(e.target.value))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

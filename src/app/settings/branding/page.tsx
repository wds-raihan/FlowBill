"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Save, Upload } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";

const organizationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  addressStreet: z.string().min(1, "Street is required"),
  addressCity: z.string().min(1, "City is required"),
  addressState: z.string().min(1, "State is required"),
  addressZipCode: z.string().min(1, "Zip code is required"),
  addressCountry: z.string().min(1, "Country is required"),
  contactEmail: z.string().email("Invalid email"),
  contactPhone: z.string().min(1, "Phone is required"),
  contactWebsite: z.string().url().optional().or(z.literal("")),
  taxId: z.string().min(1, "Tax ID is required"),
  bankName: z.string().min(1, "Bank name is required"),
  bankAccountNumber: z.string().min(1, "Account number is required"),
  bankRoutingNumber: z.string().min(1, "Routing number is required"),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export default function BrandingSettings() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
  });

  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/organizations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          logoUrl,
          orgId: session?.user?.orgId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update organization");
      }

      toast.success("Organization updated successfully");
    } catch (error) {
      toast.error("Failed to update organization");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "invoice_generator");
    formData.append("folder", `logos/${session?.user?.orgId}`);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      setLogoUrl(data.secure_url);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload logo");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Branding Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization details and branding
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Basic information about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Your company name"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Company Logo</Label>
                  <div className="flex items-center space-x-4">
                    {logoUrl && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="relative h-16 w-16"
                      >
                        <Image
                          src={logoUrl}
                          alt="Company logo"
                          fill
                          className="object-contain"
                        />
                      </motion.div>
                    )}
                    <div>
                      <Label
                        htmlFor="logo-upload"
                        className="flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        {isUploading ? (
                          "Uploading..."
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Logo
                          </>
                        )}
                      </Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploading}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    {...register("taxId")}
                    placeholder="Your tax ID"
                  />
                  {errors.taxId && (
                    <p className="text-sm text-red-500">
                      {errors.taxId.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
                <CardDescription>Your organization's address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addressStreet">Street</Label>
                    <Input
                      id="addressStreet"
                      {...register("addressStreet")}
                      placeholder="123 Main St"
                    />
                    {errors.addressStreet && (
                      <p className="text-sm text-red-500">
                        {errors.addressStreet.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressCity">City</Label>
                    <Input
                      id="addressCity"
                      {...register("addressCity")}
                      placeholder="New York"
                    />
                    {errors.addressCity && (
                      <p className="text-sm text-red-500">
                        {errors.addressCity.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressState">State</Label>
                    <Input
                      id="addressState"
                      {...register("addressState")}
                      placeholder="NY"
                    />
                    {errors.addressState && (
                      <p className="text-sm text-red-500">
                        {errors.addressState.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressZipCode">Zip Code</Label>
                    <Input
                      id="addressZipCode"
                      {...register("addressZipCode")}
                      placeholder="10001"
                    />
                    {errors.addressZipCode && (
                      <p className="text-sm text-red-500">
                        {errors.addressZipCode.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="addressCountry">Country</Label>
                    <Input
                      id="addressCountry"
                      {...register("addressCountry")}
                      placeholder="United States"
                    />
                    {errors.addressCountry && (
                      <p className="text-sm text-red-500">
                        {errors.addressCountry.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  How customers can reach your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      {...register("contactEmail")}
                      placeholder="contact@example.com"
                    />
                    {errors.contactEmail && (
                      <p className="text-sm text-red-500">
                        {errors.contactEmail.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone</Label>
                    <Input
                      id="contactPhone"
                      {...register("contactPhone")}
                      placeholder="+1 (555) 123-4567"
                    />
                    {errors.contactPhone && (
                      <p className="text-sm text-red-500">
                        {errors.contactPhone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="contactWebsite">Website (Optional)</Label>
                    <Input
                      id="contactWebsite"
                      {...register("contactWebsite")}
                      placeholder="https://example.com"
                    />
                    {errors.contactWebsite && (
                      <p className="text-sm text-red-500">
                        {errors.contactWebsite.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bank Information</CardTitle>
                <CardDescription>
                  Your bank details for invoice payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    {...register("bankName")}
                    placeholder="Bank of America"
                  />
                  {errors.bankName && (
                    <p className="text-sm text-red-500">
                      {errors.bankName.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      {...register("bankAccountNumber")}
                      placeholder="123456789"
                    />
                    {errors.bankAccountNumber && (
                      <p className="text-sm text-red-500">
                        {errors.bankAccountNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankRoutingNumber">Routing Number</Label>
                    <Input
                      id="bankRoutingNumber"
                      {...register("bankRoutingNumber")}
                      placeholder="021000021"
                    />
                    {errors.bankRoutingNumber && (
                      <p className="text-sm text-red-500">
                        {errors.bankRoutingNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading || isUploading}
                    className="w-full"
                  >
                    {isLoading ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
}

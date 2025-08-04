import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      logoUrl,
      addressStreet,
      addressCity,
      addressState,
      addressZipCode,
      addressCountry,
      contactEmail,
      contactPhone,
      contactWebsite,
      taxId,
      bankName,
      bankAccountNumber,
      bankRoutingNumber,
      orgId,
    } = await request.json();

    // Check if user has permission to update this organization
    const user = await User.findById(session.user.id);

    if (!user || (user.role !== "ADMIN" && user.orgId.toString() !== orgId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const org = await Organization.findById(orgId);

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Update organization
    org.name = name;
    if (logoUrl) org.logoUrl = logoUrl;
    org.address = {
      street: addressStreet,
      city: addressCity,
      state: addressState,
      zipCode: addressZipCode,
      country: addressCountry,
    };
    org.contact = {
      email: contactEmail,
      phone: contactPhone,
      website: contactWebsite,
    };
    org.taxId = taxId;
    org.bankDetails = {
      bankName,
      accountNumber: bankAccountNumber,
      routingNumber: bankRoutingNumber,
    };

    await org.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

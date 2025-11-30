/**
 * Rental Renewal API Route
 * 
 * Allows tenants to request renewal of their rental contract.
 * Renewal duration must be between 1 month and 2 years (24 months).
 * 
 * POST /api/rentals/renew
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, generateId, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Rental, RentalRenewal, Property } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const tokenData = parseToken(token);
    if (!tokenData || tokenData.role !== "tenant") {
      return NextResponse.json(
        { success: false, message: "Only tenants can request renewal" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rentalId, renewalDuration } = body;

    // Validate input
    if (!rentalId || !renewalDuration) {
      return NextResponse.json(
        { success: false, message: "Rental ID and renewal duration are required" },
        { status: 400 }
      );
    }

    // Validate renewal duration (1-24 months)
    if (typeof renewalDuration !== "number" || renewalDuration < 1 || renewalDuration > 24) {
      return NextResponse.json(
        { success: false, message: "Renewal duration must be between 1 and 24 months" },
        { status: 400 }
      );
    }

    // Load data
    const rentals = await readJSON<Rental[]>("rentals.json");
    const renewals = await readJSON<RentalRenewal[]>("rental_renewals.json");
    const properties = await readJSON<Property[]>("properties.json");

    // Find rental
    const rental = findById(rentals, rentalId);
    if (!rental) {
      return NextResponse.json(
        { success: false, message: "Rental not found" },
        { status: 404 }
      );
    }

    // Verify tenant owns this rental
    if (rental.tenantId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "You don't own this rental" },
        { status: 403 }
      );
    }

    // Verify rental is active
    if (rental.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Only active rentals can be renewed" },
        { status: 400 }
      );
    }

    // Check if there's already a pending renewal
    const existingRenewal = renewals.find(
      (r) => r.rentalId === rentalId && r.status === "pending"
    );
    if (existingRenewal) {
      return NextResponse.json(
        { success: false, message: "A renewal request is already pending for this rental" },
        { status: 400 }
      );
    }

    // Get landlordId from rental or property
    let landlordId = rental.landlordId;
    if (!landlordId) {
      const property = findById(properties, rental.propertyId);
      if (property) {
        landlordId = property.ownerId;
      }
    }

    // Calculate new end date based on current end date or start date + renewal duration
    const currentEndDate = rental.endDate ? new Date(rental.endDate) : new Date(rental.startDate);
    const renewalStartDate = new Date(currentEndDate);
    renewalStartDate.setDate(renewalStartDate.getDate() + 1); // Start day after current end date
    const renewalEndDate = new Date(renewalStartDate);
    renewalEndDate.setMonth(renewalEndDate.getMonth() + renewalDuration);

    // Create renewal request
    const renewal: RentalRenewal = {
      id: generateId("renew"),
      rentalId,
      tenantId: tokenData.userId,
      landlordId: landlordId || "",
      renewalDuration,
      requestedStartDate: renewalStartDate.toISOString().split("T")[0],
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Update rental status to "renewal_pending"
    const rentalIndex = rentals.findIndex((r) => r.id === rentalId);
    if (rentalIndex !== -1) {
      rentals[rentalIndex].status = "renewal_pending";
    }

    // Save data
    renewals.push(renewal);
    await writeJSON("rental_renewals.json", renewals);
    await writeJSON("rentals.json", rentals);

    return NextResponse.json({
      success: true,
      message: "Renewal request submitted successfully",
      renewal,
    });
  } catch (error) {
    console.error("Renew rental error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


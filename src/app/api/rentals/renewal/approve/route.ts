/**
 * Rental Renewal Approval API Route
 * 
 * Allows landlords to approve or reject renewal requests.
 * 
 * POST /api/rentals/renewal/approve
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, findById } from "@/utils/jsonDb";
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
    if (!tokenData || tokenData.role !== "landlord") {
      return NextResponse.json(
        { success: false, message: "Only landlords can approve renewals" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { renewalId, approve } = body;

    // Validate input
    if (!renewalId || typeof approve !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Renewal ID and approval status are required" },
        { status: 400 }
      );
    }

    // Load data
    const renewals = await readJSON<RentalRenewal[]>("rental_renewals.json");
    const rentals = await readJSON<Rental[]>("rentals.json");
    const properties = await readJSON<Property[]>("properties.json");

    // Find renewal
    const renewal = findById(renewals, renewalId);
    if (!renewal) {
      return NextResponse.json(
        { success: false, message: "Renewal request not found" },
        { status: 404 }
      );
    }

    // Find rental to get property and verify ownership
    const rental = findById(rentals, renewal.rentalId);
    if (!rental) {
      return NextResponse.json(
        { success: false, message: "Rental not found" },
        { status: 404 }
      );
    }

    // Find property to verify landlord ownership
    const property = findById(properties, rental.propertyId);
    if (!property) {
      return NextResponse.json(
        { success: false, message: "Property not found" },
        { status: 404 }
      );
    }

    // Verify landlord owns this property (this is the source of truth)
    if (property.ownerId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "You don't own this property" },
        { status: 403 }
      );
    }

    // Update renewal.landlordId if missing (for data consistency)
    if (!renewal.landlordId || renewal.landlordId !== property.ownerId) {
      const renewalIndex = renewals.findIndex((r) => r.id === renewalId);
      if (renewalIndex !== -1) {
        renewals[renewalIndex].landlordId = property.ownerId;
      }
    }

    // Verify renewal is pending
    if (renewal.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "This renewal request has already been processed" },
        { status: 400 }
      );
    }

    // Update renewal status
    const renewalIndex = renewals.findIndex((r) => r.id === renewalId);
    renewals[renewalIndex].status = approve ? "approved" : "rejected";
    renewals[renewalIndex].updatedAt = Date.now();

    // If approved, update rental
    if (approve) {
      const rentalIndex = rentals.findIndex((r) => r.id === renewal.rentalId);
      if (rentalIndex !== -1) {
        // Calculate new end date
        const startDate = new Date(renewal.requestedStartDate);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + renewal.renewalDuration);

        rentals[rentalIndex].status = "active";
        rentals[rentalIndex].startDate = renewal.requestedStartDate;
        rentals[rentalIndex].endDate = endDate.toISOString().split("T")[0];
      }
    } else {
      // If rejected, revert rental status to active
      const rentalIndex = rentals.findIndex((r) => r.id === renewal.rentalId);
      if (rentalIndex !== -1) {
        rentals[rentalIndex].status = "active";
      }
    }

    // Save data
    await writeJSON("rental_renewals.json", renewals);
    await writeJSON("rentals.json", rentals);
    await writeJSON("properties.json", properties);

    return NextResponse.json({
      success: true,
      message: approve
        ? "Renewal request approved successfully"
        : "Renewal request rejected",
      renewal: renewals[renewalIndex],
    });
  } catch (error) {
    console.error("Approve renewal error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


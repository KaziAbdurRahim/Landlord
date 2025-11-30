/**
 * Rental Termination Approval API Route
 * 
 * Allows landlords to approve or reject termination requests.
 * 
 * POST /api/rentals/termination/approve
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Rental, RentalTermination, Property } from "@/types";

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
        { success: false, message: "Only landlords can approve terminations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { terminationId, approve } = body;

    // Validate input
    if (!terminationId || typeof approve !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Termination ID and approval status are required" },
        { status: 400 }
      );
    }

    // Load data
    const terminations = await readJSON<RentalTermination[]>("rental_terminations.json");
    const rentals = await readJSON<Rental[]>("rentals.json");
    const properties = await readJSON<Property[]>("properties.json");

    // Find termination
    const termination = findById(terminations, terminationId);
    if (!termination) {
      return NextResponse.json(
        { success: false, message: "Termination request not found" },
        { status: 404 }
      );
    }

    // Find rental to get property and verify ownership
    const rental = findById(rentals, termination.rentalId);
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

    // Update termination.landlordId if missing (for data consistency)
    if (!termination.landlordId || termination.landlordId !== property.ownerId) {
      const terminationIndex = terminations.findIndex((t) => t.id === terminationId);
      if (terminationIndex !== -1) {
        terminations[terminationIndex].landlordId = property.ownerId;
      }
    }

    // Verify termination is pending
    if (termination.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "This termination request has already been processed" },
        { status: 400 }
      );
    }

    // Update termination status
    const terminationIndex = terminations.findIndex((t) => t.id === terminationId);
    terminations[terminationIndex].status = approve ? "approved" : "rejected";
    terminations[terminationIndex].updatedAt = Date.now();

    // If approved, update rental status to "completed" and mark property as available
    if (approve) {
      const rentalIndex = rentals.findIndex((r) => r.id === termination.rentalId);
      if (rentalIndex !== -1) {
        rentals[rentalIndex].status = "completed";
        rentals[rentalIndex].endDate = termination.requestedEndDate;
      }

      // Mark property as available after termination date
      const propertyIndex = properties.findIndex((p) => p.id === property.id);
      if (propertyIndex !== -1) {
        // Property will be available after the termination date
        // We don't set it to available immediately, but the landlord can list it again
        // after the termination date has passed
      }
    } else {
      // If rejected, revert rental status back to active
      const rentalIndex = rentals.findIndex((r) => r.id === termination.rentalId);
      if (rentalIndex !== -1) {
        rentals[rentalIndex].status = "active";
        // Keep the original end date or remove it
        // We could restore the original end date here if we stored it
      }
    }

    // Save data
    await writeJSON("rental_terminations.json", terminations);
    await writeJSON("rentals.json", rentals);
    await writeJSON("properties.json", properties);

    return NextResponse.json({
      success: true,
      message: approve
        ? "Termination request approved successfully"
        : "Termination request rejected",
      termination: terminations[terminationIndex],
    });
  } catch (error) {
    console.error("Approve termination error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


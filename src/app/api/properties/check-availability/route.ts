/**
 * Property Availability Check API Route
 * 
 * Checks if a property can be made available (no active rentals).
 * Used when landlord tries to list a property.
 * 
 * GET /api/properties/check-availability?propertyId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Property, Rental } from "@/types";

export async function GET(request: NextRequest) {
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
        { success: false, message: "Only landlords can check availability" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { success: false, message: "Property ID is required" },
        { status: 400 }
      );
    }

    // Load data
    const properties = await readJSON<Property[]>("properties.json");
    const rentals = await readJSON<Rental[]>("rentals.json");

    // Find property
    const property = findById(properties, propertyId);
    if (!property) {
      return NextResponse.json(
        { success: false, message: "Property not found" },
        { status: 404 }
      );
    }

    // Verify landlord owns this property
    if (property.ownerId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "You don't own this property" },
        { status: 403 }
      );
    }

    // Check if there are any active rentals for this property
    const now = new Date();
    const activeRentals = rentals.filter((r) => {
      if (r.propertyId !== propertyId) return false;
      
      // Check if rental is active, renewal_pending, or terminating
      if (r.status === "active" || r.status === "renewal_pending" || r.status === "terminating") {
        // If rental has an end date, check if it has passed
        if (r.endDate) {
          const endDate = new Date(r.endDate);
          // If end date hasn't passed yet, rental is still active
          if (endDate > now) {
            return true;
          }
          // End date has passed, rental is effectively ended
          return false;
        }
        // No end date means ongoing rental
        return true;
      }
      return false;
    });

    const isAvailable = activeRentals.length === 0;
    const blockingRental = activeRentals.length > 0 ? activeRentals[0] : null;

    return NextResponse.json({
      success: true,
      available: isAvailable,
      message: isAvailable
        ? "Property can be listed for rent"
        : `Property has an active rental until ${blockingRental?.endDate ? new Date(blockingRental.endDate).toLocaleDateString() : "indefinite"}`,
      blockingRental: blockingRental ? {
        id: blockingRental.id,
        status: blockingRental.status,
        endDate: blockingRental.endDate,
      } : null,
    });
  } catch (error) {
    console.error("Check availability error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


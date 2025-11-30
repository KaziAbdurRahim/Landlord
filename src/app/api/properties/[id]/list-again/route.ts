/**
 * List Property Again API Route
 * 
 * Allows landlords to list a property for rent again after a rental has ended.
 * Automatically sets the start date to the previous rental's end date.
 * 
 * POST /api/properties/[id]/list-again
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, findById, updateById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Property, Rental } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { success: false, message: "Only landlords can list properties" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { previousEndDate } = body;

    // Load data
    const properties = await readJSON<Property[]>("properties.json");
    const rentals = await readJSON<Rental[]>("rentals.json");

    // Find property
    const property = findById(properties, params.id);
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
      if (r.propertyId !== params.id) return false;
      
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

    if (activeRentals.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot list property. There is still an active rental for this property.",
        },
        { status: 400 }
      );
    }

    // Find the most recent rental for this property to get the end date
    const propertyRentals = rentals
      .filter((r) => r.propertyId === params.id)
      .sort((a, b) => {
        // Sort by end date if available, otherwise by start date
        const dateA = a.endDate 
          ? new Date(a.endDate).getTime() 
          : a.startDate 
            ? new Date(a.startDate).getTime() 
            : 0;
        const dateB = b.endDate 
          ? new Date(b.endDate).getTime() 
          : b.startDate 
            ? new Date(b.startDate).getTime() 
            : 0;
        return dateB - dateA; // Most recent first
      });

    let newStartDate: string;
    let newEndDate: string;

    if (previousEndDate) {
      // Use the provided previous end date
      newStartDate = previousEndDate;
    } else if (propertyRentals.length > 0) {
      // Find the most recent rental with an end date
      const rentalWithEndDate = propertyRentals.find((r) => r.endDate);
      if (rentalWithEndDate && rentalWithEndDate.endDate) {
        // Use the most recent rental's end date
        newStartDate = rentalWithEndDate.endDate;
      } else if (propertyRentals[0].startDate) {
        // If no end date, calculate one year from start date (default)
        const startDate = new Date(propertyRentals[0].startDate);
        const calculatedEndDate = new Date(startDate);
        calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + 1);
        newStartDate = calculatedEndDate.toISOString().split("T")[0];
      } else {
        // Fallback to today
        newStartDate = new Date().toISOString().split("T")[0];
      }
    } else {
      // No previous rentals, use today
      newStartDate = new Date().toISOString().split("T")[0];
    }

    // Set default end date (2 months from start, minimum)
    const startDateObj = new Date(newStartDate);
    const endDateObj = new Date(startDateObj);
    endDateObj.setMonth(endDateObj.getMonth() + 2); // Default to 2 months
    newEndDate = endDateObj.toISOString().split("T")[0];

    // Update property to be available and set dates
    const updatedProperties = updateById(properties, params.id, {
      available: true,
      startDate: newStartDate,
      endDate: newEndDate,
    });
    await writeJSON("properties.json", updatedProperties);

    const updatedProperty = updatedProperties.find((p) => p.id === params.id)!;

    return NextResponse.json({
      success: true,
      message: "Property listed for rent again successfully",
      property: updatedProperty,
    });
  } catch (error) {
    console.error("List property again error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


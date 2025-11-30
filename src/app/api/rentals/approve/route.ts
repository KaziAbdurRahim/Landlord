/**
 * Approve/Decline Rental API Route
 * 
 * Allows landlords to approve or decline rental requests.
 * 
 * POST /api/rentals/approve
 * 
 * Request body:
 * {
 *   rentalId: string,
 *   action: "approve" | "decline"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, findById, updateById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Rental, Property } from "@/types";

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
        { success: false, message: "Only landlords can approve rentals" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rentalId, action } = body;

    // Validate input
    if (!rentalId || !action) {
      return NextResponse.json(
        { success: false, message: "Rental ID and action are required" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "decline") {
      return NextResponse.json(
        { success: false, message: "Action must be 'approve' or 'decline'" },
        { status: 400 }
      );
    }

    // Load data
    const rentals = await readJSON<Rental[]>("rentals.json");
    const properties = await readJSON<Property[]>("properties.json");

    // Find rental
    const rental = findById(rentals, rentalId);
    if (!rental) {
      return NextResponse.json(
        { success: false, message: "Rental not found" },
        { status: 404 }
      );
    }

    // Find property
    const property = findById(properties, rental.propertyId);
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

    // Verify rental is pending
    if (rental.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "Rental is not pending" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Approve rental - set default end date (1 year from start) if not set
      const rentalToUpdate = findById(rentals, rentalId);
      let endDate = rentalToUpdate?.endDate;
      if (!endDate) {
        const startDate = new Date(rentalToUpdate?.startDate || new Date().toISOString().split("T")[0]);
        const calculatedEndDate = new Date(startDate);
        calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + 1);
        endDate = calculatedEndDate.toISOString().split("T")[0];
      }

      // Approve rental
      const updatedRentals = updateById(rentals, rentalId, {
        status: "active",
        endDate: endDate,
      });
      await writeJSON("rentals.json", updatedRentals);

      // Mark property as unavailable
      const updatedProperties = updateById(properties, property.id, {
        available: false,
      });
      await writeJSON("properties.json", updatedProperties);

      return NextResponse.json({
        success: true,
        message: "Rental approved successfully",
        rental: updatedRentals.find((r) => r.id === rentalId),
      });
    } else {
      // Decline rental
      const updatedRentals = updateById(rentals, rentalId, {
        status: "cancelled",
      });
      await writeJSON("rentals.json", updatedRentals);

      return NextResponse.json({
        success: true,
        message: "Rental declined",
        rental: updatedRentals.find((r) => r.id === rentalId),
      });
    }
  } catch (error) {
    console.error("Approve rental error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


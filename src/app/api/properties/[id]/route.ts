/**
 * Property Detail API Route
 * 
 * Handles individual property operations:
 * - PUT: Update property (including availability toggle)
 * 
 * PUT /api/properties/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, findById, updateById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Property, Rental } from "@/types";

/**
 * PUT /api/properties/[id]
 * Update property (landlord only)
 * Can toggle availability, but only if no active rentals exist
 */
export async function PUT(
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
        { success: false, message: "Only landlords can update properties" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { available, address, rent, description, startDate, endDate } = body;

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

    // If trying to set as available, check if there are active rentals
    if (available === true) {
      const now = new Date();
      const activeRentals = rentals.filter((r) => {
        if (r.propertyId !== params.id) return false;
        
        // Check if rental is active, renewal_pending, or terminating
        const status = r.status as string;
        if (status === "active" || status === "renewal_pending" || status === "terminating") {
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
        const blockingRental = activeRentals[0];
        return NextResponse.json(
          {
            success: false,
            message: `Cannot make property available. There is an active rental until ${blockingRental.endDate ? new Date(blockingRental.endDate).toLocaleDateString() : "indefinite"}.`,
          },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: Partial<Property> = {};
    
    // Only update available status if explicitly provided
    if (available !== undefined) {
      updateData.available = available;
    }
    
    // Update other fields if provided
    if (address !== undefined) {
      updateData.address = address;
    }
    if (rent !== undefined) {
      if (typeof rent !== "number" || rent <= 0) {
        return NextResponse.json(
          { success: false, message: "Rent must be a positive number" },
          { status: 400 }
        );
      }
      updateData.rent = rent;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (startDate !== undefined) {
      updateData.startDate = startDate;
    }
    if (endDate !== undefined) {
      updateData.endDate = endDate;
    }
    
    // Validate dates if both are provided
    if (updateData.startDate && updateData.endDate) {
      const start = new Date(updateData.startDate);
      const end = new Date(updateData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        return NextResponse.json(
          { success: false, message: "Start date cannot be in the past" },
          { status: 400 }
        );
      }

      if (end <= start) {
        return NextResponse.json(
          { success: false, message: "End date must be after start date" },
          { status: 400 }
        );
      }

      // Calculate months difference
      const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                         (end.getMonth() - start.getMonth());
      
      if (monthsDiff < 2) {
        return NextResponse.json(
          { success: false, message: "Rental period must be at least 2 months" },
          { status: 400 }
        );
      }
    }

    // Update property
    const updatedProperties = updateById(properties, params.id, updateData);
    await writeJSON("properties.json", updatedProperties);

    const updatedProperty = updatedProperties.find((p) => p.id === params.id)!;

    return NextResponse.json({
      success: true,
      message: "Property updated successfully",
      property: updatedProperty,
    });
  } catch (error) {
    console.error("Update property error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


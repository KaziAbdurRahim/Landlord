/**
 * Rental Request API Route
 * 
 * Allows tenants to request to rent a property.
 * Creates a rental with status "pending" that the landlord can approve/decline.
 * 
 * POST /api/rentals/request
 * 
 * Request body:
 * {
 *   propertyId: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, generateId, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Rental, Property, User } from "@/types";

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
        { success: false, message: "Only tenants can request rentals" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { propertyId, rentalDuration } = body; // rentalDuration in months

    // Validate input
    if (!propertyId) {
      return NextResponse.json(
        { success: false, message: "Property ID is required" },
        { status: 400 }
      );
    }

    // Load data
    const properties = await readJSON<Property[]>("properties.json");
    const rentals = await readJSON<Rental[]>("rentals.json");
    const users = await readJSON<User[]>("users.json");

    // Find property
    const property = findById(properties, propertyId);
    if (!property) {
      return NextResponse.json(
        { success: false, message: "Property not found" },
        { status: 404 }
      );
    }

    // Check if property is available
    if (!property.available) {
      return NextResponse.json(
        { success: false, message: "Property is not available" },
        { status: 400 }
      );
    }

    // Check if tenant already has a pending request for this property
    const existingPendingRequest = rentals.find(
      (r) =>
        r.tenantId === tokenData.userId &&
        r.propertyId === propertyId &&
        r.status === "pending"
    );
    if (existingPendingRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "You already have a pending request for this property",
        },
        { status: 400 }
      );
    }

    // Check total number of active and pending rentals (max 20)
    const tenantRentals = rentals.filter(
      (r) => 
        r.tenantId === tokenData.userId && 
        (r.status === "active" || r.status === "pending" || r.status === "renewal_pending" || r.status === "terminating")
    );
    if (tenantRentals.length >= 20) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only have up to 20 active or pending rental requests at a time.",
        },
        { status: 400 }
      );
    }

    // Calculate start and end dates
    // Use property startDate if available, otherwise use today
    const rentalStartDate = property.startDate && new Date(property.startDate) >= new Date()
      ? property.startDate
      : new Date().toISOString().split("T")[0];
    
    // Calculate default duration from property if available
    let defaultDuration = 12; // Fallback default
    if (property.startDate && property.endDate) {
      const start = new Date(property.startDate);
      const end = new Date(property.endDate);
      const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                       (end.getMonth() - start.getMonth());
      defaultDuration = monthsDiff;
    }
    
    // Use tenant's selected duration or default to property's duration
    const duration = rentalDuration || defaultDuration;
    
    // Validate duration is not less than default
    if (duration < defaultDuration) {
      return NextResponse.json(
        { success: false, message: `Rental duration cannot be less than ${defaultDuration} months (landlord's default)` },
        { status: 400 }
      );
    }
    
    // Validate duration is not more than 24 months
    if (duration > 24) {
      return NextResponse.json(
        { success: false, message: "Rental duration cannot exceed 24 months (2 years)" },
        { status: 400 }
      );
    }
    
    // Calculate end date based on rental duration
    const startDateObj = new Date(rentalStartDate);
    const endDateObj = new Date(startDateObj);
    endDateObj.setMonth(endDateObj.getMonth() + duration);
    const rentalEndDate = endDateObj.toISOString().split("T")[0];

    // Create rental request
    const newRental: Rental = {
      id: generateId("r"),
      tenantId: tokenData.userId,
      landlordId: property.ownerId,
      propertyId,
      startDate: rentalStartDate,
      endDate: rentalEndDate,
      status: "pending",
      monthlyRent: property.rent,
      createdAt: new Date().toISOString(),
    };

    // Save rental
    rentals.push(newRental);
    await writeJSON("rentals.json", rentals);

    // Get tenant info for response
    const tenant = findById(users, tokenData.userId);

    return NextResponse.json({
      success: true,
      message: "Rental request submitted successfully. Waiting for landlord approval.",
      rental: {
        ...newRental,
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              email: tenant.email,
            }
          : null,
        property: {
          id: property.id,
          address: property.address,
          rent: property.rent,
        },
      },
    });
  } catch (error) {
    console.error("Create rental request error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


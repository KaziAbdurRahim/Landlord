/**
 * Properties API Route
 * 
 * Handles property-related operations:
 * - GET: Fetch all available properties (for tenants)
 * - POST: Create a new property (for landlords)
 * 
 * GET /api/properties
 * POST /api/properties
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, generateId, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Property, User, Review, Rental } from "@/types";

/**
 * GET /api/properties
 * Returns all available properties (properties with available: true)
 */
export async function GET(request: NextRequest) {
  try {
    // Load properties
    const properties = await readJSON<Property[]>("properties.json");
    const users = await readJSON<User[]>("users.json");
    const reviews = await readJSON<Review[]>("reviews.json");
    const rentals = await readJSON<Rental[]>("rentals.json");

    // Filter only available properties
    // A property is available only if:
    // 1. It's marked as available AND
    // 2. There's no active, renewal_pending, or terminating rental for it
    const now = new Date();
    const availableProperties = properties.filter((p) => {
      if (p.available !== true) return false;
      
      // Check if there's any active rental for this property
      const activeRentals = rentals.filter((r) => {
        if (r.propertyId !== p.id) return false;
        
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
      
      // Property is available only if there are no active rentals
      return activeRentals.length === 0;
    });

    // Enrich with landlord information and reviews
    const propertiesWithLandlord = availableProperties.map((property) => {
      const landlord = findById(users, property.ownerId);
      
      // Get reviews for this landlord
      const landlordReviews = reviews.filter(
        (r) => r.reviewedId === property.ownerId && r.reviewedRole === "landlord"
      );
      
      // Calculate average rating
      const averageRating =
        landlordReviews.length > 0
          ? landlordReviews.reduce((sum, r) => sum + r.rating, 0) / landlordReviews.length
          : 0;

      return {
        ...property,
        landlord: landlord
          ? {
              id: landlord.id,
              name: landlord.name,
              email: landlord.email,
            }
          : null,
        reviews: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: landlordReviews.length,
          recentReviews: landlordReviews
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 3), // Show 3 most recent reviews
        },
      };
    });

    return NextResponse.json({
      success: true,
      properties: propertiesWithLandlord,
    });
  } catch (error) {
    console.error("Get properties error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties
 * Creates a new property (landlord only)
 */
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
        { success: false, message: "Only landlords can create properties" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { address, rent, description, startDate, endDate } = body;

    // Validate required fields
    if (!address || !rent) {
      return NextResponse.json(
        { success: false, message: "Address and rent are required" },
        { status: 400 }
      );
    }

    // Validate rent is a positive number
    if (typeof rent !== "number" || rent <= 0) {
      return NextResponse.json(
        { success: false, message: "Rent must be a positive number" },
        { status: 400 }
      );
    }

    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: "Start date and end date are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
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

    // Load properties
    const properties = await readJSON<Property[]>("properties.json");

    // Create new property
    const newProperty: Property = {
      id: generateId("p"),
      ownerId: tokenData.userId,
      address,
      rent,
      available: true,
      description: description || "",
      startDate: startDate,
      endDate: endDate,
      createdAt: new Date().toISOString(),
    };

    // Save property
    properties.push(newProperty);
    await writeJSON("properties.json", properties);

    return NextResponse.json({
      success: true,
      message: "Property created successfully",
      property: newProperty,
    });
  } catch (error) {
    console.error("Create property error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


/**
 * Landlord Renewals API Route
 * 
 * Fetches all renewal requests for a landlord's properties.
 * 
 * GET /api/rentals/renewals/landlord
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { RentalRenewal, Rental, Property, User } from "@/types";

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
        { success: false, message: "Only landlords can access this" },
        { status: 403 }
      );
    }

    // Load data
    const renewals = await readJSON<RentalRenewal[]>("rental_renewals.json");
    const rentals = await readJSON<Rental[]>("rentals.json");
    const properties = await readJSON<Property[]>("properties.json");
    const users = await readJSON<User[]>("users.json");

    // Filter renewals for this landlord
    // If renewal doesn't have landlordId, get it from the rental
    const landlordRenewals = renewals.filter((r) => {
      if (r.landlordId) {
        return r.landlordId === tokenData.userId;
      }
      // Fallback: get landlordId from rental
      const rental = findById(rentals, r.rentalId);
      if (rental && rental.landlordId) {
        return rental.landlordId === tokenData.userId;
      }
      // If rental doesn't have landlordId, get it from property
      if (rental) {
        const property = findById(properties, rental.propertyId);
        if (property && property.ownerId === tokenData.userId) {
          return true;
        }
      }
      return false;
    });

    // Enrich with related data
    const enrichedRenewals = landlordRenewals.map((renewal) => {
      const rental = findById(rentals, renewal.rentalId);
      const property = rental ? findById(properties, rental.propertyId) : null;
      const tenant = findById(users, renewal.tenantId);

      return {
        ...renewal,
        rental: rental || null,
        property: property || null,
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              email: tenant.email,
            }
          : null,
      };
    }).filter((r) => r.rental && r.property && r.tenant); // Filter out incomplete data

    // Sort by created date (newest first)
    enrichedRenewals.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      success: true,
      renewals: enrichedRenewals,
    });
  } catch (error) {
    console.error("Get landlord renewals error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


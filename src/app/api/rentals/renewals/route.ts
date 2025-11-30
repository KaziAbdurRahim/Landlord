/**
 * Rental Renewals API Route
 * 
 * Fetches renewal requests for a rental.
 * 
 * GET /api/rentals/renewals?rentalId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { RentalRenewal } from "@/types";

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
    if (!tokenData) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rentalId = searchParams.get("rentalId");

    if (!rentalId) {
      return NextResponse.json(
        { success: false, message: "Rental ID is required" },
        { status: 400 }
      );
    }

    // Load renewals
    const renewals = await readJSON<RentalRenewal[]>("rental_renewals.json");

    // Filter by rental ID
    const filteredRenewals = renewals.filter((r) => r.rentalId === rentalId);

    return NextResponse.json({
      success: true,
      renewals: filteredRenewals,
    });
  } catch (error) {
    console.error("Get renewals error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


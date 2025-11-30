/**
 * Rental Termination API Route
 * 
 * Allows tenants to request termination of their rental contract.
 * Requires at least 2 months notice before termination date.
 * 
 * POST /api/rentals/terminate
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, generateId, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Rental, RentalTermination } from "@/types";

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
        { success: false, message: "Only tenants can request termination" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rentalId, requestedEndDate, reason } = body;

    // Validate input
    if (!rentalId || !requestedEndDate) {
      return NextResponse.json(
        { success: false, message: "Rental ID and end date are required" },
        { status: 400 }
      );
    }

    // Load data
    const rentals = await readJSON<Rental[]>("rentals.json");
    const terminations = await readJSON<RentalTermination[]>("rental_terminations.json");

    // Find rental
    const rental = findById(rentals, rentalId);
    if (!rental) {
      return NextResponse.json(
        { success: false, message: "Rental not found" },
        { status: 404 }
      );
    }

    // Verify tenant owns this rental
    if (rental.tenantId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "You don't own this rental" },
        { status: 403 }
      );
    }

    // Verify rental is active
    if (rental.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Only active rentals can be terminated" },
        { status: 400 }
      );
    }

    // Check if there's already a pending termination
    const existingTermination = terminations.find(
      (t) => t.rentalId === rentalId && t.status === "pending"
    );
    if (existingTermination) {
      return NextResponse.json(
        { success: false, message: "A termination request is already pending for this rental" },
        { status: 400 }
      );
    }

    // Validate end date is at least 2 months from now
    const endDate = new Date(requestedEndDate);
    const now = new Date();
    const twoMonthsFromNow = new Date(now);
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

    if (endDate < twoMonthsFromNow) {
      return NextResponse.json(
        { success: false, message: "Termination date must be at least 2 months from today" },
        { status: 400 }
      );
    }

    // Create termination request
    const termination: RentalTermination = {
      id: generateId("term"),
      rentalId,
      tenantId: tokenData.userId,
      landlordId: rental.landlordId,
      requestedEndDate,
      reason: reason || "",
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Update rental status to "terminating"
    const rentalIndex = rentals.findIndex((r) => r.id === rentalId);
    if (rentalIndex !== -1) {
      rentals[rentalIndex].status = "terminating";
      rentals[rentalIndex].endDate = requestedEndDate;
    }

    // Save data
    terminations.push(termination);
    await writeJSON("rental_terminations.json", terminations);
    await writeJSON("rentals.json", rentals);

    return NextResponse.json({
      success: true,
      message: "Termination request submitted successfully",
      termination,
    });
  } catch (error) {
    console.error("Terminate rental error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


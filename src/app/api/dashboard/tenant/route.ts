/**
 * Tenant Dashboard API Route
 * 
 * Fetches and aggregates all data needed for the tenant dashboard:
 * - Current rental information
 * - Property details
 * - Landlord information
 * - Payment history and statistics
 * 
 * GET /api/dashboard/tenant
 * 
 * Headers:
 * Authorization: Bearer <token>
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { User, Property, Rental, Payment, TenantDashboardData, RentalTermination } from "@/types";

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
    if (!tokenData || tokenData.role !== "tenant") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Load all data
    const users = await readJSON<User[]>("users.json");
    const properties = await readJSON<Property[]>("properties.json");
    const rentals = await readJSON<Rental[]>("rentals.json");
    const payments = await readJSON<Payment[]>("payments.json");
    const terminations = await readJSON<RentalTermination[]>("rental_terminations.json");

    // Find current user
    const user = findById(users, tokenData.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Find active, renewal_pending, or terminating rental for this tenant
    const currentRental = rentals.find(
      (r) => r.tenantId === user.id && (r.status === "active" || r.status === "renewal_pending" || r.status === "terminating")
    ) || null;
    
    // Find termination request for current rental
    const terminationRequest = currentRental
      ? terminations.find((t) => t.rentalId === currentRental.id && t.status === "pending") || null
      : null;

    // Find property for current rental
    const property = currentRental
      ? findById(properties, currentRental.propertyId) || null
      : null;

    // Find landlord (owner of the property)
    const landlord = property
      ? findById(users, property.ownerId) || null
      : null;

    // Get payment history for current rental ONLY
    // Only show payments that were actually made by the tenant for this specific rental
    // Payments are NOT automatically created when landlord approves - tenant must make payments
    const paymentHistory = currentRental
      ? payments.filter((p) => p.rentalId === currentRental.id)
      : [];

    // Calculate statistics
    const totalPaid = paymentHistory
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const onTimePayments = paymentHistory.filter(
      (p) => p.status === "paid"
    ).length;

    const latePayments = paymentHistory.filter(
      (p) => p.status === "overdue"
    ).length;

    // Build dashboard data
    const dashboardData: TenantDashboardData = {
      user,
      currentRental,
      property,
      landlord,
      paymentHistory: paymentHistory.sort(
        (a, b) => b.timestamp - a.timestamp
      ),
      totalPaid,
      onTimePayments,
      latePayments,
      terminationRequest, // Add termination request to dashboard data
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Tenant dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


/**
 * Ministry Dashboard API Route
 * 
 * Fetches system-wide analytics and compliance data for government monitoring.
 * Provides overview of the entire rental ecosystem.
 * 
 * GET /api/dashboard/ministry
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import {
  User,
  Property,
  Rental,
  Payment,
  MinistryDashboardData,
} from "@/types";

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
    if (!tokenData || tokenData.role !== "ministry") {
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

    // Calculate statistics
    const totalTenants = users.filter((u) => u.role === "tenant").length;
    const totalLandlords = users.filter((u) => u.role === "landlord").length;
    const activeRentals = rentals.filter((r) => r.status === "active").length;
    const totalProperties = properties.length;

    // Calculate total revenue from all paid payments
    const totalRevenue = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate compliance rate (percentage of active rentals with on-time payments)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const activeRentalIds = rentals
      .filter((r) => r.status === "active")
      .map((r) => r.id);
    const compliantRentals = activeRentalIds.filter((rentalId) => {
      const currentPayment = payments.find(
        (p) => p.rentalId === rentalId && p.month === currentMonth && p.status === "paid"
      );
      return currentPayment !== undefined;
    });
    const complianceRate =
      activeRentals > 0 ? (compliantRentals.length / activeRentals) * 100 : 0;

    // Build rent map by area (mock data structure)
    // In production, this would parse addresses and group by area
    const rentMap = [
      {
        area: "Mirpur",
        averageRent: 12000,
        activeRentals: rentals.filter(
          (r) =>
            r.status === "active" &&
            properties.find(
              (p) => p.id === r.propertyId && p.address.includes("Mirpur")
            )
        ).length,
      },
      {
        area: "Gulshan",
        averageRent: 25000,
        activeRentals: rentals.filter(
          (r) =>
            r.status === "active" &&
            properties.find(
              (p) => p.id === r.propertyId && p.address.includes("Gulshan")
            )
        ).length,
      },
      {
        area: "Dhanmondi",
        averageRent: 18000,
        activeRentals: rentals.filter(
          (r) =>
            r.status === "active" &&
            properties.find(
              (p) => p.id === r.propertyId && p.address.includes("Dhanmondi")
            )
        ).length,
      },
    ];

    // Build dashboard data
    const dashboardData: MinistryDashboardData = {
      totalTenants,
      totalLandlords,
      activeRentals,
      totalProperties,
      totalRevenue,
      complianceRate: Math.round(complianceRate * 100) / 100,
      rentMap,
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Ministry dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


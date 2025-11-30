/**
 * Bank Dashboard API Route
 * 
 * Fetches rental history and payment behavior data for all tenants.
 * Banks use this information to assess creditworthiness.
 * 
 * GET /api/dashboard/bank
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import {
  User,
  Rental,
  Payment,
  BankDashboardData,
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
    if (!tokenData || tokenData.role !== "bank") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Load all data
    const users = await readJSON<User[]>("users.json");
    const rentals = await readJSON<Rental[]>("rentals.json");
    const payments = await readJSON<Payment[]>("payments.json");

    // Get all tenants
    const tenants = users.filter((u) => u.role === "tenant");

    // Build tenant history with credit assessment
    const tenantHistory = tenants.map((tenant) => {
      // Get all rentals for this tenant
      const tenantRentals = rentals.filter((r) => r.tenantId === tenant.id);

      // Get all payments for this tenant's rentals
      const tenantPayments = payments.filter((p) =>
        tenantRentals.some((r) => r.id === p.rentalId)
      );

      // Calculate on-time payment rate
      const totalPayments = tenantPayments.length;
      const onTimePayments = tenantPayments.filter(
        (p) => p.status === "paid"
      ).length;
      const onTimePaymentRate =
        totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0;

      // Calculate credit score (0-1000 scale)
      // Based on: payment history (70%), rental duration (20%), consistency (10%)
      let creditScore = 500; // Base score

      // Payment history factor (0-700 points)
      creditScore += onTimePaymentRate * 7;

      // Rental duration factor (0-200 points)
      const activeRentals = tenantRentals.filter((r) => r.status === "active");
      if (activeRentals.length > 0) {
        const oldestRental = activeRentals.reduce((oldest, current) => {
          return new Date(current.startDate) < new Date(oldest.startDate)
            ? current
            : oldest;
        });
        const monthsActive =
          (Date.now() - new Date(oldestRental.startDate).getTime()) /
          (1000 * 60 * 60 * 24 * 30);
        creditScore += Math.min(monthsActive * 10, 200);
      }

      // Consistency factor (0-100 points)
      if (totalPayments >= 6) {
        creditScore += 100; // Bonus for consistent payment history
      }

      // Cap score at 1000
      creditScore = Math.min(Math.round(creditScore), 1000);

      return {
        tenant,
        rentalHistory: tenantRentals.sort(
          (a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        ),
        paymentHistory: tenantPayments.sort((a, b) => b.timestamp - a.timestamp),
        creditScore,
        onTimePaymentRate: Math.round(onTimePaymentRate * 100) / 100,
      };
    });

    // Sort by credit score (highest first)
    tenantHistory.sort((a, b) => b.creditScore - a.creditScore);

    const dashboardData: BankDashboardData = {
      tenantHistory,
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Bank dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


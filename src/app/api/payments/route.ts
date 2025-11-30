/**
 * Payments API Route
 * 
 * Returns all payment records.
 * Used by landlord dashboard to fetch payment data.
 * 
 * GET /api/payments
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Payment } from "@/types";

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

    // Load payments
    const payments = await readJSON<Payment[]>("payments.json");

    return NextResponse.json({
      success: true,
      payments: payments.sort((a, b) => b.timestamp - a.timestamp),
    });
  } catch (error) {
    console.error("Payments API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


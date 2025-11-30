/**
 * Create Payment API Route
 * 
 * Allows tenants to make rent payments.
 * Creates a payment record and marks it as paid (mock payment system).
 * 
 * POST /api/payments/create
 * 
 * Request body:
 * {
 *   rentalId: string,
 *   month: string (format: YYYY-MM),
 *   amount: number,
 *   method?: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, generateId, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Payment, Rental, User } from "@/types";

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
        { success: false, message: "Only tenants can make payments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rentalId, month, amount, method } = body;

    // Validate input
    if (!rentalId || !month || !amount) {
      return NextResponse.json(
        { success: false, message: "Rental ID, month, and amount are required" },
        { status: 400 }
      );
    }

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return NextResponse.json(
        { success: false, message: "Month must be in YYYY-MM format" },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Load data
    const rentals = await readJSON<Rental[]>("rentals.json");
    const payments = await readJSON<Payment[]>("payments.json");
    const users = await readJSON<User[]>("users.json");

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
        { success: false, message: "You don't have access to this rental" },
        { status: 403 }
      );
    }

    // Verify rental is active
    if (rental.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Rental is not active" },
        { status: 400 }
      );
    }

    // Check if payment already exists for this month
    const existingPayment = payments.find(
      (p) => p.rentalId === rentalId && p.month === month
    );
    if (existingPayment) {
      return NextResponse.json(
        { success: false, message: "Payment for this month already exists" },
        { status: 400 }
      );
    }

    // Verify amount matches monthly rent
    if (amount !== rental.monthlyRent) {
      return NextResponse.json(
        {
          success: false,
          message: `Amount must be exactly ৳${rental.monthlyRent.toLocaleString()}`,
        },
        { status: 400 }
      );
    }

    // Create payment record
    const newPayment: Payment = {
      id: generateId("pay"),
      rentalId,
      amount,
      month,
      status: "paid", // In mock system, payment is immediately verified
      timestamp: Date.now(),
      method: method || "online_payment",
    };

    // Save payment
    payments.push(newPayment);
    await writeJSON("payments.json", payments);

    // Get tenant info for response
    const tenant = findById(users, tokenData.userId);

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      payment: {
        ...newPayment,
        rental: {
          id: rental.id,
          propertyId: rental.propertyId,
          monthlyRent: rental.monthlyRent,
        },
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              email: tenant.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


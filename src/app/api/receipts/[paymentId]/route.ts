/**
 * Receipt API Route
 * 
 * Generates receipt data for a specific payment.
 * Returns all information needed to display the receipt.
 * 
 * GET /api/receipts/[paymentId]
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Payment, Rental, Property, User } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
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

    // Load data
    const payments = await readJSON<Payment[]>("payments.json");
    const rentals = await readJSON<Rental[]>("rentals.json");
    const properties = await readJSON<Property[]>("properties.json");
    const users = await readJSON<User[]>("users.json");

    // Find payment
    const payment = findById(payments, params.paymentId);
    if (!payment) {
      return NextResponse.json(
        { success: false, message: "Payment not found" },
        { status: 404 }
      );
    }

    // Find rental
    const rental = findById(rentals, payment.rentalId);
    if (!rental) {
      return NextResponse.json(
        { success: false, message: "Rental not found" },
        { status: 404 }
      );
    }

    // Find property
    const property = findById(properties, rental.propertyId);
    if (!property) {
      return NextResponse.json(
        { success: false, message: "Property not found" },
        { status: 404 }
      );
    }

    // Find tenant and landlord
    const tenant = findById(users, rental.tenantId);
    const landlord = findById(users, property.ownerId);

    if (!tenant || !landlord) {
      return NextResponse.json(
        { success: false, message: "User information not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this receipt
    if (tokenData.role === "tenant" && tenant.id !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    if (tokenData.role === "landlord" && landlord.id !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      receipt: {
        payment,
        rental,
        property,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
        },
        landlord: {
          id: landlord.id,
          name: landlord.name,
          email: landlord.email,
        },
      },
    });
  } catch (error) {
    console.error("Get receipt error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


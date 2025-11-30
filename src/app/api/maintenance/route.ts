/**
 * Maintenance Requests API Route
 * 
 * Handles maintenance request operations:
 * - GET: Fetch maintenance requests
 * - POST: Create a new maintenance request
 * 
 * GET /api/maintenance?role=tenant&userId=xxx
 * POST /api/maintenance
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, generateId, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { MaintenanceRequest, Rental, Property, User } from "@/types";

/**
 * GET /api/maintenance
 * Fetches maintenance requests based on user role
 */
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
    const role = searchParams.get("role") || tokenData.role;

    // Load data
    const requests = await readJSON<MaintenanceRequest[]>("maintenance_requests.json");
    const users = await readJSON<User[]>("users.json");
    const properties = await readJSON<Property[]>("properties.json");
    const rentals = await readJSON<Rental[]>("rentals.json");

    // Filter requests based on role
    let filteredRequests: MaintenanceRequest[] = [];
    if (role === "tenant") {
      filteredRequests = requests.filter((r) => r.tenantId === tokenData.userId);
    } else if (role === "landlord") {
      filteredRequests = requests.filter((r) => r.landlordId === tokenData.userId);
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid role" },
        { status: 400 }
      );
    }

    // Enrich with related data
    const enrichedRequests = filteredRequests.map((request) => {
      const tenant = findById(users, request.tenantId);
      const landlord = findById(users, request.landlordId);
      const property = findById(properties, request.propertyId);
      const rental = findById(rentals, request.rentalId);

      return {
        ...request,
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              email: tenant.email,
            }
          : null,
        landlord: landlord
          ? {
              id: landlord.id,
              name: landlord.name,
              email: landlord.email,
            }
          : null,
        property: property
          ? {
              id: property.id,
              address: property.address,
            }
          : null,
        rental: rental
          ? {
              id: rental.id,
              startDate: rental.startDate,
            }
          : null,
      };
    });

    // Sort by created date (newest first)
    enrichedRequests.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      success: true,
      requests: enrichedRequests,
    });
  } catch (error) {
    console.error("Get maintenance requests error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/maintenance
 * Creates a new maintenance request (tenant only)
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
    if (!tokenData || tokenData.role !== "tenant") {
      return NextResponse.json(
        { success: false, message: "Only tenants can create maintenance requests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rentalId, title, description, priority } = body;

    // Validate input
    if (!rentalId || !title || !description) {
      return NextResponse.json(
        { success: false, message: "Rental ID, title, and description are required" },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { success: false, message: "Invalid priority level" },
        { status: 400 }
      );
    }

    // Load data
    const rentals = await readJSON<Rental[]>("rentals.json");
    const properties = await readJSON<Property[]>("properties.json");
    const requests = await readJSON<MaintenanceRequest[]>("maintenance_requests.json");
    const users = await readJSON<User[]>("users.json");

    // Verify rental exists and belongs to tenant
    const rental = findById(rentals, rentalId);
    if (!rental) {
      return NextResponse.json(
        { success: false, message: "Rental not found" },
        { status: 404 }
      );
    }

    if (rental.tenantId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "You can only create requests for your own rentals" },
        { status: 403 }
      );
    }

    // Verify rental is active
    if (rental.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Rental must be active to create maintenance requests" },
        { status: 400 }
      );
    }

    // Find property and landlord
    const property = findById(properties, rental.propertyId);
    if (!property) {
      return NextResponse.json(
        { success: false, message: "Property not found" },
        { status: 404 }
      );
    }

    const landlord = findById(users, property.ownerId);
    if (!landlord) {
      return NextResponse.json(
        { success: false, message: "Landlord not found" },
        { status: 404 }
      );
    }

    // Create maintenance request
    const newRequest: MaintenanceRequest = {
      id: generateId("maint"),
      tenantId: tokenData.userId,
      landlordId: property.ownerId,
      rentalId,
      propertyId: property.id,
      title,
      description,
      status: "pending",
      priority: priority || "medium",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save request
    requests.push(newRequest);
    await writeJSON("maintenance_requests.json", requests);

    return NextResponse.json({
      success: true,
      message: "Maintenance request created successfully",
      request: {
        ...newRequest,
        tenant: {
          id: tokenData.userId,
          name: users.find((u) => u.id === tokenData.userId)?.name,
        },
        landlord: {
          id: landlord.id,
          name: landlord.name,
        },
        property: {
          id: property.id,
          address: property.address,
        },
      },
    });
  } catch (error) {
    console.error("Create maintenance request error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


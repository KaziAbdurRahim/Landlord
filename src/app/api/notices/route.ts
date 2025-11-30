/**
 * Notices API Route
 * 
 * Handles notice/announcement operations:
 * - GET: Fetch notices (for tenants or landlords)
 * - POST: Create a new notice (landlord only)
 * 
 * GET /api/notices?role=tenant
 * GET /api/notices?role=landlord
 * POST /api/notices
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, generateId, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Notice, Rental, Property, User } from "@/types";

/**
 * GET /api/notices
 * Fetches notices based on user role
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
    const notices = await readJSON<Notice[]>("notices.json");
    const users = await readJSON<User[]>("users.json");
    const properties = await readJSON<Property[]>("properties.json");
    const rentals = await readJSON<Rental[]>("rentals.json");

    let filteredNotices: Notice[] = [];

    if (role === "tenant") {
      // For tenants: show notices from their landlord
      // Get tenant's active rental
      const tenantRentals = rentals.filter(
        (r) => r.tenantId === tokenData.userId && r.status === "active"
      );

      if (tenantRentals.length > 0) {
        // Get property IDs for tenant's rentals
        const propertyIds = tenantRentals.map((r) => r.propertyId);
        
        // Get landlord IDs from properties
        const tenantProperties = properties.filter((p) =>
          propertyIds.includes(p.id)
        );
        const landlordIds = [...new Set(tenantProperties.map((p) => p.ownerId))];

        // Filter notices: either from tenant's landlord or general (no propertyId)
        filteredNotices = notices.filter(
          (n) =>
            landlordIds.includes(n.landlordId) &&
            (!n.propertyId || propertyIds.includes(n.propertyId))
        );
      }
    } else if (role === "landlord") {
      // For landlords: show all their notices
      filteredNotices = notices.filter((n) => n.landlordId === tokenData.userId);
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid role" },
        { status: 400 }
      );
    }

    // Enrich with related data
    const enrichedNotices = filteredNotices.map((notice) => {
      const landlord = findById(users, notice.landlordId);
      const property = notice.propertyId
        ? findById(properties, notice.propertyId)
        : null;

      return {
        ...notice,
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
      };
    });

    // Sort by created date (newest first)
    enrichedNotices.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      success: true,
      notices: enrichedNotices,
    });
  } catch (error) {
    console.error("Get notices error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notices
 * Creates a new notice (landlord only)
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
    if (!tokenData || tokenData.role !== "landlord") {
      return NextResponse.json(
        { success: false, message: "Only landlords can create notices" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { propertyId, title, content, priority } = body;

    // Validate input
    if (!title || !content) {
      return NextResponse.json(
        { success: false, message: "Title and content are required" },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ["normal", "important", "urgent"];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { success: false, message: "Invalid priority level" },
        { status: 400 }
      );
    }

    // Load data
    const notices = await readJSON<Notice[]>("notices.json");
    const properties = await readJSON<Property[]>("properties.json");

    // If propertyId is provided, verify landlord owns it
    if (propertyId) {
      const property = findById(properties, propertyId);
      if (!property || property.ownerId !== tokenData.userId) {
        return NextResponse.json(
          { success: false, message: "Property not found or you don't own it" },
          { status: 403 }
        );
      }
    }

    // Create notice
    const newNotice: Notice = {
      id: generateId("notice"),
      landlordId: tokenData.userId,
      propertyId: propertyId || undefined,
      title,
      content,
      priority: priority || "normal",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save notice
    notices.push(newNotice);
    await writeJSON("notices.json", notices);

    return NextResponse.json({
      success: true,
      message: "Notice created successfully",
      notice: newNotice,
    });
  } catch (error) {
    console.error("Create notice error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


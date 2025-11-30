/**
 * Terms and Conditions API Route
 * 
 * Handles terms and conditions operations:
 * - GET: Fetch terms (for tenants or landlords)
 * - POST: Create new terms (landlord only)
 * 
 * GET /api/terms?role=tenant&propertyId=xxx
 * GET /api/terms?role=landlord
 * POST /api/terms
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, generateId, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { TermsAndConditions, Property, Rental, User } from "@/types";

/**
 * GET /api/terms
 * Fetches terms based on user role and property
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
    const propertyId = searchParams.get("propertyId");

    // Load data
    const terms = await readJSON<TermsAndConditions[]>("terms.json");
    const users = await readJSON<User[]>("users.json");
    const properties = await readJSON<Property[]>("properties.json");
    const rentals = await readJSON<Rental[]>("rentals.json");

    let filteredTerms: TermsAndConditions[] = [];

    if (role === "tenant") {
      // For tenants: show terms for a specific property
      if (!propertyId) {
        return NextResponse.json(
          { success: false, message: "Property ID is required for tenants" },
          { status: 400 }
        );
      }

      // Find property
      const property = findById(properties, propertyId);
      if (!property) {
        return NextResponse.json(
          { success: false, message: "Property not found" },
          { status: 404 }
        );
      }

      // Get active terms for this property or general terms from this landlord
      filteredTerms = terms.filter(
        (t) =>
          t.landlordId === property.ownerId &&
          t.isActive &&
          (!t.propertyId || t.propertyId === propertyId)
      );

      // If multiple terms exist, get the most recent one
      if (filteredTerms.length > 0) {
        filteredTerms = [
          filteredTerms.sort((a, b) => b.updatedAt - a.updatedAt)[0],
        ];
      }
    } else if (role === "landlord") {
      // For landlords: show all their terms
      filteredTerms = terms.filter((t) => t.landlordId === tokenData.userId);
      // Sort by updated date (newest first)
      filteredTerms.sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid role" },
        { status: 400 }
      );
    }

    // Enrich with related data
    const enrichedTerms = filteredTerms.map((term) => {
      const landlord = findById(users, term.landlordId);
      const property = term.propertyId ? findById(properties, term.propertyId) : null;

      return {
        ...term,
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

    return NextResponse.json({
      success: true,
      terms: enrichedTerms,
    });
  } catch (error) {
    console.error("Get terms error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/terms
 * Creates new terms and conditions (landlord only)
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
        { success: false, message: "Only landlords can create terms" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { propertyId, title, content } = body;

    // Validate input
    if (!title || !content) {
      return NextResponse.json(
        { success: false, message: "Title and content are required" },
        { status: 400 }
      );
    }

    // Load data
    const terms = await readJSON<TermsAndConditions[]>("terms.json");
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

    // Deactivate old terms for the same property/landlord
    const oldTerms = terms.filter(
      (t) =>
        t.landlordId === tokenData.userId &&
        t.isActive &&
        (propertyId ? t.propertyId === propertyId : !t.propertyId)
    );
    oldTerms.forEach((term) => {
      term.isActive = false;
    });

    // Get next version number
    const maxVersion =
      terms.length > 0
        ? Math.max(...terms.map((t) => t.version || 1))
        : 0;

    // Create new terms
    const newTerms: TermsAndConditions = {
      id: generateId("terms"),
      landlordId: tokenData.userId,
      propertyId: propertyId || undefined,
      title,
      content,
      version: maxVersion + 1,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save terms
    terms.push(newTerms);
    await writeJSON("terms.json", terms);

    return NextResponse.json({
      success: true,
      message: "Terms and conditions created successfully",
      terms: newTerms,
    });
  } catch (error) {
    console.error("Create terms error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


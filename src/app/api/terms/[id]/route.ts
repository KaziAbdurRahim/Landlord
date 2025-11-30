/**
 * Terms Detail API Route
 * 
 * Handles individual terms operations:
 * - GET: Get a specific terms
 * - PUT: Update terms (landlord only)
 * - DELETE: Delete terms (landlord only)
 * 
 * GET /api/terms/[id]
 * PUT /api/terms/[id]
 * DELETE /api/terms/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, findById, updateById, deleteById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { TermsAndConditions, Property } from "@/types";

/**
 * GET /api/terms/[id]
 * Get a specific terms
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const terms = await readJSON<TermsAndConditions[]>("terms.json");
    const term = findById(terms, params.id);

    if (!term) {
      return NextResponse.json(
        { success: false, message: "Terms not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      terms: term,
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
 * PUT /api/terms/[id]
 * Update terms (landlord only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    if (!tokenData || tokenData.role !== "landlord") {
      return NextResponse.json(
        { success: false, message: "Only landlords can update terms" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, propertyId, isActive } = body;

    // Load data
    const terms = await readJSON<TermsAndConditions[]>("terms.json");
    const properties = await readJSON<Property[]>("properties.json");

    // Find terms
    const term = findById(terms, params.id);
    if (!term) {
      return NextResponse.json(
        { success: false, message: "Terms not found" },
        { status: 404 }
      );
    }

    // Verify landlord owns this terms
    if (term.landlordId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "You don't own this terms" },
        { status: 403 }
      );
    }

    // If propertyId is provided, verify landlord owns it
    if (propertyId !== undefined) {
      if (propertyId) {
        const property = findById(properties, propertyId);
        if (!property || property.ownerId !== tokenData.userId) {
          return NextResponse.json(
            { success: false, message: "Property not found or you don't own it" },
            { status: 403 }
          );
        }
      }
    }

    // If activating, deactivate other active terms for same property/landlord
    if (isActive === true) {
      const oldTerms = terms.filter(
        (t) =>
          t.id !== params.id &&
          t.landlordId === tokenData.userId &&
          t.isActive &&
          (propertyId !== undefined
            ? propertyId
              ? t.propertyId === propertyId
              : !t.propertyId
            : term.propertyId
            ? t.propertyId === term.propertyId
            : !t.propertyId)
      );
      oldTerms.forEach((oldTerm) => {
        const index = terms.findIndex((t) => t.id === oldTerm.id);
        if (index !== -1) {
          terms[index].isActive = false;
        }
      });
    }

    // Update terms
    const updatedTerms = updateById(terms, params.id, {
      title: title !== undefined ? title : term.title,
      content: content !== undefined ? content : term.content,
      propertyId: propertyId !== undefined ? propertyId : term.propertyId,
      isActive: isActive !== undefined ? isActive : term.isActive,
      version: content !== undefined ? term.version + 1 : term.version, // Increment version if content changed
      updatedAt: Date.now(),
    });

    await writeJSON("terms.json", updatedTerms);

    const finalTerms = updatedTerms.find((t) => t.id === params.id)!;

    return NextResponse.json({
      success: true,
      message: "Terms updated successfully",
      terms: finalTerms,
    });
  } catch (error) {
    console.error("Update terms error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/terms/[id]
 * Delete terms (landlord only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    if (!tokenData || tokenData.role !== "landlord") {
      return NextResponse.json(
        { success: false, message: "Only landlords can delete terms" },
        { status: 403 }
      );
    }

    // Load data
    const terms = await readJSON<TermsAndConditions[]>("terms.json");

    // Find terms
    const term = findById(terms, params.id);
    if (!term) {
      return NextResponse.json(
        { success: false, message: "Terms not found" },
        { status: 404 }
      );
    }

    // Verify landlord owns this terms
    if (term.landlordId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "You don't own this terms" },
        { status: 403 }
      );
    }

    // Delete terms
    const updatedTerms = deleteById(terms, params.id);
    await writeJSON("terms.json", updatedTerms);

    return NextResponse.json({
      success: true,
      message: "Terms deleted successfully",
    });
  } catch (error) {
    console.error("Delete terms error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


/**
 * Notice Detail API Route
 * 
 * Handles individual notice operations:
 * - GET: Get a specific notice
 * - PUT: Update a notice (landlord only)
 * - DELETE: Delete a notice (landlord only)
 * 
 * GET /api/notices/[id]
 * PUT /api/notices/[id]
 * DELETE /api/notices/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, findById, updateById, deleteById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Notice, Property } from "@/types";

/**
 * GET /api/notices/[id]
 * Get a specific notice
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notices = await readJSON<Notice[]>("notices.json");
    const notice = findById(notices, params.id);

    if (!notice) {
      return NextResponse.json(
        { success: false, message: "Notice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notice,
    });
  } catch (error) {
    console.error("Get notice error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notices/[id]
 * Update a notice (landlord only)
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
        { success: false, message: "Only landlords can update notices" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, priority, propertyId } = body;

    // Load data
    const notices = await readJSON<Notice[]>("notices.json");
    const properties = await readJSON<Property[]>("properties.json");

    // Find notice
    const notice = findById(notices, params.id);
    if (!notice) {
      return NextResponse.json(
        { success: false, message: "Notice not found" },
        { status: 404 }
      );
    }

    // Verify landlord owns this notice
    if (notice.landlordId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "You don't own this notice" },
        { status: 403 }
      );
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ["normal", "important", "urgent"];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { success: false, message: "Invalid priority level" },
          { status: 400 }
        );
      }
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

    // Update notice
    const updatedNotice = updateById(notices, params.id, {
      title: title !== undefined ? title : notice.title,
      content: content !== undefined ? content : notice.content,
      priority: priority !== undefined ? priority : notice.priority,
      propertyId: propertyId !== undefined ? propertyId : notice.propertyId,
      updatedAt: Date.now(),
    });

    await writeJSON("notices.json", updatedNotice);

    const finalNotice = updatedNotice.find((n) => n.id === params.id)!;

    return NextResponse.json({
      success: true,
      message: "Notice updated successfully",
      notice: finalNotice,
    });
  } catch (error) {
    console.error("Update notice error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notices/[id]
 * Delete a notice (landlord only)
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
        { success: false, message: "Only landlords can delete notices" },
        { status: 403 }
      );
    }

    // Load data
    const notices = await readJSON<Notice[]>("notices.json");

    // Find notice
    const notice = findById(notices, params.id);
    if (!notice) {
      return NextResponse.json(
        { success: false, message: "Notice not found" },
        { status: 404 }
      );
    }

    // Verify landlord owns this notice
    if (notice.landlordId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "You don't own this notice" },
        { status: 403 }
      );
    }

    // Delete notice
    const updatedNotices = deleteById(notices, params.id);
    await writeJSON("notices.json", updatedNotices);

    return NextResponse.json({
      success: true,
      message: "Notice deleted successfully",
    });
  } catch (error) {
    console.error("Delete notice error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


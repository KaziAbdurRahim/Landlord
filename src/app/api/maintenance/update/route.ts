/**
 * Update Maintenance Request API Route
 * 
 * Allows landlords to update the status of maintenance requests
 * and add comments.
 * 
 * POST /api/maintenance/update
 * 
 * Request body:
 * {
 *   requestId: string,
 *   status: "pending" | "in_progress" | "fixed" | "rejected",
 *   comment?: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, findById, updateById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { MaintenanceRequest, Property } from "@/types";

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
        { success: false, message: "Only landlords can update maintenance requests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId, status, comment } = body;

    // Validate input
    if (!requestId || !status) {
      return NextResponse.json(
        { success: false, message: "Request ID and status are required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["pending", "in_progress", "fixed", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status" },
        { status: 400 }
      );
    }

    // Load data
    const requests = await readJSON<MaintenanceRequest[]>("maintenance_requests.json");
    const properties = await readJSON<Property[]>("properties.json");

    // Find request
    const maintenanceRequest = findById(requests, requestId);
    if (!maintenanceRequest) {
      return NextResponse.json(
        { success: false, message: "Maintenance request not found" },
        { status: 404 }
      );
    }

    // Verify landlord owns the property
    const property = findById(properties, maintenanceRequest.propertyId);
    if (!property || property.ownerId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "You don't own this property" },
        { status: 403 }
      );
    }

    // Update request
    const updatedRequest = updateById(requests, requestId, {
      status: status as MaintenanceRequest["status"],
      landlordComment: comment || maintenanceRequest.landlordComment,
      updatedAt: Date.now(),
    });

    await writeJSON("maintenance_requests.json", updatedRequest);

    const finalRequest = updatedRequest.find((r) => r.id === requestId)!;

    return NextResponse.json({
      success: true,
      message: "Maintenance request updated successfully",
      request: finalRequest,
    });
  } catch (error) {
    console.error("Update maintenance request error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


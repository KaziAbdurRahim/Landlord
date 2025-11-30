/**
 * Get Current User API Route
 * 
 * Returns the current authenticated user based on the token.
 * Used to verify authentication status and get user information.
 * 
 * GET /api/auth/me
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Response:
 * {
 *   success: boolean,
 *   user?: User object
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { User } from "@/types";

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Parse token to get user info
    const tokenData = parseToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    // Find user in database
    const users = await readJSON<User[]>("users.json");
    const user = users.find((u) => u.id === tokenData.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Return user without sensitive data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


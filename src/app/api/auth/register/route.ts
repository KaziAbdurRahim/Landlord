/**
 * Registration API Route
 * 
 * Handles user registration by creating a new user account.
 * 
 * POST /api/auth/register
 * 
 * Request body:
 * {
 *   name: string,
 *   email: string,
 *   role: "tenant" | "landlord" | "bank" | "ministry"
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   userId?: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, generateId } from "@/utils/jsonDb";
import { User } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, role } = body;

    // Validate required fields
    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, message: "Name, email, and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["tenant", "landlord", "bank", "ministry"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: "Invalid role" },
        { status: 400 }
      );
    }

    // Read existing users
    const users = await readJSON<User[]>("users.json");

    // Check if user with this email already exists
    const existingUser = users.find((u) => u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Create new user
    const newUser: User = {
      id: generateId("u"),
      name,
      email,
      role,
      verified: false, // User needs to verify email with OTP
      otp: null,
      createdAt: new Date().toISOString(),
    };

    // Save user to database
    users.push(newUser);
    await writeJSON("users.json", users);

    return NextResponse.json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      userId: newUser.id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


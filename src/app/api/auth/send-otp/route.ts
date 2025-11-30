/**
 * Send OTP API Route
 * 
 * Generates and sends an OTP code to the user's email.
 * In this mock system, the OTP is saved to mock_emails.json instead of
 * actually sending an email.
 * 
 * POST /api/auth/send-otp
 * 
 * Request body:
 * {
 *   email: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   otp?: string (only in development/mock mode)
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, generateId } from "@/utils/jsonDb";
import { generateOTP } from "@/utils/auth";
import { User, MockEmail } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const users = await readJSON<User[]>("users.json");
    const user = users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found. Please register first." },
        { status: 404 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Save OTP to mock_emails.json
    const mockEmails = await readJSON<MockEmail[]>("mock_emails.json");
    const newEmail: MockEmail = {
      id: generateId("email"),
      email,
      otp,
      expiresAt,
      used: false,
      createdAt: Date.now(),
    };

    mockEmails.push(newEmail);
    await writeJSON("mock_emails.json", mockEmails);

    // Update user's OTP in users.json (for quick lookup)
    const updatedUsers = users.map((u) =>
      u.id === user.id ? { ...u, otp } : u
    );
    await writeJSON("users.json", updatedUsers);

    console.log(`[Send OTP] Generated OTP for ${email}: ${otp}`); // Debug log

    // In production, you would send an actual email here
    // For mock system, we return the OTP in development
    return NextResponse.json({
      success: true,
      message: "OTP sent to your email",
      // In production, remove the otp from response
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


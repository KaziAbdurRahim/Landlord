/**
 * Verify OTP API Route
 * 
 * Verifies the OTP code entered by the user and creates an authentication token.
 * After successful verification, the user is marked as verified and can access
 * their dashboard.
 * 
 * POST /api/auth/verify
 * 
 * Request body:
 * {
 *   email: string,
 *   otp: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   token?: string,
 *   user?: User object
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, updateById } from "@/utils/jsonDb";
import { compareOTP, generateToken, isOTPValid } from "@/utils/auth";
import { User, MockEmail } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    // Validate input
    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Find user
    const users = await readJSON<User[]>("users.json");
    const user = users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check OTP from mock_emails.json
    const mockEmails = await readJSON<MockEmail[]>("mock_emails.json");
    const emailRecords = mockEmails
      .filter((e) => e.email === email && !e.used)
      .sort((a, b) => b.createdAt - a.createdAt); // Get most recent unused OTPs
    
    // If no unused OTPs, check if there are any OTPs at all for this email
    if (emailRecords.length === 0) {
      const allEmailsForUser = mockEmails.filter((e) => e.email === email);
      if (allEmailsForUser.length === 0) {
        return NextResponse.json(
          { success: false, message: "No OTP found. Please request a new one." },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { success: false, message: "OTP has already been used. Please request a new one." },
          { status: 400 }
        );
      }
    }

    const emailRecord = emailRecords[0];

    // Check if OTP has expired
    if (!isOTPValid(emailRecord.createdAt)) {
      return NextResponse.json(
        { success: false, message: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify OTP
    console.log(`[Verify OTP] Comparing: input="${otp}" vs stored="${emailRecord.otp}"`); // Debug log
    if (!compareOTP(otp, emailRecord.otp)) {
      console.log(`[Verify OTP] OTP mismatch for ${email}`); // Debug log
      return NextResponse.json(
        { success: false, message: "Invalid OTP. Please check and try again." },
        { status: 401 }
      );
    }

    console.log(`[Verify OTP] OTP verified successfully for ${email}`); // Debug log

    // Mark OTP as used
    const updatedEmails = mockEmails.map((e) =>
      e.id === emailRecord.id ? { ...e, used: true } : e
    );
    await writeJSON("mock_emails.json", updatedEmails);

    // Mark user as verified and clear OTP
    const updatedUsers = updateById(users, user.id, {
      verified: true,
      otp: null,
    });
    await writeJSON("users.json", updatedUsers);

    // Generate authentication token
    const token = generateToken(user.id, user.role);
    const updatedUser = updatedUsers.find((u) => u.id === user.id)!;

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      token,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        verified: updatedUser.verified,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


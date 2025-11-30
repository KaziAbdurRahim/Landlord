/**
 * Login Page
 * 
 * Allows users to log in using their email and OTP verification.
 * Flow: Enter email → Receive OTP → Enter OTP → Access dashboard
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import OTPInput from "@/components/OTPInput";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Handles email submission and sends OTP
   */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setStep("otp");
        // In development, show OTP in console for testing
        if (data.otp) {
          console.log("OTP (dev only):", data.otp);
        }
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles OTP verification and login
   */
  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log("Verify response:", data); // Debug log

      if (data.success && data.token && data.user) {
        // Store token in localStorage (mock authentication)
        try {
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          
          // Verify storage worked
          const storedToken = localStorage.getItem("authToken");
          const storedUser = localStorage.getItem("user");
          
          console.log("Authentication successful!"); // Debug log
          console.log("Token stored:", storedToken ? "Yes" : "No"); // Debug log
          console.log("User stored:", storedUser ? "Yes" : "No"); // Debug log
          console.log("User data:", data.user); // Debug log

          // Redirect to appropriate dashboard based on role
          const role = data.user.role;
          const dashboardPath = `/dashboard/${role}`;
          console.log("Redirecting to:", dashboardPath); // Debug log
          
          // Use window.location.href for immediate, reliable redirect
          // This ensures a full page reload and proper navigation
          window.location.href = dashboardPath;
        } catch (storageError) {
          console.error("Failed to store authentication:", storageError);
          setError("Failed to save authentication. Please try again.");
          setLoading(false);
        }
      } else {
        const errorMessage = data.message || "Invalid OTP";
        console.error("Verification failed:", errorMessage); // Debug log
        setError(errorMessage);
        setLoading(false);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Login to T-ODRE
        </h1>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              error={error}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </Button>
            <p className="text-sm text-center text-gray-600">
              Don't have an account?{" "}
              <a href="/auth/register" className="text-blue-600 hover:underline">
                Register
              </a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleOTPSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4 text-center">
                Enter the OTP sent to <strong>{email}</strong>
              </p>
              <OTPInput value={otp} onChange={setOtp} error={error} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError("");
              }}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Change email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


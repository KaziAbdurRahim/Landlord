/**
 * Registration Page
 * 
 * Allows new users to create an account by providing their information
 * and selecting a role. After registration, users must verify their email
 * with OTP before accessing the dashboard.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import OTPInput from "@/components/OTPInput";
import { UserRole } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("tenant");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Handles registration form submission
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Register user
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });

      const registerData = await registerResponse.json();

      if (!registerData.success) {
        setError(registerData.message || "Registration failed");
        setLoading(false);
        return;
      }

      // Step 2: Send OTP
      const otpResponse = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const otpData = await otpResponse.json();

      if (otpData.success) {
        setStep("otp");
        // In development, show OTP in console for testing
        if (otpData.otp) {
          console.log("OTP (dev only):", otpData.otp);
        }
      } else {
        setError(otpData.message || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles OTP verification after registration
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

      const data = await response.json();

      if (data.success && data.token && data.user) {
        // Store token in localStorage
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Redirect to appropriate dashboard
        router.push(`/dashboard/${data.user.role}`);
      } else {
        setError(data.message || "Invalid OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Create Account
        </h1>

        {step === "form" ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              type="text"
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
            <Input
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tenant">Tenant</option>
                <option value="landlord">Landlord</option>
                <option value="bank">Bank</option>
                <option value="ministry">Ministry</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>
            <p className="text-sm text-center text-gray-600">
              Already have an account?{" "}
              <a href="/auth/login" className="text-blue-600 hover:underline">
                Login
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
                setStep("form");
                setOtp("");
                setError("");
              }}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Back to registration
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


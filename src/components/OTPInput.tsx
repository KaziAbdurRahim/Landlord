/**
 * OTP Input Component
 * 
 * A specialized input component for entering OTP (One-Time Password) codes.
 * Provides a better UX with individual input boxes for each digit.
 * 
 * @param length - Number of OTP digits (default: 6)
 * @param value - Current OTP value
 * @param onChange - Callback when OTP value changes
 * @param error - Optional error message
 */

"use client";

import React, { useRef, useState, KeyboardEvent, ChangeEvent } from "react";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function OTPInput({
  length = 6,
  value,
  onChange,
  error,
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(
    value.split("").slice(0, length).concat(Array(length).fill("")).slice(0, length)
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /**
   * Handles input change for a specific OTP digit box
   * Automatically moves focus to the next box when a digit is entered
   */
  const handleChange = (index: number, newValue: string) => {
    // Only allow numeric input
    if (newValue && !/^\d$/.test(newValue)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = newValue;
    setOtp(newOtp);

    // Update parent component
    const otpString = newOtp.join("");
    onChange(otpString);

    // Move to next input if value entered
    if (newValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * Handles backspace key to move to previous input
   */
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * Handles paste event to fill all OTP boxes at once
   */
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, length);
    const pastedArray = pastedData.split("").filter((char) => /^\d$/.test(char));
    
    if (pastedArray.length > 0) {
      const newOtp = [...otp];
      pastedArray.forEach((char, index) => {
        if (index < length) {
          newOtp[index] = char;
        }
      });
      setOtp(newOtp);
      onChange(newOtp.join(""));
      
      // Focus the next empty input or the last one
      const nextIndex = Math.min(pastedArray.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 justify-center">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otp[index] || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleChange(index, e.target.value)
            }
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
              handleKeyDown(index, e)
            }
            onPaste={handlePaste}
            className={`
              w-12 h-12 text-center text-lg font-semibold
              border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${error ? "border-red-500" : "border-gray-300"}
            `}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}


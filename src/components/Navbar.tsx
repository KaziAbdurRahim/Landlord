/**
 * Navbar Component
 *
 * Top navigation bar component displayed on all dashboard pages.
 * Shows user information and provides logout functionality.
 *
 * @param user - Current authenticated user object
 * @param onLogout - Callback function when user clicks logout
 */

"use client";

import React from "react";
import { User } from "@/types";
import Button from "./Button";

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  // Get role display name with proper capitalization
  const roleDisplay = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - App name */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-blue-600">T-ODRE</h1>
            <span className="ml-2 text-sm text-gray-500">Landlord</span>
          </div>

          {/* Right side - User info and logout */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-500">{roleDisplay} Dashboard</p>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

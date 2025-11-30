/**
 * Dashboard Layout Component
 * 
 * Shared layout component for all dashboard pages.
 * Provides consistent navigation (Navbar + Sidebar) and handles
 * authentication checks and logout functionality.
 * 
 * @param children - Dashboard page content
 * @param role - User role for sidebar navigation
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, UserRole } from "@/types";
import { getCurrentUser, clearAuth } from "@/lib/auth";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
      // No user found, redirect to login
      router.push("/auth/login");
      return;
    }

    // Check if user role matches the dashboard they're trying to access
    if (currentUser.role !== role) {
      // Role mismatch, redirect to correct dashboard
      router.push(`/dashboard/${currentUser.role}`);
      return;
    }

    setUser(currentUser);
    setLoading(false);
  }, [router, role]);

  /**
   * Handles user logout
   * Clears authentication data and redirects to login
   */
  const handleLogout = () => {
    clearAuth();
    router.push("/auth/login");
  };

  // Show loading state while checking authentication
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-800">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="flex">
        <Sidebar role={role} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}


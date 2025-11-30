/**
 * Client-Side Authentication Utilities
 * 
 * Helper functions for managing authentication state on the client side.
 * These functions interact with localStorage to store and retrieve
 * authentication tokens and user information.
 * 
 * Note: In production, use secure HTTP-only cookies instead of localStorage.
 */

import { User } from "@/types";

/**
 * Gets the authentication token from localStorage
 * 
 * @returns Token string or null if not found
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

/**
 * Gets the current user from localStorage
 * 
 * @returns User object or null if not found
 */
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Sets authentication token and user in localStorage
 * 
 * @param token - Authentication token
 * @param user - User object
 */
export function setAuth(token: string, user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("authToken", token);
  localStorage.setItem("user", JSON.stringify(user));
}

/**
 * Clears authentication data from localStorage
 * Used when user logs out
 */
export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
}

/**
 * Checks if user is authenticated
 * 
 * @returns true if token and user exist, false otherwise
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null && getCurrentUser() !== null;
}


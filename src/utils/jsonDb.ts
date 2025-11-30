/**
 * JSON Database Utility Functions
 * 
 * This module provides helper functions to read from and write to JSON files
 * that serve as a mock database. In production, these would be replaced with
 * actual database queries (e.g., SQL, MongoDB).
 * 
 * The functions handle file I/O operations and provide a simple interface
 * for CRUD operations on JSON data files.
 */

import { promises as fs } from "fs";
import path from "path";

/**
 * Base directory where all JSON database files are stored
 * All data files are kept in the /src/data directory
 */
const DATA_DIR = path.join(process.cwd(), "src", "data");

/**
 * Reads a JSON file from the data directory and parses it
 * 
 * @param filename - Name of the JSON file (e.g., "users.json")
 * @returns Promise that resolves to the parsed JSON data
 * @throws Error if file doesn't exist or cannot be read
 * 
 * Usage:
 * const users = await readJSON<User[]>("users.json");
 */
export async function readJSON<T>(filename: string): Promise<T> {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const fileContents = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContents) as T;
  } catch (error) {
    // If file doesn't exist, return empty array as default
    // This allows the system to work even if files haven't been created yet
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [] as unknown as T;
    }
    throw error;
  }
}

/**
 * Writes data to a JSON file in the data directory
 * 
 * @param filename - Name of the JSON file (e.g., "users.json")
 * @param data - Data to write (will be JSON stringified)
 * @returns Promise that resolves when write is complete
 * @throws Error if file cannot be written
 * 
 * Usage:
 * await writeJSON("users.json", users);
 */
export async function writeJSON<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  
  // Ensure the data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  // Write data with pretty formatting (2-space indent)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Generates a unique ID for new records
 * 
 * Format: prefix + timestamp + random number
 * This ensures uniqueness even with concurrent operations
 * 
 * @param prefix - Single character prefix (e.g., "u" for user, "p" for property)
 * @returns Unique ID string
 * 
 * Usage:
 * const userId = generateId("u"); // Returns something like "u1704123456789"
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}${timestamp}${random}`;
}

/**
 * Finds a record by ID in a JSON array
 * 
 * @param data - Array of objects with an 'id' property
 * @param id - ID to search for
 * @returns The found object or undefined if not found
 * 
 * Usage:
 * const user = findById(users, "u1");
 */
export function findById<T extends { id: string }>(
  data: T[],
  id: string
): T | undefined {
  return data.find((item) => item.id === id);
}

/**
 * Updates a record in a JSON array by ID
 * 
 * @param data - Array of objects with an 'id' property
 * @param id - ID of the record to update
 * @param updates - Partial object with fields to update
 * @returns Updated array with the modified record
 * 
 * Usage:
 * const updatedUsers = updateById(users, "u1", { verified: true });
 */
export function updateById<T extends { id: string }>(
  data: T[],
  id: string,
  updates: Partial<T>
): T[] {
  return data.map((item) => (item.id === id ? { ...item, ...updates } : item));
}

/**
 * Deletes a record from a JSON array by ID
 * 
 * @param data - Array of objects with an 'id' property
 * @param id - ID of the record to delete
 * @returns New array without the deleted record
 * 
 * Usage:
 * const remainingUsers = deleteById(users, "u1");
 */
export function deleteById<T extends { id: string }>(
  data: T[],
  id: string
): T[] {
  return data.filter((item) => item.id !== id);
}


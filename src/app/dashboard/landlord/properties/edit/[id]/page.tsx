/**
 * Edit Property Page for Landlords
 * 
 * Allows landlords to edit existing rental properties.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { Property } from "@/types";

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    rent: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchProperty();
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/properties", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const property = result.properties.find((p: Property) => p.id === propertyId);
          if (property) {
            setFormData({
              address: property.address,
              rent: property.rent.toString(),
              description: property.description || "",
              startDate: property.startDate || "",
              endDate: property.endDate || "",
            });
          } else {
            setError("Property not found");
          }
        }
      }
    } catch (err) {
      console.error("Error fetching property:", err);
      setError("Failed to load property");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    // Validate rent is a number
    const rent = parseFloat(formData.rent);
    if (isNaN(rent) || rent <= 0) {
      setError("Rent must be a positive number");
      setSaving(false);
      return;
    }

    // Validate dates if provided
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        setError("Start date cannot be in the past");
        setSaving(false);
        return;
      }

      if (endDate <= startDate) {
        setError("End date must be after start date");
        setSaving(false);
        return;
      }

      // Calculate months difference
      const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                         (endDate.getMonth() - startDate.getMonth());
      
      if (monthsDiff < 2) {
        setError("Rental period must be at least 2 months");
        setSaving(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: formData.address,
          rent: rent,
          description: formData.description,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard/landlord");
        }, 2000);
      } else {
        setError(data.message || "Failed to update property");
      }
    } catch (err) {
      console.error("Error updating property:", err);
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="landlord">
        <div className="text-center">Loading property...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="landlord">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Edit Property</h1>
          <Button variant="outline" onClick={() => router.push("/dashboard/landlord")}>
            Back to Dashboard
          </Button>
        </div>

        <Card>
          {success ? (
            <div className="text-center py-8">
              <div className="text-green-600 text-5xl mb-4">✓</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Property Updated Successfully!
              </h2>
              <p className="text-gray-600">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                label="Property Address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="e.g., Mirpur 10, Dhaka"
                required
              />

              <Input
                type="number"
                label="Monthly Rent (৳)"
                value={formData.rent}
                onChange={(e) =>
                  setFormData({ ...formData, rent: e.target.value })
                }
                placeholder="12000"
                required
                min="1"
                step="1"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., 2-bedroom apartment, fully furnished..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Available Start Date"
                  value={formData.startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setFormData({ ...formData, startDate: newStartDate });
                    // Auto-calculate minimum end date (2 months from start)
                    if (newStartDate) {
                      const start = new Date(newStartDate);
                      const minEndDate = new Date(start);
                      minEndDate.setMonth(minEndDate.getMonth() + 2);
                      const minEndDateStr = minEndDate.toISOString().split("T")[0];
                      if (!formData.endDate || formData.endDate < minEndDateStr) {
                        setFormData({ ...formData, startDate: newStartDate, endDate: minEndDateStr });
                      } else {
                        setFormData({ ...formData, startDate: newStartDate });
                      }
                    }
                  }}
                  min={new Date().toISOString().split("T")[0]}
                />

                <Input
                  type="date"
                  label="Available End Date (Min 2 months from start)"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  min={formData.startDate ? (() => {
                    const start = new Date(formData.startDate);
                    start.setMonth(start.getMonth() + 2);
                    return start.toISOString().split("T")[0];
                  })() : new Date().toISOString().split("T")[0]}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Updating Property..." : "Update Property"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/landlord")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}


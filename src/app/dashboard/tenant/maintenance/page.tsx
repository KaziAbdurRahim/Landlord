/**
 * Tenant Maintenance Requests Page
 * 
 * Allows tenants to report maintenance issues to their landlord
 * and track the status of their requests.
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { Rental, Property, MaintenanceRequest } from "@/types";

interface MaintenanceRequestWithDetails extends MaintenanceRequest {
  landlord: {
    id: string;
    name: string;
    email: string;
  } | null;
  property: {
    id: string;
    address: string;
  } | null;
}

export default function TenantMaintenancePage() {
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      
      // Fetch tenant dashboard data
      const dashboardResponse = await fetch("/api/dashboard/tenant", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        if (dashboardData.success) {
          setRental(dashboardData.data.currentRental);
          setProperty(dashboardData.data.property);
        }
      }

      // Fetch maintenance requests
      const requestsResponse = await fetch("/api/maintenance?role=tenant", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        if (requestsData.success) {
          setRequests(requestsData.requests || []);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rentalId: rental.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Maintenance request submitted successfully!" });
        setShowForm(false);
        setFormData({ title: "", description: "", priority: "medium" });
        fetchData();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to submit request" });
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fixed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="tenant">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!rental || !property) {
    return (
      <DashboardLayout role="tenant">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">You don't have an active rental property.</p>
            <Button onClick={() => window.location.href = "/dashboard/tenant/properties"}>
              Find Properties
            </Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="tenant">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Maintenance Requests</h1>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>Report New Issue</Button>
          )}
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Property Information */}
        <Card title="Property Information">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-semibold">{property.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Landlord</p>
              <p className="font-semibold">
                {requests[0]?.landlord?.name || "N/A"}
              </p>
            </div>
          </div>
        </Card>

        {/* Request Form */}
        {showForm && (
          <Card title="Report Maintenance Issue">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                label="Issue Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Leaky faucet in kitchen"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the problem in detail..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as typeof formData.priority,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ title: "", description: "", priority: "medium" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Requests List */}
        <Card title={`My Requests (${requests.length})`}>
          {requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{request.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(
                          request.priority
                        )}`}
                      >
                        {request.priority.toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {request.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3">{request.description}</p>

                  {request.landlordComment && (
                    <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                      <p className="text-sm font-semibold text-blue-800 mb-1">
                        Landlord Response:
                      </p>
                      <p className="text-sm text-blue-700">{request.landlordComment}</p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    Last updated: {new Date(request.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No maintenance requests yet</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}


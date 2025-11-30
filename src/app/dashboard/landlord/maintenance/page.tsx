/**
 * Landlord Maintenance Management Page
 * 
 * Allows landlords to view, review, and update maintenance requests from tenants.
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { MaintenanceRequest, Property, User } from "@/types";

interface MaintenanceRequestWithDetails extends MaintenanceRequest {
  tenant: {
    id: string;
    name: string;
    email: string;
  } | null;
  property: {
    id: string;
    address: string;
  } | null;
}

export default function LandlordMaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestWithDetails | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<MaintenanceRequest["status"]>("pending");
  const [comment, setComment] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/maintenance?role=landlord", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRequests(data.requests || []);
        }
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRequest = (request: MaintenanceRequestWithDetails) => {
    setSelectedRequest(request);
    setUpdateStatus(request.status);
    setComment(request.landlordComment || "");
    setShowUpdateForm(true);
    setMessage(null);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setUpdating(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/maintenance/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          status: updateStatus,
          comment: comment || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Maintenance request updated successfully!" });
        setShowUpdateForm(false);
        setSelectedRequest(null);
        setComment("");
        fetchRequests();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to update request" });
      }
    } catch (error) {
      console.error("Error updating request:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setUpdating(false);
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

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const fixedCount = requests.filter((r) => r.status === "fixed").length;

  if (loading) {
    return (
      <DashboardLayout role="landlord">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="landlord">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Maintenance Requests</h1>

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

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Fixed</p>
            <p className="text-2xl font-bold text-green-600">{fixedCount}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requests List */}
          <div className="lg:col-span-2 space-y-4">
            {requests.length > 0 ? (
              requests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{request.title}</h3>
                      <p className="text-sm text-gray-500">
                        From: {request.tenant?.name || "Unknown"}
                      </p>
                      <p className="text-sm text-gray-500">
                        Property: {request.property?.address || "Unknown"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
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
                    <div className="mb-3 p-2 bg-blue-50 rounded border-l-4 border-blue-500">
                      <p className="text-sm font-semibold text-blue-800 mb-1">
                        Your Response:
                      </p>
                      <p className="text-sm text-blue-700">{request.landlordComment}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-400">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleSelectRequest(request)}
                    >
                      {request.status === "pending" ? "Review" : "Update Status"}
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card>
                <p className="text-gray-500 text-center py-8">No maintenance requests</p>
              </Card>
            )}
          </div>

          {/* Update Form Sidebar */}
          {showUpdateForm && selectedRequest && (
            <div className="lg:col-span-1">
              <Card title="Update Request">
                <form onSubmit={handleUpdateStatus} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={updateStatus}
                      onChange={(e) =>
                        setUpdateStatus(e.target.value as MaintenanceRequest["status"])
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="fixed">Fixed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comment (Optional)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment or note about the status update..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={updating}>
                      {updating ? "Updating..." : "Update Status"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowUpdateForm(false);
                        setSelectedRequest(null);
                        setComment("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}


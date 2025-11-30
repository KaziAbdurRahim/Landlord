/**
 * Tenant Rental Management Page
 * 
 * Allows tenants to stop (terminate) or renew their rental contracts.
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { Rental, RentalTermination, RentalRenewal } from "@/types";

export default function TenantRentalManagementPage() {
  const [activeRental, setActiveRental] = useState<Rental | null>(null);
  const [termination, setTermination] = useState<RentalTermination | null>(null);
  const [renewal, setRenewal] = useState<RentalRenewal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTerminateForm, setShowTerminateForm] = useState(false);
  const [showRenewForm, setShowRenewForm] = useState(false);
  const [terminateForm, setTerminateForm] = useState({
    requestedEndDate: "",
    reason: "",
  });
  const [renewForm, setRenewForm] = useState({
    renewalDuration: 12,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/dashboard/tenant", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.activeRental) {
          setActiveRental(data.data.activeRental);
          
          // Fetch termination and renewal status
          fetchTerminationStatus(data.data.activeRental.id);
          fetchRenewalStatus(data.data.activeRental.id);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTerminationStatus = async (rentalId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/rentals/terminations?rentalId=${rentalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.terminations.length > 0) {
          setTermination(data.terminations[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching termination:", error);
    }
  };

  const fetchRenewalStatus = async (rentalId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/rentals/renewals?rentalId=${rentalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.renewals.length > 0) {
          setRenewal(data.renewals[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching renewal:", error);
    }
  };

  const handleTerminate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/rentals/terminate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rentalId: activeRental?.id,
          requestedEndDate: terminateForm.requestedEndDate,
          reason: terminateForm.reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Termination request submitted successfully. Your rental will end on the requested date.",
        });
        setShowTerminateForm(false);
        setTerminateForm({ requestedEndDate: "", reason: "" });
        fetchData();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to submit termination request" });
      }
    } catch (error) {
      console.error("Error terminating rental:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/rentals/renew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rentalId: activeRental?.id,
          renewalDuration: renewForm.renewalDuration,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Renewal request submitted successfully. Waiting for landlord approval.",
        });
        setShowRenewForm(false);
        setRenewForm({ renewalDuration: 12 });
        fetchData();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to submit renewal request" });
      }
    } catch (error) {
      console.error("Error renewing rental:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate minimum date (2 months from today)
  const getMinTerminationDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 2);
    return date.toISOString().split("T")[0];
  };

  if (loading) {
    return (
      <DashboardLayout role="tenant">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!activeRental) {
    return (
      <DashboardLayout role="tenant">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No active rental found.</p>
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
        <h1 className="text-3xl font-bold text-gray-800">Rental Management</h1>

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

        {/* Current Rental Info */}
        <Card title="Current Rental">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-semibold ${
                activeRental.status === "active" ? "text-green-600" :
                activeRental.status === "terminating" ? "text-orange-600" :
                activeRental.status === "renewal_pending" ? "text-blue-600" :
                "text-gray-600"
              }`}>
                {activeRental.status.toUpperCase().replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Start Date:</span>
              <span className="font-semibold">
                {new Date(activeRental.startDate).toLocaleDateString()}
              </span>
            </div>
            {activeRental.endDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">End Date:</span>
                <span className="font-semibold">
                  {new Date(activeRental.endDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Termination Status */}
        {termination && (
          <Card title="Termination Request">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${
                  termination.status === "approved" ? "text-green-600" :
                  termination.status === "rejected" ? "text-red-600" :
                  "text-yellow-600"
                }`}>
                  {termination.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Requested End Date:</span>
                <span className="font-semibold">
                  {new Date(termination.requestedEndDate).toLocaleDateString()}
                </span>
              </div>
              {termination.reason && (
                <div>
                  <span className="text-gray-600">Reason:</span>
                  <p className="mt-1 text-gray-800">{termination.reason}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Renewal Status */}
        {renewal && (
          <Card title="Renewal Request">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${
                  renewal.status === "approved" ? "text-green-600" :
                  renewal.status === "rejected" ? "text-red-600" :
                  "text-yellow-600"
                }`}>
                  {renewal.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Renewal Duration:</span>
                <span className="font-semibold">{renewal.renewalDuration} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Requested Start Date:</span>
                <span className="font-semibold">
                  {new Date(renewal.requestedStartDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        {activeRental.status === "active" && !termination && !renewal && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Terminate Rental">
              <p className="text-sm text-gray-600 mb-4">
                Request to end your rental contract. You must provide at least 2 months notice.
              </p>
              {!showTerminateForm ? (
                <Button onClick={() => setShowTerminateForm(true)} variant="danger">
                  Request Termination
                </Button>
              ) : (
                <form onSubmit={handleTerminate} className="space-y-4">
                  <Input
                    type="date"
                    label="Termination Date"
                    value={terminateForm.requestedEndDate}
                    onChange={(e) => setTerminateForm({ ...terminateForm, requestedEndDate: e.target.value })}
                    min={getMinTerminationDate()}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason (Optional)
                    </label>
                    <textarea
                      value={terminateForm.reason}
                      onChange={(e) => setTerminateForm({ ...terminateForm, reason: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Enter reason for termination..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting} className="flex-1">
                      {submitting ? "Submitting..." : "Submit Request"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowTerminateForm(false);
                        setTerminateForm({ requestedEndDate: "", reason: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </Card>

            <Card title="Renew Rental">
              <p className="text-sm text-gray-600 mb-4">
                Request to renew your rental contract. Duration can be 1-24 months. Requires landlord approval.
              </p>
              {!showRenewForm ? (
                <Button onClick={() => setShowRenewForm(true)} variant="primary">
                  Request Renewal
                </Button>
              ) : (
                <form onSubmit={handleRenew} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Renewal Duration (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={renewForm.renewalDuration}
                      onChange={(e) => setRenewForm({ ...renewForm, renewalDuration: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum: 1 month, Maximum: 24 months</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting} className="flex-1">
                      {submitting ? "Submitting..." : "Submit Request"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowRenewForm(false);
                        setRenewForm({ renewalDuration: 12 });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


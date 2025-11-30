/**
 * Tenant Dashboard Page
 * 
 * Main dashboard for tenants showing:
 * - Current rented property information
 * - Landlord contact details
 * - Payment history
 * - Download receipts (mock)
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Table from "@/components/Table";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { TenantDashboardData, Payment } from "@/types";

export default function TenantDashboard() {
  const [data, setData] = useState<TenantDashboardData | null>(null);
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
    // Fetch tenant dashboard data
    fetchData();
  }, []);

  /**
   * Fetches tenant dashboard data from API
   * In a real app, this would call an API endpoint
   */
  const fetchData = async () => {
    try {
      // For now, we'll use mock data structure
      // In production, this would be an API call
      const userStr = localStorage.getItem("user");
      if (!userStr) return;

      const user = JSON.parse(userStr);
      
      // Mock API call - in production, replace with actual API
      const response = await fetch("/api/dashboard/tenant", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        // Fallback to mock data if API fails
        setData({
          user,
          currentRental: null,
          property: null,
          landlord: null,
          paymentHistory: [],
          totalPaid: 0,
          onTimePayments: 0,
          latePayments: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching tenant data:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate to receipt page for download
   */
  const downloadReceipt = (payment: Payment) => {
    window.location.href = `/dashboard/tenant/receipt/${payment.id}`;
  };

  /**
   * Handle rental termination
   */
  const handleTerminate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.currentRental) return;

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
          rentalId: data.currentRental.id,
          requestedEndDate: terminateForm.requestedEndDate,
          reason: terminateForm.reason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: "success",
          text: "Termination request submitted successfully. Your rental will end on the requested date.",
        });
        setShowTerminateForm(false);
        setTerminateForm({ requestedEndDate: "", reason: "" });
        fetchData();
      } else {
        setMessage({ type: "error", text: result.message || "Failed to submit termination request" });
      }
    } catch (error) {
      console.error("Error terminating rental:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle rental renewal
   */
  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.currentRental) return;

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
          rentalId: data.currentRental.id,
          renewalDuration: renewForm.renewalDuration,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: "success",
          text: "Renewal request submitted successfully. Waiting for landlord approval.",
        });
        setShowRenewForm(false);
        setRenewForm({ renewalDuration: 12 });
        fetchData();
      } else {
        setMessage({ type: "error", text: result.message || "Failed to submit renewal request" });
      }
    } catch (error) {
      console.error("Error renewing rental:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Calculate minimum termination date (2 months from today)
   */
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

  if (!data) {
    return (
      <DashboardLayout role="tenant">
        <div className="text-center text-red-600">Error loading dashboard data</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="tenant">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Tenant Dashboard</h1>

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

        {/* Current Property Information */}
        <Card title="Current Property">
          {data.currentRental && data.property ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {data.property.address}
                </h3>
                {data.property.description && (
                  <p className="text-gray-600">{data.property.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Monthly Rent</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ৳{data.property.rent.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rental Start Date</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {new Date(data.currentRental.startDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm text-gray-500">Rental End Date</p>
                <p className="text-lg font-semibold text-gray-800">
                  {data.currentRental.endDate 
                    ? new Date(data.currentRental.endDate).toLocaleDateString() 
                    : "Ongoing"}
                </p>
                {data.currentRental.status === "renewal_pending" && (
                  <p className="text-xs text-blue-600 mt-1">(Renewal pending - end date will be updated upon approval)</p>
                )}
                {data.currentRental.status === "terminating" && data.terminationRequest && (
                  <p className="text-xs text-orange-600 mt-1">
                    (Termination request: {data.terminationRequest.status.toUpperCase()} - end date updated to {new Date(data.currentRental.endDate || "").toLocaleDateString()})
                  </p>
                )}
              </div>

              {data.landlord && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">Landlord</p>
                  <p className="font-semibold text-gray-800">{data.landlord.name}</p>
                  <p className="text-sm text-gray-600">{data.landlord.email}</p>
                </div>
              )}

              {/* Rental Status */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Rental Status</p>
                <span className={`px-3 py-1 rounded text-sm font-semibold ${
                  data.currentRental.status === "active" ? "bg-green-100 text-green-800" :
                  data.currentRental.status === "terminating" ? "bg-orange-100 text-orange-800" :
                  data.currentRental.status === "renewal_pending" ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {data.currentRental.status.toUpperCase().replace("_", " ")}
                </span>
                {data.currentRental.status === "terminating" && data.terminationRequest && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm font-semibold text-orange-800 mb-1">Termination Request Status</p>
                    <p className="text-xs text-orange-700 mb-2">
                      Status: <span className="font-semibold">{data.terminationRequest.status.toUpperCase()}</span>
                    </p>
                    {data.terminationRequest.requestedEndDate && (
                      <p className="text-xs text-orange-700 mb-2">
                        Requested End Date: <span className="font-semibold">
                          {new Date(data.terminationRequest.requestedEndDate).toLocaleDateString()}
                        </span>
                      </p>
                    )}
                    {data.terminationRequest.reason && (
                      <p className="text-xs text-orange-700">
                        Reason: {data.terminationRequest.reason}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {data.currentRental.status === "active" && (
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  {!showTerminateForm && !showRenewForm && (
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        onClick={() => setShowTerminateForm(true)}
                        className="flex-1"
                      >
                        Cancel Rental
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => setShowRenewForm(true)}
                        className="flex-1"
                      >
                        Renew Rental
                      </Button>
                    </div>
                  )}

                  {/* Termination Form */}
                  {showTerminateForm && (
                    <form onSubmit={handleTerminate} className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-800">Request Termination</h4>
                      <p className="text-xs text-gray-600">
                        You must provide at least 2 months notice before termination date.
                      </p>
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
                          rows={2}
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

                  {/* Renewal Form */}
                  {showRenewForm && (
                    <form onSubmit={handleRenew} className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-800">Request Renewal</h4>
                      <p className="text-xs text-gray-600">
                        Request to renew your rental contract. Duration can be 1-24 months. Requires landlord approval.
                      </p>
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
                </div>
              )}

              {/* Renewal Pending Notice */}
              {data.currentRental.status === "renewal_pending" && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-600 font-semibold">⏳ Renewal Request Under Review</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Your renewal request is pending landlord approval. The property information will remain visible during this process.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">No active rental property</p>
              <Button onClick={() => window.location.href = "/dashboard/tenant/properties"}>
                Find Properties
              </Button>
            </div>
          )}
        </Card>

        {/* Payment Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">
              ৳{data.totalPaid.toLocaleString()}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">On-Time Payments</p>
            <p className="text-2xl font-bold text-blue-600">{data.onTimePayments}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Late Payments</p>
            <p className="text-2xl font-bold text-red-600">{data.latePayments}</p>
          </Card>
        </div>

        {/* Payment History */}
        <Card title="Payment History">
          {data.paymentHistory.length > 0 ? (
            <Table
              headers={["Month", "Amount", "Status", "Date", "Action"]}
              rows={data.paymentHistory.map((payment) => [
                payment.month,
                `৳${payment.amount.toLocaleString()}`,
                <span
                  key={payment.id}
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    payment.status === "paid"
                      ? "bg-green-100 text-green-800"
                      : payment.status === "overdue"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {payment.status.toUpperCase()}
                </span>,
                new Date(payment.timestamp).toLocaleDateString(),
                <Button
                  key={payment.id}
                  size="sm"
                  variant="outline"
                  onClick={() => downloadReceipt(payment)}
                >
                  Download Receipt
                </Button>,
              ])}
            />
          ) : (
            <p className="text-gray-500">No payment history available</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}


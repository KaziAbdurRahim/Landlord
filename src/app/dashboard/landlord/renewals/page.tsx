/**
 * Landlord Renewal Requests Page
 * 
 * Allows landlords to view and approve/reject renewal requests from tenants.
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Table from "@/components/Table";
import Button from "@/components/Button";
import { RentalRenewal, Rental, Property, User } from "@/types";

export default function LandlordRenewalsPage() {
  const [renewals, setRenewals] = useState<(RentalRenewal & { rental: Rental; property: Property; tenant: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchRenewals();
  }, []);

  const fetchRenewals = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/rentals/renewals/landlord", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRenewals(data.renewals || []);
        } else {
          setMessage({ type: "error", text: data.message || "Failed to load renewals" });
        }
      } else {
        const errorData = await response.json();
        setMessage({ type: "error", text: errorData.message || "Failed to load renewals" });
      }
    } catch (error) {
      console.error("Error fetching renewals:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (renewalId: string) => {
    setProcessing(renewalId);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/rentals/renewal/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ renewalId, approve: true }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Renewal request approved successfully!" });
        fetchRenewals();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to approve renewal" });
      }
    } catch (error) {
      console.error("Error approving renewal:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (renewalId: string) => {
    setProcessing(renewalId);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/rentals/renewal/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ renewalId, approve: false }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Renewal request rejected." });
        fetchRenewals();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to reject renewal" });
      }
    } catch (error) {
      console.error("Error rejecting renewal:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="landlord">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  const pendingRenewals = renewals.filter((r) => r.status === "pending");
  const processedRenewals = renewals.filter((r) => r.status !== "pending");

  return (
    <DashboardLayout role="landlord">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Renewal Requests</h1>

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

        {/* Pending Renewals */}
        {pendingRenewals.length > 0 && (
          <Card title={`Pending Renewal Requests (${pendingRenewals.length})`}>
            <div className="space-y-4">
              {pendingRenewals.map((renewal) => (
                <div
                  key={renewal.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="grid grid-cols-4 gap-4 items-start">
                    <div>
                      <p className="text-sm text-gray-500">Tenant</p>
                      <p className="font-semibold">{renewal.tenant.name}</p>
                      <p className="text-xs text-gray-400">{renewal.tenant.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Property</p>
                      <p className="font-semibold">{renewal.property.address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Renewal Details</p>
                      <p className="font-semibold">{renewal.renewalDuration} months</p>
                      <p className="text-xs text-gray-400">
                        Start: {new Date(renewal.requestedStartDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        End: {new Date(
                          new Date(renewal.requestedStartDate).setMonth(
                            new Date(renewal.requestedStartDate).getMonth() + renewal.renewalDuration
                          )
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApprove(renewal.id)}
                        disabled={processing === renewal.id}
                      >
                        {processing === renewal.id ? "Processing..." : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleReject(renewal.id)}
                        disabled={processing === renewal.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Processed Renewals */}
        {processedRenewals.length > 0 && (
          <Card title={`Processed Renewals (${processedRenewals.length})`}>
            <Table
              headers={["Tenant", "Property", "Duration", "Start Date", "Status"]}
              rows={processedRenewals.map((renewal) => [
                renewal.tenant.name,
                renewal.property.address,
                `${renewal.renewalDuration} months`,
                new Date(renewal.requestedStartDate).toLocaleDateString(),
                <span
                  key={renewal.id}
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    renewal.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {renewal.status.toUpperCase()}
                </span>,
              ])}
            />
          </Card>
        )}

        {renewals.length === 0 && (
          <Card>
            <p className="text-gray-500 text-center py-8">No renewal requests found.</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}


/**
 * Landlord Rentals Page
 * 
 * Detailed view of all rentals (active, pending, completed).
 */

"use client";

import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Table from "@/components/Table";
import { useEffect, useState } from "react";
import { LandlordDashboardData } from "@/types";

export default function LandlordRentalsPage() {
  const [data, setData] = useState<LandlordDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/landlord", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setData(result.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="landlord">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout role="landlord">
        <div className="text-center text-red-600">Error loading data</div>
      </DashboardLayout>
    );
  }

  const allRentals = [...data.activeRentals, ...data.pendingRequests];

  return (
    <DashboardLayout role="landlord">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">All Rentals</h1>
        <Card title="Rental Agreements">
          {allRentals.length > 0 ? (
            <Table
              headers={["Tenant", "Property", "Monthly Rent", "Start Date", "End Date", "Status"]}
              rows={allRentals.map((rental) => {
                const property = data.properties.find(
                  (p) => p.id === rental.propertyId
                );
                const tenant = data.tenants.find((t) => t.id === rental.tenantId);
                return [
                  tenant?.name || "Unknown",
                  property?.address || "Unknown",
                  `৳${rental.monthlyRent.toLocaleString()}`,
                  rental.startDate ? new Date(rental.startDate).toLocaleDateString() : "-",
                  rental.endDate ? new Date(rental.endDate).toLocaleDateString() : "Ongoing",
                  <span
                    key={rental.id}
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      rental.status === "active"
                        ? "bg-green-100 text-green-800"
                        : rental.status === "renewal_pending"
                        ? "bg-blue-100 text-blue-800"
                        : rental.status === "terminating"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {rental.status.toUpperCase()}
                  </span>,
                ];
              })}
            />
          ) : (
            <p className="text-gray-500">No rentals found</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}


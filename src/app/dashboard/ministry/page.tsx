/**
 * Ministry Dashboard Page
 * 
 * Main dashboard for ministry/authority showing:
 * - System-wide statistics
 * - Total users, properties, rentals
 * - Compliance tracking
 * - Rent map by area
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Table from "@/components/Table";
import { MinistryDashboardData } from "@/types";

export default function MinistryDashboard() {
  const [data, setData] = useState<MinistryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMinistryData();
  }, []);

  const fetchMinistryData = async () => {
    try {
      const response = await fetch("/api/dashboard/ministry", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error("Error fetching ministry data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <DashboardLayout role="ministry">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout role="ministry">
        <div className="text-center text-red-600">Error loading dashboard data</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ministry">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Ministry Dashboard</h1>

        {/* System Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Tenants</p>
            <p className="text-3xl font-bold text-blue-600">{data.totalTenants}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Landlords</p>
            <p className="text-3xl font-bold text-green-600">
              {data.totalLandlords}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Active Rentals</p>
            <p className="text-3xl font-bold text-purple-600">
              {data.activeRentals}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Properties</p>
            <p className="text-3xl font-bold">{data.totalProperties}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600">
              ৳{data.totalRevenue.toLocaleString()}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Compliance Rate</p>
            <p
              className={`text-3xl font-bold ${getComplianceColor(
                data.complianceRate
              )}`}
            >
              {data.complianceRate}%
            </p>
          </Card>
        </div>

        {/* Rent Map */}
        <Card title="Rent Map by Area">
          {data.rentMap.length > 0 ? (
            <Table
              headers={["Area", "Average Rent", "Active Rentals"]}
              rows={data.rentMap.map((area) => [
                area.area,
                `৳${area.averageRent.toLocaleString()}`,
                area.activeRentals.toString(),
              ])}
            />
          ) : (
            <p className="text-gray-500">No rent map data available</p>
          )}
        </Card>

        {/* System Overview */}
        <Card title="System Overview">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Registered Users</span>
              <span className="font-semibold">
                {data.totalTenants + data.totalLandlords}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Properties Available</span>
              <span className="font-semibold">
                {data.totalProperties - data.activeRentals}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Properties Occupied</span>
              <span className="font-semibold">{data.activeRentals}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Occupancy Rate</span>
              <span className="font-semibold">
                {data.totalProperties > 0
                  ? Math.round(
                      (data.activeRentals / data.totalProperties) * 100
                    )
                  : 0}
                %
              </span>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}


/**
 * Ministry Compliance Page
 * 
 * Detailed compliance tracking and policy monitoring.
 */

"use client";

import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import { useEffect, useState } from "react";
import { MinistryDashboardData } from "@/types";

export default function MinistryCompliancePage() {
  const [data, setData] = useState<MinistryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/ministry", {
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
      <DashboardLayout role="ministry">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout role="ministry">
        <div className="text-center text-red-600">Error loading data</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ministry">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Compliance & Policy Tracking</h1>

        <Card title="Compliance Overview">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Overall Compliance Rate</span>
              <span
                className={`text-2xl font-bold ${
                  data.complianceRate >= 80
                    ? "text-green-600"
                    : data.complianceRate >= 60
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {data.complianceRate}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500">Compliant Rentals</p>
                <p className="text-xl font-semibold text-green-600">
                  {Math.round((data.complianceRate / 100) * data.activeRentals)}
                </p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500">Non-Compliant Rentals</p>
                <p className="text-xl font-semibold text-red-600">
                  {Math.round(((100 - data.complianceRate) / 100) * data.activeRentals)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Policy Compliance Metrics">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Registered Properties</span>
              <span className="font-semibold">{data.totalProperties}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Rental Agreements</span>
              <span className="font-semibold">{data.activeRentals}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Verified Tenants</span>
              <span className="font-semibold">{data.totalTenants}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Verified Landlords</span>
              <span className="font-semibold">{data.totalLandlords}</span>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}


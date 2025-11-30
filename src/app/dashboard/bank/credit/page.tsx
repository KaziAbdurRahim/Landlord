/**
 * Bank Credit Scores Page
 * 
 * Detailed credit assessment view for banks.
 */

"use client";

import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Table from "@/components/Table";
import { useEffect, useState } from "react";
import { BankDashboardData } from "@/types";

export default function BankCreditPage() {
  const [data, setData] = useState<BankDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/bank", {
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

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return "bg-green-100 text-green-800";
    if (score >= 650) return "bg-blue-100 text-blue-800";
    if (score >= 550) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getCreditRating = (score: number) => {
    if (score >= 750) return "Excellent";
    if (score >= 650) return "Good";
    if (score >= 550) return "Fair";
    return "Poor";
  };

  if (loading) {
    return (
      <DashboardLayout role="bank">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout role="bank">
        <div className="text-center text-red-600">Error loading data</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="bank">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Credit Score Assessment</h1>
        <Card title="Tenant Credit Scores">
          {data.tenantHistory.length > 0 ? (
            <Table
              headers={[
                "Tenant",
                "Email",
                "Credit Score",
                "Rating",
                "On-Time Rate",
                "Total Rentals",
              ]}
              rows={data.tenantHistory.map((item) => [
                item.tenant.name,
                item.tenant.email,
                <span
                  key={item.tenant.id}
                  className={`px-3 py-1 rounded font-semibold ${getCreditScoreColor(
                    item.creditScore
                  )}`}
                >
                  {item.creditScore}
                </span>,
                getCreditRating(item.creditScore),
                `${item.onTimePaymentRate}%`,
                item.rentalHistory.length.toString(),
              ])}
            />
          ) : (
            <p className="text-gray-500">No tenant data available</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}


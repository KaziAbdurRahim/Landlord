/**
 * Bank Dashboard Page
 * 
 * Main dashboard for banks showing:
 * - Tenant rental history
 * - Payment behavior analysis
 * - Credit score suggestions
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Table from "@/components/Table";
import { BankDashboardData } from "@/types";

export default function BankDashboard() {
  const [data, setData] = useState<BankDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBankData();
  }, []);

  const fetchBankData = async () => {
    try {
      const response = await fetch("/api/dashboard/bank", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error("Error fetching bank data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return "text-green-600";
    if (score >= 650) return "text-blue-600";
    if (score >= 550) return "text-yellow-600";
    return "text-red-600";
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
        <div className="text-center text-red-600">Error loading dashboard data</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="bank">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Bank Dashboard</h1>

        <Card title="Tenant Rental History & Credit Assessment">
          {data.tenantHistory.length > 0 ? (
            <div className="space-y-6">
              {data.tenantHistory.map((item) => (
                <div
                  key={item.tenant.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{item.tenant.name}</h3>
                      <p className="text-sm text-gray-600">{item.tenant.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Credit Score</p>
                      <p
                        className={`text-2xl font-bold ${getCreditScoreColor(
                          item.creditScore
                        )}`}
                      >
                        {item.creditScore}
                      </p>
                      <p className="text-xs text-gray-500">out of 1000</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">On-Time Payment Rate</p>
                      <p className="text-lg font-semibold">
                        {item.onTimePaymentRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Rentals</p>
                      <p className="text-lg font-semibold">
                        {item.rentalHistory.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Payments</p>
                      <p className="text-lg font-semibold">
                        {item.paymentHistory.length}
                      </p>
                    </div>
                  </div>

                  {item.paymentHistory.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold mb-2">Recent Payments</p>
                      <Table
                        headers={["Month", "Amount", "Status"]}
                        rows={item.paymentHistory.slice(0, 5).map((payment) => [
                          payment.month,
                          `৳${payment.amount.toLocaleString()}`,
                          <span
                            key={payment.id}
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              payment.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {payment.status.toUpperCase()}
                          </span>,
                        ])}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No tenant data available</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}


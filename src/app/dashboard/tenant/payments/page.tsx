/**
 * Tenant Payments Page
 * 
 * Detailed payment history page for tenants.
 * Shows all past payments with filtering options.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Table from "@/components/Table";
import Button from "@/components/Button";
import { Payment } from "@/types";

export default function TenantPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch payment data from tenant dashboard API
    fetch("/api/dashboard/tenant", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPayments(data.data.paymentHistory || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="tenant">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="tenant">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Payment History</h1>
        <Card title="All Payments">
          {payments.length > 0 ? (
            <Table
              headers={["Month", "Amount", "Status", "Payment Date", "Method", "Receipt"]}
              rows={payments.map((payment) => [
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
                payment.method || "N/A",
                <Button
                  key={`receipt-${payment.id}`}
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/tenant/receipt/${payment.id}`)}
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


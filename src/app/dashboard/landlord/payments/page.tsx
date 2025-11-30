/**
 * Landlord Payments Page
 * 
 * Detailed payment tracking for all rentals.
 */

"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Table from "@/components/Table";
import Button from "@/components/Button";
import { useEffect, useState } from "react";
import { Payment, Rental, Property, User } from "@/types";

export default function LandlordPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    fetch("/api/dashboard/landlord", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setProperties(result.data.properties);
          setRentals(result.data.activeRentals);
          setTenants(result.data.tenants);
          // Fetch payments for all rentals
          fetch("/api/payments", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                const rentalIds = result.data.activeRentals.map((r: Rental) => r.id);
                setPayments(
                  data.payments.filter((p: Payment) => rentalIds.includes(p.rentalId))
                );
              }
            });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds to see new payments
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="landlord">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="landlord">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Payment Tracking</h1>
        <Card title="All Payments">
          {payments.length > 0 ? (
            <Table
              headers={["Tenant", "Property", "Month", "Amount", "Status", "Date", "Receipt"]}
              rows={payments.map((payment) => {
                const rental = rentals.find((r) => r.id === payment.rentalId);
                const property = rental
                  ? properties.find((p) => p.id === rental.propertyId)
                  : null;
                const tenant = rental
                  ? tenants.find((t) => t.id === rental.tenantId)
                  : null;
                return [
                  tenant?.name || "Unknown",
                  property?.address || "Unknown",
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
                    key={`receipt-${payment.id}`}
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/landlord/receipt/${payment.id}`)}
                  >
                    Download Receipt
                  </Button>,
                ];
              })}
            />
          ) : (
            <p className="text-gray-500">No payments found</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}


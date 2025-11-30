/**
 * Pay Rent Page for Tenants
 * 
 * Allows tenants to make rent payments for their active rental.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { Rental, Property, Payment } from "@/types";

export default function PayRentPage() {
  const router = useRouter();
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("online_payment");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchRentalData();
  }, []);

  const fetchRentalData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/dashboard/tenant", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRental(result.data.currentRental);
          setProperty(result.data.property);
          setPayments(result.data.paymentHistory || []);
          
          // Set default month to current month if no payment exists
          if (!selectedMonth) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            setSelectedMonth(currentMonth);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching rental data:", error);
      setMessage({ type: "error", text: "Failed to load rental information" });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental || !selectedMonth) return;

    setProcessing(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rentalId: rental.id,
          month: selectedMonth,
          amount: rental.monthlyRent,
          method: paymentMethod,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `Payment of ৳${rental.monthlyRent.toLocaleString()} for ${selectedMonth} processed successfully!`,
        });
        // Refresh data
        setTimeout(() => {
          fetchRentalData();
          setSelectedMonth(""); // Reset form
        }, 1500);
      } else {
        setMessage({ type: "error", text: data.message || "Payment failed" });
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setProcessing(false);
    }
  };

  // Get months that haven't been paid yet
  const getUnpaidMonths = () => {
    if (!rental) return [];
    
    const paidMonths = payments
      .filter((p) => p.status === "paid")
      .map((p) => p.month);
    
    const months: string[] = [];
    const startDate = new Date(rental.startDate);
    const currentDate = new Date();
    
    // Generate months from rental start date to current month
    let date = new Date(startDate);
    while (date <= currentDate) {
      const monthStr = date.toISOString().slice(0, 7);
      if (!paidMonths.includes(monthStr)) {
        months.push(monthStr);
      }
      date.setMonth(date.getMonth() + 1);
    }
    
    return months.reverse(); // Most recent first
  };

  const unpaidMonths = getUnpaidMonths();
  const isMonthPaid = (month: string) => {
    return payments.some((p) => p.month === month && p.status === "paid");
  };

  if (loading) {
    return (
      <DashboardLayout role="tenant">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!rental || !property) {
    return (
      <DashboardLayout role="tenant">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">You don't have an active rental property.</p>
            <Button onClick={() => router.push("/dashboard/tenant/properties")}>
              Find Properties
            </Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="tenant">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Pay Rent</h1>

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

        <Card title="Property Information">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-semibold">{property.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Monthly Rent</p>
              <p className="text-2xl font-bold text-blue-600">
                ৳{rental.monthlyRent.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Make Payment">
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Month
              </label>
              {unpaidMonths.length === 0 ? (
                <p className="text-gray-500 text-sm py-2">
                  All months are paid! 🎉
                </p>
              ) : (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a month</option>
                  {unpaidMonths.map((month) => (
                    <option key={month} value={month}>
                      {new Date(month + "-01").toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="online_payment">Online Payment</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_banking">Mobile Banking</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            {selectedMonth && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Amount to Pay</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ৳{rental.monthlyRent.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={processing || unpaidMonths.length === 0 || !selectedMonth}
            >
              {processing
                ? "Processing Payment..."
                : unpaidMonths.length === 0
                ? "All Paid"
                : "Pay Rent"}
            </Button>
          </form>
        </Card>

        <Card title="Payment History">
          {payments.length > 0 ? (
            <div className="space-y-2">
              {payments
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((payment) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(payment.month + "-01").toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(payment.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">৳{payment.amount.toLocaleString()}</p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          payment.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : payment.status === "overdue"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {payment.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No payment history</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}


/**
 * Landlord Dashboard Page
 * 
 * Main dashboard for landlords showing:
 * - Properties they own
 * - Active rentals
 * - Pending rental requests
 * - Rent due list
 * - Revenue statistics
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Table from "@/components/Table";
import Button from "@/components/Button";
import StarRating from "@/components/StarRating";
import { LandlordDashboardData, Rental, Review, RentalTermination } from "@/types";

export default function LandlordDashboard() {
  const [data, setData] = useState<LandlordDashboardData | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLandlordData();
    fetchPayments();
  }, []);

  const handleEditProperty = (propertyId: string) => {
    // Navigate to edit page
    window.location.href = `/dashboard/landlord/properties/edit/${propertyId}`;
  };

  const handleListAgain = async (propertyId: string, previousEndDate?: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/properties/${propertyId}/list-again`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          previousEndDate: previousEndDate || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh data
        fetchLandlordData();
        alert("Property listed for rent again successfully!");
      } else {
        alert(result.message || "Failed to list property again");
      }
    } catch (error) {
      console.error("Error listing property again:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleApproveTermination = async (terminationId: string, approve: boolean) => {
    if (!confirm(approve 
      ? "Are you sure you want to approve this termination request?" 
      : "Are you sure you want to reject this termination request?")) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/rentals/termination/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          terminationId,
          approve,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh data
        fetchLandlordData();
        alert(result.message || (approve ? "Termination request approved successfully!" : "Termination request rejected."));
      } else {
        alert(result.message || "Failed to process termination request");
      }
    } catch (error) {
      console.error("Error processing termination:", error);
      alert("Network error. Please try again.");
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/payments", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPayments(result.payments || []);
        }
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchLandlordData = async () => {
    try {
      const response = await fetch("/api/dashboard/landlord", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error("Error fetching landlord data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRental = async (rentalId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/rentals/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rentalId, action: "approve" }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Rental approved successfully!");
        // Refresh data
        fetchLandlordData();
      } else {
        alert(result.message || "Failed to approve rental");
      }
    } catch (error) {
      console.error("Error approving rental:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleDeclineRental = async (rentalId: string) => {
    if (!confirm("Are you sure you want to decline this rental request?")) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/rentals/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rentalId, action: "decline" }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Rental request declined");
        // Refresh data
        fetchLandlordData();
      } else {
        alert(result.message || "Failed to decline rental");
      }
    } catch (error) {
      console.error("Error declining rental:", error);
      alert("Network error. Please try again.");
    }
  };

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
        <div className="text-center text-red-600">Error loading dashboard data</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="landlord">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Landlord Dashboard</h1>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Properties</p>
            <p className="text-2xl font-bold">{data.properties.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Active Rentals</p>
            <p className="text-2xl font-bold text-green-600">
              {data.activeRentals.length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Pending Requests</p>
            <p className="text-2xl font-bold text-yellow-600">
              {data.pendingRequests.length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-blue-600">
              ৳{data.totalRevenue.toLocaleString()}
            </p>
          </Card>
        </div>

        {/* Properties */}
        <Card title="My Properties">
          {data.properties.length > 0 ? (
            <div className="space-y-4">
              {data.properties.map((property) => {
                // Find active rental for this property
                const activeRental = data.activeRentals.find((r) => r.propertyId === property.id);
                
                // Check if property can be listed again
                // Property can be listed again if:
                // 1. It's not available (marked as occupied)
                // 2. The rental's end date is within 2 months from now OR has passed
                const now = new Date();
                now.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
                
                let canListAgain = false;
                let previousEndDate: string | undefined;
                
                if (!property.available) {
                  // Property is occupied
                  if (activeRental && activeRental.endDate) {
                    // Check if end date is within 2 months or has passed
                    const endDate = new Date(activeRental.endDate);
                    endDate.setHours(0, 0, 0, 0);
                    
                    // Calculate 2 months from now
                    const twoMonthsFromNow = new Date(now);
                    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
                    
                    // Show button if end date is within 2 months or has passed
                    if (endDate <= twoMonthsFromNow) {
                      canListAgain = true;
                      previousEndDate = activeRental.endDate;
                    }
                  } else if (!activeRental) {
                    // No active rental but property is marked as occupied
                    // Can list again (rental ended)
                    canListAgain = true;
                    // Try to get end date from mostRecentRentalEndDate
                    if ((property as any).mostRecentRentalEndDate) {
                      previousEndDate = (property as any).mostRecentRentalEndDate;
                    }
                  } else if (activeRental && !activeRental.endDate) {
                    // Active rental but no end date - can't list yet
                    canListAgain = false;
                  }
                }
                
                // previousEndDate is already set in the canListAgain logic above
                // If not set yet, try to get it from mostRecentRentalEndDate
                if (!previousEndDate && (property as any).mostRecentRentalEndDate) {
                  previousEndDate = (property as any).mostRecentRentalEndDate;
                }
                
                return (
                  <div
                    key={property.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="grid grid-cols-5 gap-4 items-center">
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-semibold">{property.address}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Rent</p>
                        <p className="font-semibold text-blue-600">৳{property.rent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            property.available
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {property.available ? "AVAILABLE" : "OCCUPIED"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Rental End Date</p>
                        {activeRental && activeRental.endDate ? (
                          <div>
                            <p className="text-sm text-gray-600 font-semibold">
                              {new Date(activeRental.endDate).toLocaleDateString()}
                            </p>
                            {canListAgain && (
                              <p className="text-xs text-blue-600 mt-1">
                                (Can list in 2 months)
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">-</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {canListAgain && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleListAgain(property.id, previousEndDate)}
                          >
                            List for Rent Again
                          </Button>
                        )}
                        {property.available && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditProperty(property.id)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No properties registered</p>
          )}
        </Card>

        {/* Pending Rental Requests */}
        {data.pendingRequests.length > 0 && (
          <Card title="Pending Rental Requests">
            <div className="space-y-4">
              {data.pendingRequests.map((rental: any) => {
                const property = data.properties.find(
                  (p) => p.id === rental.propertyId
                );
                const tenant = data.tenants.find(
                  (t) => t.id === rental.tenantId
                );
                const tenantReviews = rental.tenantReviews || {
                  averageRating: 0,
                  totalReviews: 0,
                  recentReviews: [],
                };

                return (
                  <div
                    key={rental.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="grid grid-cols-4 gap-4 items-start">
                      <div>
                        <p className="text-sm text-gray-500">Tenant</p>
                        <p className="font-semibold">{tenant?.name || "Unknown"}</p>
                        <p className="text-xs text-gray-400">{tenant?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Property</p>
                        <p className="font-semibold">{property?.address || "Unknown"}</p>
                        <p className="text-xs text-gray-400">Start: {rental.startDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Tenant Rating</p>
                        <div className="flex items-center gap-2">
                          <StarRating rating={tenantReviews.averageRating} size="sm" />
                          <span className="text-xs text-gray-500">
                            ({tenantReviews.totalReviews} {tenantReviews.totalReviews === 1 ? "review" : "reviews"})
                          </span>
                        </div>
                        {tenantReviews.recentReviews && tenantReviews.recentReviews.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {tenantReviews.recentReviews.slice(0, 2).map((review: Review) => (
                              <div key={review.id} className="text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <StarRating rating={review.rating} size="sm" />
                                  {review.comment && (
                                    <span className="truncate">"{review.comment.substring(0, 30)}..."</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {tenantReviews.totalReviews === 0 && (
                          <p className="text-xs text-gray-400 mt-1">No reviews yet</p>
                        )}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleApproveRental(rental.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeclineRental(rental.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Rent Due */}
        {data.rentDue.length > 0 && (
          <Card title="Rent Due">
            <Table
              headers={["Tenant", "Property", "Amount", "Month", "Days Overdue"]}
              rows={data.rentDue.map((item) => {
                const property = data.properties.find(
                  (p) => p.id === item.rental.propertyId
                );
                return [
                  item.tenant.name,
                  property?.address || "Unknown",
                  `৳${item.amount.toLocaleString()}`,
                  item.month,
                  <span
                    key={item.rental.id}
                    className="text-red-600 font-semibold"
                  >
                    {item.daysOverdue} days
                  </span>,
                ];
              })}
            />
          </Card>
        )}

        {/* Active Rentals */}
        <Card title="Active Rentals">
          {data.activeRentals.length > 0 ? (
            <div className="space-y-4">
              {data.activeRentals.map((rental) => {
                const property = data.properties.find(
                  (p) => p.id === rental.propertyId
                );
                const tenant = data.tenants.find(
                  (t) => t.id === rental.tenantId
                );
                const currentMonth = new Date().toISOString().slice(0, 7);
                
                // Check payment status for current month from payments
                const currentMonthPayment = payments.find(
                  (p) => p.rentalId === rental.id && p.month === currentMonth
                );
                const currentMonthPaid = currentMonthPayment?.status === "paid";
                
                return (
                  <div
                    key={rental.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="grid grid-cols-6 gap-4 items-center">
                      <div>
                        <p className="text-sm text-gray-500">Tenant</p>
                        <p className="font-semibold">{tenant?.name || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Property</p>
                        <p className="font-semibold">{property?.address || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Monthly Rent</p>
                        <p className="font-semibold text-blue-600">
                          ৳{rental.monthlyRent.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">End Date</p>
                        <p className="font-semibold text-gray-800">
                          {rental.endDate ? new Date(rental.endDate).toLocaleDateString() : "Ongoing"}
                        </p>
                        {rental.status === "renewal_pending" && (
                          <p className="text-xs text-blue-600 mt-1">(Renewal pending)</p>
                        )}
                        {rental.status === "terminating" && (
                          <p className="text-xs text-orange-600 mt-1">(Terminating)</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Current Month</p>
                        <p className="text-xs text-gray-400 mb-1">{currentMonth}</p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            currentMonthPaid
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {currentMonthPaid ? "PAID" : "PENDING"}
                        </span>
                      </div>
                      <div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = "/dashboard/landlord/payments"}
                        >
                          View Payments
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No active rentals</p>
          )}
        </Card>

        {/* Termination Requests */}
        {data.pendingTerminations && data.pendingTerminations.length > 0 && (
          <Card title="Pending Termination Requests">
            <div className="space-y-4">
              {data.pendingTerminations.map((termination) => {
                const rental = data.activeRentals.find((r) => r.id === termination.rentalId);
                const tenant = data.tenants.find((t) => t.id === termination.tenantId);
                const property = data.properties.find((p) => p.id === rental?.propertyId);

                if (!rental || !tenant) return null;

                return (
                  <div
                    key={termination.id}
                    className="p-4 border border-orange-200 rounded-lg bg-orange-50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-800">Termination Request</p>
                        <p className="text-sm text-gray-600">
                          Tenant: {tenant.name} | Property: {property?.address || "Unknown"}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                        PENDING
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Requested End Date</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {new Date(termination.requestedEndDate).toLocaleDateString()}
                        </p>
                      </div>
                      {termination.reason && (
                        <div>
                          <p className="text-sm text-gray-500">Reason</p>
                          <p className="text-sm text-gray-700">{termination.reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApproveTermination(termination.id, true)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproveTermination(termination.id, false)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}


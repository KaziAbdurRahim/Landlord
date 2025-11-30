/**
 * Landlord Reviews Page
 * 
 * Allows landlords to review their tenants and view tenant reviews.
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Button from "@/components/Button";
import StarRating from "@/components/StarRating";
import { Rental, Property, User, Review } from "@/types";

interface ReviewWithDetails extends Review {
  reviewer: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function LandlordReviewsPage() {
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<User[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<User | null>(null);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/dashboard/landlord", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setActiveRentals(result.data.activeRentals || []);
          setProperties(result.data.properties || []);
          setTenants(result.data.tenants || []);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantReviews = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/reviews?userId=${tenantId}&role=tenant`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReviews(data.reviews || []);
          setAverageRating(data.summary?.averageRating || 0);
          setTotalReviews(data.summary?.totalReviews || 0);
        }
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const handleSelectTenant = (tenant: User, rental: Rental) => {
    setSelectedTenant(tenant);
    setSelectedRental(rental);
    setShowReviewForm(false);
    fetchTenantReviews(tenant.id);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !selectedTenant || !selectedRental) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewedId: selectedTenant.id,
          reviewedRole: "tenant",
          rentalId: selectedRental.id,
          rating,
          comment,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Review submitted successfully!" });
        setShowReviewForm(false);
        setRating(0);
        setComment("");
        // Refresh data
        fetchTenantReviews(selectedTenant.id);
      } else {
        setMessage({ type: "error", text: data.message || "Failed to submit review" });
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // Check if landlord has already reviewed this tenant
  const hasReviewed = selectedRental && selectedTenant
    ? reviews.some((r) => {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        return r.reviewerId === currentUser.id && r.rentalId === selectedRental.id;
      })
    : false;

  if (loading) {
    return (
      <DashboardLayout role="landlord">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="landlord">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Tenant Reviews</h1>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Rentals List */}
          <div className="lg:col-span-1">
            <Card title="Your Tenants">
              {activeRentals.length > 0 ? (
                <div className="space-y-2">
                  {activeRentals.map((rental) => {
                    const tenant = tenants.find((t) => t.id === rental.tenantId);
                    const property = properties.find((p) => p.id === rental.propertyId);
                    if (!tenant) return null;

                    return (
                      <button
                        key={rental.id}
                        onClick={() => handleSelectTenant(tenant, rental)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedTenant?.id === tenant.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <p className="font-semibold">{tenant.name}</p>
                        <p className="text-sm text-gray-500">{property?.address}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No active tenants</p>
              )}
            </Card>
          </div>

          {/* Review Section */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTenant ? (
              <>
                {/* Tenant Information */}
                <Card title="Tenant Information">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold">{selectedTenant.name}</h3>
                      <p className="text-gray-600">{selectedTenant.email}</p>
                      {selectedRental && (
                        <p className="text-sm text-gray-500 mt-2">
                          Property: {properties.find((p) => p.id === selectedRental.propertyId)?.address}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <StarRating rating={averageRating} size="lg" />
                      <p className="text-sm text-gray-500 mt-1">
                        {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Review Form */}
                {!hasReviewed && !showReviewForm && (
                  <Card>
                    <div className="text-center py-4">
                      <p className="text-gray-600 mb-4">Share your experience with this tenant</p>
                      <Button onClick={() => setShowReviewForm(true)}>
                        Write a Review
                      </Button>
                    </div>
                  </Card>
                )}

                {showReviewForm && !hasReviewed && (
                  <Card title="Write a Review">
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rating
                        </label>
                        <StarRating
                          rating={rating}
                          onRatingChange={setRating}
                          editable
                          size="lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Comment (Optional)
                        </label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Share your experience..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={4}
                        />
                      </div>

                      <div className="flex gap-4">
                        <Button type="submit" className="flex-1" disabled={submitting || rating === 0}>
                          {submitting ? "Submitting..." : "Submit Review"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowReviewForm(false);
                            setRating(0);
                            setComment("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}

                {hasReviewed && (
                  <Card>
                    <div className="text-center py-4">
                      <p className="text-green-600 font-semibold">✓ You have already reviewed this tenant</p>
                    </div>
                  </Card>
                )}

                {/* Reviews List */}
                <Card title={`All Reviews (${totalReviews})`}>
                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="p-4 border border-gray-200 rounded-lg"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold">
                                {review.reviewer?.name || "Anonymous"}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <StarRating rating={review.rating} size="sm" />
                          </div>
                          {review.comment && (
                            <p className="text-gray-700 mt-2">{review.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No reviews yet</p>
                  )}
                </Card>
              </>
            ) : (
              <Card>
                <div className="text-center py-8">
                  <p className="text-gray-500">Select a tenant to view or write reviews</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


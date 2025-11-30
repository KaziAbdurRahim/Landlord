/**
 * Tenant Reviews Page
 * 
 * Allows tenants to review their landlords and view landlord reviews.
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

export default function TenantReviewsPage() {
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [landlord, setLandlord] = useState<User | null>(null);
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
      
      // Fetch tenant dashboard data
      const dashboardResponse = await fetch("/api/dashboard/tenant", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        if (dashboardData.success) {
          setRental(dashboardData.data.currentRental);
          setProperty(dashboardData.data.property);
          setLandlord(dashboardData.data.landlord);
          
          // Fetch reviews for landlord
          if (dashboardData.data.landlord) {
            const reviewsResponse = await fetch(
              `/api/reviews?userId=${dashboardData.data.landlord.id}&role=landlord`
            );
            if (reviewsResponse.ok) {
              const reviewsData = await reviewsResponse.json();
              if (reviewsData.success) {
                setReviews(reviewsData.reviews || []);
                setAverageRating(reviewsData.summary?.averageRating || 0);
                setTotalReviews(reviewsData.summary?.totalReviews || 0);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !landlord || !rental) return;

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
          reviewedId: landlord.id,
          reviewedRole: "landlord",
          rentalId: rental.id,
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
        fetchData();
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

  // Check if tenant has already reviewed this landlord
  const hasReviewed = rental
    ? reviews.some((r) => {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        return r.reviewerId === currentUser.id && r.rentalId === rental.id;
      })
    : false;

  if (loading) {
    return (
      <DashboardLayout role="tenant">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!rental || !landlord) {
    return (
      <DashboardLayout role="tenant">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">You don't have an active rental property.</p>
            <Button onClick={() => window.location.href = "/dashboard/tenant/properties"}>
              Find Properties
            </Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="tenant">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Reviews</h1>

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

        {/* Landlord Information */}
        <Card title="Your Landlord">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold">{landlord.name}</h3>
              <p className="text-gray-600">{landlord.email}</p>
              {property && (
                <p className="text-sm text-gray-500 mt-2">Property: {property.address}</p>
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
              <p className="text-gray-600 mb-4">Share your experience with your landlord</p>
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
              <p className="text-green-600 font-semibold">✓ You have already reviewed this landlord</p>
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
      </div>
    </DashboardLayout>
  );
}


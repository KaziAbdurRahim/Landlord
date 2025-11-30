/**
 * Available Properties Page for Tenants
 * 
 * Shows all available properties that tenants can browse and request to rent.
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Button from "@/components/Button";
import StarRating from "@/components/StarRating";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import { Property, Review, TermsAndConditions } from "@/types";

interface PropertyWithLandlord extends Property {
  landlord: {
    id: string;
    name: string;
    email: string;
  } | null;
  reviews: {
    averageRating: number;
    totalReviews: number;
    recentReviews: Review[];
  };
}

export default function TenantPropertiesPage() {
  const [properties, setProperties] = useState<PropertyWithLandlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [terms, setTerms] = useState<TermsAndConditions | null>(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState<{ [key: string]: boolean }>({});
  const [propertyHasTerms, setPropertyHasTerms] = useState<{ [key: string]: boolean }>({});
  const [showRentalDurationModal, setShowRentalDurationModal] = useState<string | null>(null);
  const [rentalDuration, setRentalDuration] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/properties");
      const data = await response.json();
      if (data.success) {
        setProperties(data.properties || []);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
      setMessage({ type: "error", text: "Failed to load properties" });
    } finally {
      setLoading(false);
    }
  };

  const handleViewTerms = async (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setLoadingTerms(true);
    setShowTermsModal(true);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/terms?role=tenant&propertyId=${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success && data.terms.length > 0) {
        setTerms(data.terms[0]);
        setPropertyHasTerms({ ...propertyHasTerms, [propertyId]: true });
      } else {
        setTerms(null);
        setPropertyHasTerms({ ...propertyHasTerms, [propertyId]: false });
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
      setTerms(null);
      setPropertyHasTerms({ ...propertyHasTerms, [propertyId]: false });
    } finally {
      setLoadingTerms(false);
    }
  };

  const handleRequestRental = async (propertyId: string) => {
    // Check if property has terms and if they're accepted
    if (propertyHasTerms[propertyId] && !termsAccepted[propertyId]) {
      setMessage({
        type: "error",
        text: "Please view and accept the terms and conditions before requesting to rent.",
      });
      // Open terms modal
      handleViewTerms(propertyId);
      return;
    }

    // If we don't know if property has terms, check first
    if (propertyHasTerms[propertyId] === undefined) {
      const token = localStorage.getItem("authToken");
      try {
        const termsResponse = await fetch(`/api/terms?role=tenant&propertyId=${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const termsData = await termsResponse.json();
        
        if (termsData.success && termsData.terms.length > 0) {
          setPropertyHasTerms({ ...propertyHasTerms, [propertyId]: true });
          if (!termsAccepted[propertyId]) {
            setMessage({
              type: "error",
              text: "Please view and accept the terms and conditions before requesting to rent.",
            });
            handleViewTerms(propertyId);
            return;
          }
        } else {
          setPropertyHasTerms({ ...propertyHasTerms, [propertyId]: false });
        }
      } catch (error) {
        console.error("Error checking terms:", error);
        // Continue with rental request if terms check fails
      }
    }

    // Always show rental duration modal to allow tenant to adjust duration
    setShowRentalDurationModal(propertyId);
  };

  const submitRentalRequest = async (propertyId: string) => {
    setRequesting(propertyId);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/rentals/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          propertyId,
          rentalDuration: rentalDuration[propertyId] || 12, // Default to 12 months
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Rental request submitted! The landlord will review your request.",
        });
        // Clear rental duration for this property
        const newRentalDuration = { ...rentalDuration };
        delete newRentalDuration[propertyId];
        setRentalDuration(newRentalDuration);
        setShowRentalDurationModal(null);
        // Refresh properties list (the property might still show as available until approved)
        fetchProperties();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to submit request" });
      }
    } catch (error) {
      console.error("Error requesting rental:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setRequesting(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="tenant">
        <div className="text-center">Loading available properties...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="tenant">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Available Properties</h1>
        </div>

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

        {properties.length === 0 ? (
          <Card>
            <p className="text-gray-500 text-center py-8">
              No available properties at the moment. Check back later!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {property.address}
                    </h3>
                    {property.description && (
                      <p className="text-gray-600 text-sm">{property.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-sm text-gray-500">Monthly Rent</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ৳{property.rent.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Rental Period Information */}
                  {property.startDate && property.endDate && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-500 mb-2">Available Rental Period</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-400">Start Date</p>
                          <p className="font-semibold text-gray-800">
                            {new Date(property.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">End Date</p>
                          <p className="font-semibold text-gray-800">
                            {new Date(property.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {(() => {
                        const start = new Date(property.startDate);
                        const end = new Date(property.endDate);
                        const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                                         (end.getMonth() - start.getMonth());
                        return (
                          <p className="text-xs text-gray-500 mt-1">
                            Default Duration: {monthsDiff} {monthsDiff === 1 ? "month" : "months"}
                          </p>
                        );
                      })()}
                    </div>
                  )}

                  {property.landlord && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-500">Landlord</p>
                      <p className="font-medium text-gray-800">{property.landlord.name}</p>
                    </div>
                  )}

                  {/* Reviews Section */}
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500">Landlord Rating</p>
                      <div className="flex items-center gap-2">
                        <StarRating rating={property.reviews.averageRating} size="sm" />
                        <span className="text-xs text-gray-500">
                          ({property.reviews.totalReviews} {property.reviews.totalReviews === 1 ? "review" : "reviews"})
                        </span>
                      </div>
                    </div>
                    
                    {property.reviews.recentReviews.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
                        {property.reviews.recentReviews.map((review) => (
                          <div key={review.id} className="text-xs text-gray-600">
                            {review.comment && (
                              <span className="truncate block">"{review.comment}"</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {property.reviews.totalReviews === 0 && (
                      <p className="text-xs text-gray-400">No reviews yet</p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => handleViewTerms(property.id)}
                    >
                      View Terms
                    </Button>
                    <Button
                      className="flex-1"
                      variant="primary"
                      onClick={() => handleRequestRental(property.id)}
                      disabled={requesting === property.id}
                    >
                      {requesting === property.id
                        ? "Submitting..."
                        : propertyHasTerms[property.id] && !termsAccepted[property.id]
                        ? "Accept Terms First"
                        : "Request to Rent"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Terms and Conditions Modal */}
        <Modal
          isOpen={showTermsModal}
          onClose={() => {
            setShowTermsModal(false);
            setSelectedPropertyId(null);
            setTerms(null);
          }}
          title="Terms & Conditions"
          size="lg"
        >
          {loadingTerms ? (
            <div className="text-center py-8">Loading terms...</div>
          ) : terms ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">{terms.title}</h3>
                <p className="text-sm text-gray-500">
                  Version {terms.version} • Last updated: {new Date(terms.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap">{terms.content}</p>
              </div>
              
              {/* Terms Acceptance Checkbox */}
              <div className="pt-4 border-t border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPropertyId ? termsAccepted[selectedPropertyId] || false : false}
                    onChange={(e) => {
                      if (selectedPropertyId) {
                        setTermsAccepted({
                          ...termsAccepted,
                          [selectedPropertyId]: e.target.checked,
                        });
                      }
                    }}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and agree to the terms and conditions stated above. I understand that by accepting these terms, I am agreeing to comply with all rental rules and regulations.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTermsModal(false);
                    setSelectedPropertyId(null);
                    setTerms(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    if (selectedPropertyId && termsAccepted[selectedPropertyId]) {
                      const propertyId = selectedPropertyId;
                      setShowTermsModal(false);
                      setSelectedPropertyId(null);
                      setTerms(null);
                      // Small delay to allow modal to close, then proceed to request rental
                      setTimeout(() => {
                        handleRequestRental(propertyId);
                      }, 100);
                    } else {
                      setMessage({
                        type: "error",
                        text: "Please accept the terms and conditions to continue.",
                      });
                    }
                  }}
                  disabled={!selectedPropertyId || !termsAccepted[selectedPropertyId]}
                >
                  Accept & Request Rental
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-gray-500">No terms and conditions available for this property.</p>
                <p className="text-sm text-gray-400 mt-2">
                  You can proceed to request rental without terms acceptance.
                </p>
              </div>
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    setShowTermsModal(false);
                    setSelectedPropertyId(null);
                    setTerms(null);
                    // If no terms, allow direct rental request
                    if (selectedPropertyId) {
                      setTimeout(() => {
                        handleRequestRental(selectedPropertyId);
                      }, 100);
                    }
                  }}
                >
                  Proceed to Request
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Rental Duration Modal */}
        <Modal
          isOpen={showRentalDurationModal !== null}
          onClose={() => {
            setShowRentalDurationModal(null);
          }}
          title="Select Rental Duration"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Please select how long you want to rent this property. Minimum 2 months, maximum 24 months (2 years).
            </p>
            <Input
              type="number"
              label="Rental Duration (months)"
              value={showRentalDurationModal ? (rentalDuration[showRentalDurationModal] || 12).toString() : "12"}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (showRentalDurationModal) {
                  if (value >= 2 && value <= 24) {
                    setRentalDuration({
                      ...rentalDuration,
                      [showRentalDurationModal]: value,
                    });
                  }
                }
              }}
              min="2"
              max="24"
              required
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRentalDurationModal(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (showRentalDurationModal) {
                    const duration = rentalDuration[showRentalDurationModal] || 12;
                    if (duration >= 2 && duration <= 24) {
                      submitRentalRequest(showRentalDurationModal);
                    } else {
                      setMessage({
                        type: "error",
                        text: "Rental duration must be between 2 and 24 months",
                      });
                    }
                  }
                }}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}


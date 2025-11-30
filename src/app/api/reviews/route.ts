/**
 * Reviews API Route
 * 
 * Handles review operations:
 * - GET: Fetch reviews for a user
 * - POST: Create a new review
 * 
 * GET /api/reviews?userId=xxx&role=tenant
 * POST /api/reviews
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, generateId, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import { Review, Rental, User, Property } from "@/types";

/**
 * GET /api/reviews
 * Fetches reviews for a specific user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, message: "User ID and role are required" },
        { status: 400 }
      );
    }

    // Load reviews
    const reviews = await readJSON<Review[]>("reviews.json");
    const users = await readJSON<User[]>("users.json");

    // Filter reviews for the specified user
    const userReviews = reviews.filter(
      (r) => r.reviewedId === userId && r.reviewedRole === role
    );

    // Enrich with reviewer information
    const reviewsWithReviewer = userReviews.map((review) => {
      const reviewer = findById(users, review.reviewerId);
      return {
        ...review,
        reviewer: reviewer
          ? {
              id: reviewer.id,
              name: reviewer.name,
              email: reviewer.email,
            }
          : null,
      };
    });

    // Calculate average rating
    const averageRating =
      userReviews.length > 0
        ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
        : 0;

    // Calculate rating distribution
    const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    userReviews.forEach((review) => {
      ratingDistribution[review.rating] =
        (ratingDistribution[review.rating] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      reviews: reviewsWithReviewer.sort((a, b) => b.createdAt - a.createdAt),
      summary: {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: userReviews.length,
        ratingDistribution,
      },
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Creates a new review
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const tokenData = parseToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reviewedId, reviewedRole, rentalId, rating, comment } = body;

    // Validate input
    if (!reviewedId || !reviewedRole || !rentalId || !rating) {
      return NextResponse.json(
        {
          success: false,
          message: "Reviewed ID, role, rental ID, and rating are required",
        },
        { status: 400 }
      );
    }

    // Validate rating (1-5)
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Validate roles
    if (
      (tokenData.role === "tenant" && reviewedRole !== "landlord") ||
      (tokenData.role === "landlord" && reviewedRole !== "tenant")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Tenants can only review landlords, and landlords can only review tenants",
        },
        { status: 400 }
      );
    }

    // Load data
    const rentals = await readJSON<Rental[]>("rentals.json");
    const reviews = await readJSON<Review[]>("reviews.json");
    const users = await readJSON<User[]>("users.json");
    const properties = await readJSON<Property[]>("properties.json");

    // Verify rental exists and user is part of it
    const rental = findById(rentals, rentalId);
    if (!rental) {
      return NextResponse.json(
        { success: false, message: "Rental not found" },
        { status: 404 }
      );
    }

    // Verify reviewer is part of this rental
    if (tokenData.role === "tenant" && rental.tenantId !== tokenData.userId) {
      return NextResponse.json(
        { success: false, message: "You can only review for your own rentals" },
        { status: 403 }
      );
    }

    // For landlord, verify they own the property
    if (tokenData.role === "landlord") {
      const property = findById(properties, rental.propertyId);
      if (!property || property.ownerId !== tokenData.userId) {
        return NextResponse.json(
          { success: false, message: "You can only review tenants for your properties" },
          { status: 403 }
        );
      }
    }

    // Check if user already reviewed this person for this rental
    const existingReview = reviews.find(
      (r) =>
        r.reviewerId === tokenData.userId &&
        r.reviewedId === reviewedId &&
        r.rentalId === rentalId
    );
    if (existingReview) {
      return NextResponse.json(
        {
          success: false,
          message: "You have already reviewed this person for this rental",
        },
        { status: 400 }
      );
    }

    // Verify reviewed user exists
    const reviewedUser = findById(users, reviewedId);
    if (!reviewedUser || reviewedUser.role !== reviewedRole) {
      return NextResponse.json(
        { success: false, message: "Reviewed user not found or role mismatch" },
        { status: 404 }
      );
    }

    // Create review
    const newReview: Review = {
      id: generateId("rev"),
      reviewerId: tokenData.userId,
      reviewerRole: tokenData.role as "tenant" | "landlord",
      reviewedId,
      reviewedRole: reviewedRole as "tenant" | "landlord",
      rentalId,
      rating,
      comment: comment || "",
      createdAt: Date.now(),
    };

    // Save review
    reviews.push(newReview);
    await writeJSON("reviews.json", reviews);

    // Get reviewer info for response
    const reviewer = findById(users, tokenData.userId);

    return NextResponse.json({
      success: true,
      message: "Review submitted successfully",
      review: {
        ...newReview,
        reviewer: reviewer
          ? {
              id: reviewer.id,
              name: reviewer.name,
              email: reviewer.email,
            }
          : null,
        reviewed: reviewedUser
          ? {
              id: reviewedUser.id,
              name: reviewedUser.name,
              email: reviewedUser.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Create review error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


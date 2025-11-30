/**
 * Landlord Dashboard API Route
 * 
 * Fetches and aggregates all data needed for the landlord dashboard:
 * - Properties owned by the landlord
 * - Active and pending rentals
 * - Tenant information
 * - Rent due list
 * - Revenue statistics
 * 
 * GET /api/dashboard/landlord
 */

import { NextRequest, NextResponse } from "next/server";
import { readJSON, findById } from "@/utils/jsonDb";
import { parseToken } from "@/utils/auth";
import {
  User,
  Property,
  Rental,
  Payment,
  LandlordDashboardData,
  Review,
  RentalTermination,
} from "@/types";

export async function GET(request: NextRequest) {
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
    if (!tokenData || tokenData.role !== "landlord") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Load all data
    const users = await readJSON<User[]>("users.json");
    const properties = await readJSON<Property[]>("properties.json");
    const rentals = await readJSON<Rental[]>("rentals.json");
    const payments = await readJSON<Payment[]>("payments.json");
    const reviews = await readJSON<Review[]>("reviews.json");
    const terminations = await readJSON<RentalTermination[]>("rental_terminations.json");

    // Find current user
    const user = findById(users, tokenData.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Find all properties owned by this landlord
    const landlordProperties = properties.filter((p) => p.ownerId === user.id);

    // Find all rentals for these properties
    const allRentals = rentals.filter((r) =>
      landlordProperties.some((p) => p.id === r.propertyId)
    );

    // Separate active, pending, and renewal_pending rentals
    // Include renewal_pending and terminating rentals in activeRentals for display
    const now = new Date();
    const activeRentals = allRentals.filter((r) => {
      // Check if rental status is active, renewal_pending, or terminating
      // Using type assertion since these statuses exist in the data but may not be in the type
      const status = r.status as string;
      const isActiveStatus = status === "active" || status === "renewal_pending" || status === "terminating";
      if (!isActiveStatus) return false;

      // If rental has an end date, check if it has passed
      if (r.endDate) {
        const endDate = new Date(r.endDate);
        // Include if end date hasn't passed yet
        return endDate > now;
      }
      // No end date means ongoing rental
      return true;
    });
    const pendingRequests = allRentals.filter((r) => r.status === "pending");

    // Get all rentals for each property (including ended ones) for reference
    // This helps determine the most recent rental's end date
    const propertyRentalsMap = new Map<string, Rental[]>();
    landlordProperties.forEach((property) => {
      const propertyRentals = allRentals
        .filter((r) => r.propertyId === property.id)
        .sort((a, b) => {
          // Sort by end date if available, otherwise by start date
          const dateA = a.endDate
            ? new Date(a.endDate).getTime()
            : a.startDate
              ? new Date(a.startDate).getTime()
              : 0;
          const dateB = b.endDate
            ? new Date(b.endDate).getTime()
            : b.startDate
              ? new Date(b.startDate).getTime()
              : 0;
          return dateB - dateA; // Most recent first
        });
      propertyRentalsMap.set(property.id, propertyRentals);
    });

    // Get tenant information for active rentals and pending requests
    const allTenantIds = [
      ...activeRentals.map((r) => r.tenantId),
      ...pendingRequests.map((r) => r.tenantId),
    ];
    const uniqueTenantIds = [...new Set(allTenantIds)];
    const tenants = users.filter((u) => uniqueTenantIds.includes(u.id));

    // Enrich pending requests with tenant reviews
    const pendingRequestsWithReviews = pendingRequests.map((rental) => {
      const tenant = findById(users, rental.tenantId);
      if (!tenant) return rental;

      // Get reviews for this tenant
      const tenantReviews = reviews.filter(
        (r) => r.reviewedId === tenant.id && r.reviewedRole === "tenant"
      );

      // Calculate average rating
      const averageRating =
        tenantReviews.length > 0
          ? tenantReviews.reduce((sum, r) => sum + r.rating, 0) / tenantReviews.length
          : 0;

      return {
        ...rental,
        tenantReviews: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: tenantReviews.length,
          recentReviews: tenantReviews
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 3), // Show 3 most recent reviews
        },
      };
    });

    // Calculate rent due (rentals with overdue payments)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const rentDue = activeRentals
      .map((rental) => {
        const property = findById(properties, rental.propertyId);
        const tenant = findById(users, rental.tenantId);
        if (!property || !tenant) return null;

        // Check if payment exists for current month
        const currentPayment = payments.find(
          (p) => p.rentalId === rental.id && p.month === currentMonth
        );

        const daysOverdue = currentPayment
          ? 0
          : Math.floor(
            (Date.now() - new Date(currentMonth + "-01").getTime()) /
            (1000 * 60 * 60 * 24)
          );

        return {
          rental,
          tenant,
          amount: rental.monthlyRent,
          month: currentMonth,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          paymentStatus: currentPayment ? currentPayment.status : "pending",
        };
      })
      .filter((item) => item !== null && item.daysOverdue > 0) as Array<{
        rental: Rental;
        tenant: User;
        amount: number;
        month: string;
        daysOverdue: number;
        paymentStatus: string;
      }>;

    // Calculate total revenue from paid payments
    const allPayments = payments.filter((p) =>
      allRentals.some((r) => r.id === p.rentalId && p.status === "paid")
    );
    const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);

    // Enrich properties with most recent rental end date
    const enrichedProperties = landlordProperties.map((property) => {
      const propertyRentals = propertyRentalsMap.get(property.id) || [];
      const mostRecentRental = propertyRentals[0];
      return {
        ...property,
        mostRecentRentalEndDate: mostRecentRental?.endDate || null,
      };
    });

    // Get pending termination requests for landlord's properties
    const pendingTerminations = terminations.filter((t) => {
      // Find the rental for this termination
      const rental = rentals.find((r) => r.id === t.rentalId);
      if (!rental) return false;

      // Check if the rental is for one of the landlord's properties
      return landlordProperties.some((p) => p.id === rental.propertyId) && t.status === "pending";
    });

    // Build dashboard data
    const dashboardData: LandlordDashboardData = {
      user,
      properties: enrichedProperties as Property[],
      activeRentals,
      pendingRequests: pendingRequestsWithReviews as any,
      tenants,
      rentDue,
      totalRevenue,
      allRentals, // Include all rentals for reference
      propertyRentalsMap: Object.fromEntries(propertyRentalsMap), // Convert Map to object for JSON
      pendingTerminations, // Include pending termination requests
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Landlord dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


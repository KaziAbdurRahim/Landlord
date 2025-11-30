/**
 * Tenant Notices Page
 * 
 * Allows tenants to view notices and announcements from their landlord.
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import { Notice, Rental, Property } from "@/types";

interface NoticeWithDetails extends Notice {
  landlord: {
    id: string;
    name: string;
    email: string;
  } | null;
  property: {
    id: string;
    address: string;
  } | null;
}

export default function TenantNoticesPage() {
  const [notices, setNotices] = useState<NoticeWithDetails[]>([]);
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      
      // Fetch notices
      const noticesResponse = await fetch("/api/notices?role=tenant", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (noticesResponse.ok) {
        const noticesData = await noticesResponse.json();
        if (noticesData.success) {
          setNotices(noticesData.notices || []);
        }
      }

      // Fetch tenant dashboard data for property info
      const dashboardResponse = await fetch("/api/dashboard/tenant", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        if (dashboardData.success) {
          setRental(dashboardData.data.currentRental);
          setProperty(dashboardData.data.property);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-300";
      case "important":
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "🚨";
      case "important":
        return "⚠️";
      default:
        return "📢";
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="tenant">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  const urgentNotices = notices.filter((n) => n.priority === "urgent");
  const importantNotices = notices.filter((n) => n.priority === "important");
  const normalNotices = notices.filter((n) => n.priority === "normal");

  return (
    <DashboardLayout role="tenant">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Notices & Announcements</h1>

        {property && (
          <Card title="Your Property">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-semibold">{property.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Landlord</p>
                <p className="font-semibold">
                  {notices[0]?.landlord?.name || "N/A"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {notices.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-gray-500">No notices from your landlord at the moment.</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Urgent Notices */}
            {urgentNotices.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-red-600">🚨 Urgent Notices</h2>
                {urgentNotices.map((notice) => (
                  <Card
                    key={notice.id}
                    className={`border-2 ${getPriorityColor(notice.priority)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getPriorityIcon(notice.priority)}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{notice.title}</h3>
                        <p className="whitespace-pre-wrap mb-3">{notice.content}</p>
                        <div className="flex justify-between items-center text-sm opacity-80">
                          <span>
                            {notice.property
                              ? `Property: ${notice.property.address}`
                              : "All Properties"}
                          </span>
                          <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Important Notices */}
            {importantNotices.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-orange-600">⚠️ Important Notices</h2>
                {importantNotices.map((notice) => (
                  <Card
                    key={notice.id}
                    className={`border-2 ${getPriorityColor(notice.priority)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getPriorityIcon(notice.priority)}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{notice.title}</h3>
                        <p className="whitespace-pre-wrap mb-3">{notice.content}</p>
                        <div className="flex justify-between items-center text-sm opacity-80">
                          <span>
                            {notice.property
                              ? `Property: ${notice.property.address}`
                              : "All Properties"}
                          </span>
                          <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Normal Notices */}
            {normalNotices.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-blue-600">📢 General Notices</h2>
                {normalNotices.map((notice) => (
                  <Card
                    key={notice.id}
                    className={`border-2 ${getPriorityColor(notice.priority)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getPriorityIcon(notice.priority)}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{notice.title}</h3>
                        <p className="whitespace-pre-wrap mb-3">{notice.content}</p>
                        <div className="flex justify-between items-center text-sm opacity-80">
                          <span>
                            {notice.property
                              ? `Property: ${notice.property.address}`
                              : "All Properties"}
                          </span>
                          <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}


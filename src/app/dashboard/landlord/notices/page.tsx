/**
 * Landlord Notices Management Page
 * 
 * Allows landlords to create, edit, and delete notices/announcements for their tenants.
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { Notice, Property } from "@/types";

interface NoticeWithDetails extends Notice {
  property: {
    id: string;
    address: string;
  } | null;
}

export default function LandlordNoticesPage() {
  const [notices, setNotices] = useState<NoticeWithDetails[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeWithDetails | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal" as "normal" | "important" | "urgent",
    propertyId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      
      // Fetch notices
      const noticesResponse = await fetch("/api/notices?role=landlord", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (noticesResponse.ok) {
        const noticesData = await noticesResponse.json();
        if (noticesData.success) {
          setNotices(noticesData.notices || []);
        }
      }

      // Fetch properties
      const landlordResponse = await fetch("/api/dashboard/landlord", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (landlordResponse.ok) {
        const landlordData = await landlordResponse.json();
        if (landlordData.success) {
          setProperties(landlordData.data.properties || []);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingNotice(null);
    setFormData({ title: "", content: "", priority: "normal", propertyId: "" });
    setShowForm(true);
    setMessage(null);
  };

  const handleEdit = (notice: NoticeWithDetails) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      priority: notice.priority,
      propertyId: notice.propertyId || "",
    });
    setShowForm(true);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      const url = editingNotice
        ? `/api/notices/${editingNotice.id}`
        : "/api/notices";
      const method = editingNotice ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          propertyId: formData.propertyId || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: editingNotice
            ? "Notice updated successfully!"
            : "Notice created successfully!",
        });
        setShowForm(false);
        setEditingNotice(null);
        setFormData({ title: "", content: "", priority: "normal", propertyId: "" });
        fetchData();
      } else {
        setMessage({ type: "error", text: data.message || "Operation failed" });
      }
    } catch (error) {
      console.error("Error saving notice:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noticeId: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/notices/${noticeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Notice deleted successfully!" });
        fetchData();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to delete notice" });
      }
    } catch (error) {
      console.error("Error deleting notice:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
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

  if (loading) {
    return (
      <DashboardLayout role="landlord">
        <div className="text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="landlord">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Notices & Announcements</h1>
          {!showForm && (
            <Button onClick={handleCreate}>Create New Notice</Button>
          )}
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

        {/* Create/Edit Form */}
        {showForm && (
          <Card title={editingNotice ? "Edit Notice" : "Create New Notice"}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter notice title"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter notice content..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as typeof formData.priority,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property (Optional - leave empty for all properties)
                </label>
                <select
                  value={formData.propertyId}
                  onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Properties</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.address}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting
                    ? "Saving..."
                    : editingNotice
                    ? "Update Notice"
                    : "Create Notice"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingNotice(null);
                    setFormData({ title: "", content: "", priority: "normal", propertyId: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Notices List */}
        <Card title={`All Notices (${notices.length})`}>
          {notices.length > 0 ? (
            <div className="space-y-4">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className={`p-4 rounded-lg border-2 ${getPriorityColor(notice.priority)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{notice.title}</h3>
                      <p className="text-sm opacity-80 mt-1">
                        {notice.property
                          ? `Property: ${notice.property.address}`
                          : "All Properties"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-white bg-opacity-50">
                        {notice.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p className="mb-3 whitespace-pre-wrap">{notice.content}</p>

                  <div className="flex justify-between items-center pt-3 border-t border-current border-opacity-20">
                    <p className="text-xs opacity-70">
                      {new Date(notice.createdAt).toLocaleDateString()}
                      {notice.updatedAt !== notice.createdAt && (
                        <span className="ml-2">
                          (Updated: {new Date(notice.updatedAt).toLocaleDateString()})
                        </span>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(notice)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(notice.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No notices yet. Create your first notice!</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}


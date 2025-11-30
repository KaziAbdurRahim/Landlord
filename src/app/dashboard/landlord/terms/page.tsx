/**
 * Landlord Terms and Conditions Management Page
 * 
 * Allows landlords to create, edit, and manage rental contract terms and conditions.
 */

"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { TermsAndConditions, Property } from "@/types";

interface TermsWithDetails extends TermsAndConditions {
  property: {
    id: string;
    address: string;
  } | null;
}

export default function LandlordTermsPage() {
  const [terms, setTerms] = useState<TermsWithDetails[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTerms, setEditingTerms] = useState<TermsWithDetails | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
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
      
      // Fetch terms
      const termsResponse = await fetch("/api/terms?role=landlord", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (termsResponse.ok) {
        const termsData = await termsResponse.json();
        if (termsData.success) {
          setTerms(termsData.terms || []);
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
    setEditingTerms(null);
    setFormData({ title: "", content: "", propertyId: "" });
    setShowForm(true);
    setMessage(null);
  };

  const handleEdit = (term: TermsWithDetails) => {
    setEditingTerms(term);
    setFormData({
      title: term.title,
      content: term.content,
      propertyId: term.propertyId || "",
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
      const url = editingTerms ? `/api/terms/${editingTerms.id}` : "/api/terms";
      const method = editingTerms ? "PUT" : "POST";

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
          text: editingTerms
            ? "Terms updated successfully!"
            : "Terms created successfully!",
        });
        setShowForm(false);
        setEditingTerms(null);
        setFormData({ title: "", content: "", propertyId: "" });
        fetchData();
      } else {
        setMessage({ type: "error", text: data.message || "Operation failed" });
      }
    } catch (error) {
      console.error("Error saving terms:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (termId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/terms/${termId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `Terms ${!currentStatus ? "activated" : "deactivated"} successfully!`,
        });
        fetchData();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to update status" });
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
    }
  };

  const handleDelete = async (termId: string) => {
    if (!confirm("Are you sure you want to delete these terms? This action cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/terms/${termId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Terms deleted successfully!" });
        fetchData();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to delete terms" });
      }
    } catch (error) {
      console.error("Error deleting terms:", error);
      setMessage({ type: "error", text: "Network error. Please try again." });
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
          <h1 className="text-3xl font-bold text-gray-800">Terms & Conditions</h1>
          {!showForm && (
            <Button onClick={handleCreate}>Create New Terms</Button>
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
          <Card title={editingTerms ? "Edit Terms & Conditions" : "Create New Terms & Conditions"}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Standard Rental Agreement"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms & Conditions Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter the full terms and conditions text..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={12}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include all rental terms, rules, responsibilities, payment terms, etc.
                </p>
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
                  <option value="">All Properties (General Terms)</option>
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
                    : editingTerms
                    ? "Update Terms"
                    : "Create Terms"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTerms(null);
                    setFormData({ title: "", content: "", propertyId: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Terms List */}
        <Card title={`All Terms & Conditions (${terms.length})`}>
          {terms.length > 0 ? (
            <div className="space-y-4">
              {terms.map((term) => (
                <div
                  key={term.id}
                  className={`p-4 rounded-lg border-2 ${
                    term.isActive
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{term.title}</h3>
                        {term.isActive && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                            ACTIVE
                          </span>
                        )}
                        {!term.isActive && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {term.property
                          ? `Property: ${term.property.address}`
                          : "All Properties"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Version {term.version} • Created: {new Date(term.createdAt).toLocaleDateString()}
                        {term.updatedAt !== term.createdAt && (
                          <span> • Updated: {new Date(term.updatedAt).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 p-3 bg-white rounded border border-gray-200 max-h-32 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                      {term.content}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <Button
                      size="sm"
                      variant={term.isActive ? "outline" : "primary"}
                      onClick={() => handleToggleActive(term.id, term.isActive)}
                    >
                      {term.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(term)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(term.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No terms and conditions yet. Create your first rental contract!
            </p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}


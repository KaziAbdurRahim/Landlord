/**
 * Tenant Receipt View/Download Page
 * 
 * Displays and allows downloading of payment receipts for tenants.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Receipt from "@/components/Receipt";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { Payment, Rental, Property, User } from "@/types";

interface ReceiptData {
  payment: Payment;
  rental: Rental;
  property: Property;
  tenant: User;
  landlord: User;
}

export default function TenantReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.paymentId as string;
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReceipt();
  }, [paymentId]);

  const fetchReceipt = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/receipts/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setReceiptData(data.receipt);
      } else {
        setError(data.message || "Failed to load receipt");
      }
    } catch (error) {
      console.error("Error fetching receipt:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a printable version with exact same styling
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const receiptElement = document.getElementById("receipt");
    if (!receiptElement) return;

    // Get computed styles to preserve formatting
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch (e) {
          return "";
        }
      })
      .join("\n");

    // Get inline styles from the receipt element
    const receiptStyles = window.getComputedStyle(receiptElement);
    const allStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el: any) => {
        if (el.tagName === 'STYLE') return el.innerHTML;
        if (el.tagName === 'LINK' && el.href) {
          // For external stylesheets, we'll include Tailwind CDN
          return '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receiptData?.payment.id}</title>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, Helvetica, sans-serif;
              background: white;
              color: #000;
            }
            .max-w-2xl {
              max-width: 42rem;
            }
            .mx-auto {
              margin-left: auto;
              margin-right: auto;
            }
            .bg-white {
              background-color: white;
            }
            .p-8 {
              padding: 2rem;
            }
            .border-2 {
              border-width: 2px;
            }
            .border-gray-300 {
              border-color: #d1d5db;
            }
            .text-center {
              text-align: center;
            }
            .mb-8 {
              margin-bottom: 2rem;
            }
            .border-b-2 {
              border-bottom-width: 2px;
            }
            .pb-4 {
              padding-bottom: 1rem;
            }
            .text-3xl {
              font-size: 1.875rem;
              line-height: 2.25rem;
            }
            .font-bold {
              font-weight: 700;
            }
            .text-gray-800 {
              color: #1f2937;
            }
            .mb-2 {
              margin-bottom: 0.5rem;
            }
            .text-sm {
              font-size: 0.875rem;
              line-height: 1.25rem;
            }
            .text-gray-600 {
              color: #4b5563;
            }
            .mb-6 {
              margin-bottom: 1.5rem;
            }
            .flex {
              display: flex;
            }
            .justify-between {
              justify-content: space-between;
            }
            .items-center {
              align-items: center;
            }
            .font-semibold {
              font-weight: 600;
            }
            .text-lg {
              font-size: 1.125rem;
              line-height: 1.75rem;
            }
            .text-xl {
              font-size: 1.25rem;
              line-height: 1.75rem;
            }
            .text-green-600 {
              color: #16a34a;
            }
            .space-y-3 > * + * {
              margin-top: 0.75rem;
            }
            .space-y-2 > * + * {
              margin-top: 0.5rem;
            }
            .bg-gray-50 {
              background-color: #f9fafb;
            }
            .rounded-lg {
              border-radius: 0.5rem;
            }
            .grid {
              display: grid;
            }
            .grid-cols-2 {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .gap-4 {
              gap: 1rem;
            }
            .mt-8 {
              margin-top: 2rem;
            }
            .pt-4 {
              padding-top: 1rem;
            }
            .border-t-2 {
              border-top-width: 2px;
            }
            .text-xs {
              font-size: 0.75rem;
              line-height: 1rem;
            }
            .text-gray-500 {
              color: #6b7280;
            }
            .text-gray-700 {
              color: #374151;
            }
            .whitespace-pre-wrap {
              white-space: pre-wrap;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              @page {
                margin: 0.5cm;
                size: A4;
              }
            }
            ${allStyles}
          </style>
        </head>
        <body>
          ${receiptElement.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for styles to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return (
      <DashboardLayout role="tenant">
        <div className="text-center">Loading receipt...</div>
      </DashboardLayout>
    );
  }

  if (error || !receiptData) {
    return (
      <DashboardLayout role="tenant">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error || "Receipt not found"}</p>
            <Button onClick={() => router.push("/dashboard/tenant/payments")}>
              Back to Payments
            </Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout role="tenant">
        <div className="space-y-6">
          <div className="flex justify-between items-center no-print">
            <h1 className="text-3xl font-bold text-gray-800">Payment Receipt</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                Print Receipt
              </Button>
              <Button onClick={handleDownload}>Download Receipt</Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/tenant/payments")}
              >
                Back to Payments
              </Button>
            </div>
          </div>

          <div className="bg-white receipt-container">
            <Receipt
              payment={receiptData.payment}
              rental={receiptData.rental}
              property={receiptData.property}
              tenant={receiptData.tenant}
              landlord={receiptData.landlord}
            />
          </div>
        </div>
      </DashboardLayout>

      <style jsx global>{`
        @media print {
          /* Hide everything except receipt */
          body * {
            visibility: hidden;
          }
          .receipt-container,
          .receipt-container * {
            visibility: visible;
          }
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print,
          nav,
          aside,
          header,
          footer {
            display: none !important;
          }
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }
          @page {
            margin: 0.5cm;
            size: A4;
          }
        }
      `}</style>
    </>
  );
}


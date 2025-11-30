/**
 * Receipt Component
 * 
 * Standard receipt template for rental payments.
 * Can be printed or converted to PDF.
 * 
 * @param payment - Payment information
 * @param rental - Rental information
 * @param property - Property information
 * @param tenant - Tenant information
 * @param landlord - Landlord information
 */

"use client";

import React from "react";
import { Payment, Rental, Property, User } from "@/types";
import "./ReceiptStyles.css";

interface ReceiptProps {
  payment: Payment;
  rental: Rental;
  property: Property;
  tenant: User;
  landlord: User;
}

export default function Receipt({
  payment,
  rental,
  property,
  tenant,
  landlord,
}: ReceiptProps) {
  const receiptDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 border-2 border-gray-300 receipt-print" id="receipt">
      {/* Receipt Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">RENT RECEIPT</h1>
        <p className="text-sm text-gray-600">T-ODRE - Transparency-Oriented Digital Rental Ecosystem</p>
      </div>

      {/* Receipt Number */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Receipt No:</span>
          <span className="font-semibold text-lg">{payment.id.toUpperCase()}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-gray-600">Date:</span>
          <span className="font-semibold">{receiptDate}</span>
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-6 space-y-3">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="font-semibold text-lg mb-3 text-gray-800">Payment Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount Received:</span>
              <span className="font-bold text-xl text-green-600">
                ৳{payment.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">For the Month of:</span>
              <span className="font-semibold">
                {new Date(payment.month + "-01").toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-semibold capitalize">
                {payment.method?.replace("_", " ") || "Online Payment"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Status:</span>
              <span className="font-semibold text-green-600 uppercase">
                {payment.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Transaction Date:</span>
              <span className="font-semibold">
                {new Date(payment.timestamp).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Property Information */}
      <div className="mb-6 space-y-3">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="font-semibold text-lg mb-3 text-gray-800">Property Information</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Property Address:</span>
              <span className="font-semibold text-right">{property.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Rent:</span>
              <span className="font-semibold">৳{property.rent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rental Start Date:</span>
              <span className="font-semibold">
                {new Date(rental.startDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Parties Information */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-800">Received From (Tenant)</h3>
          <p className="font-semibold">{tenant.name}</p>
          <p className="text-sm text-gray-600">{tenant.email}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-800">Received By (Landlord)</h3>
          <p className="font-semibold">{landlord.name}</p>
          <p className="text-sm text-gray-600">{landlord.email}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t-2 border-gray-300">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            This is a computer-generated receipt. No signature required.
          </p>
          <p className="text-xs text-gray-500">
            Generated on {receiptDate} via T-ODRE System
          </p>
        </div>
      </div>
    </div>
  );
}


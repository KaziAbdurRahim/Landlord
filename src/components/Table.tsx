/**
 * Table Component
 * 
 * A reusable table component for displaying tabular data.
 * Supports headers and rows with consistent styling.
 * 
 * @param headers - Array of column header labels
 * @param rows - Array of row data (each row is an array of cells)
 * @param className - Additional CSS classes
 */

import React from "react";

interface TableProps {
  headers: string[];
  rows: React.ReactNode[][];
  className?: string;
}

export default function Table({ headers, rows, className = "" }: TableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        {/* Table Header */}
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        
        {/* Table Body */}
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-6 py-4 text-center text-gray-500">
                No data available
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}


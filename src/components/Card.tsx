/**
 * Card Component
 * 
 * A reusable card container component for displaying content in a structured,
 * visually appealing way. Used throughout dashboards for grouping related information.
 * 
 * @param title - Optional title displayed at the top of the card
 * @param children - Content to display inside the card
 * @param className - Additional CSS classes
 * @param action - Optional action button/element in the header
 */

import React from "react";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export default function Card({ title, children, className = "", action }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      {/* Card Header - Only shown if title or action is provided */}
      {(title || action) && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      
      {/* Card Body - Main content area */}
      <div className="px-6 py-4">
        {children}
      </div>
    </div>
  );
}


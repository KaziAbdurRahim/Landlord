/**
 * Star Rating Component
 * 
 * Displays and allows selection of star ratings (1-5 stars).
 * Can be used for both displaying ratings and selecting ratings.
 * 
 * @param rating - Current rating value (0-5)
 * @param onRatingChange - Callback when rating is changed (for editable mode)
 * @param editable - Whether the rating can be changed
 * @param size - Size of stars (sm, md, lg)
 */

"use client";

import React, { useState } from "react";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  editable?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function StarRating({
  rating,
  onRatingChange,
  editable = false,
  size = "md",
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const handleClick = (value: number) => {
    if (editable && onRatingChange) {
      onRatingChange(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (editable) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (editable) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          onMouseLeave={handleMouseLeave}
          disabled={!editable}
          className={`
            ${sizeClasses[size]}
            ${editable ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}
            ${star <= displayRating ? "text-yellow-400" : "text-gray-300"}
          `}
        >
          ★
        </button>
      ))}
      {rating > 0 && (
        <span className="ml-2 text-sm text-gray-600">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}


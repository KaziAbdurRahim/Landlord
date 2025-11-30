/**
 * Home Page
 * 
 * Landing page that redirects users to the login page.
 * In a production app, this might show marketing content or
 * provide options to login/register.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page on mount
    router.push("/auth/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">Loading...</h1>
      </div>
    </div>
  );
}


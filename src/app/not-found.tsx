"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const { pathname, search, hash } = window.location;

      // If the URL ends with .txt, strip it and redirect to the clean path
      if (pathname.endsWith(".txt")) {
        const cleanPath = pathname.replace(/\.txt$/, "");
        router.replace(cleanPath + search + hash);
        return;
      }
    }
  }, [router]);

  return null; // Render nothing while redirecting
}

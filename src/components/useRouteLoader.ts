"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function useRouteLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const handleStart = () => {
      setLoading(true);
    };

    const handleComplete = () => {
      timeout = setTimeout(() => setLoading(false), 100); // optional small delay
    };

    handleStart();

    // simulate complete after new pathname renders
    handleComplete();

    return () => clearTimeout(timeout);
  }, [pathname]);

  return loading;
}

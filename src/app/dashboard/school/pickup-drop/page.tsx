"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PickupDropMaster from "@/app/dashboard/reports/pickup-drop/page";

export default function SchoolPickupDropPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/reports/pickup-drop");
  }, [router]);

  return <PickupDropMaster />;
}

"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";

export default function EPoliceReportPage() {
  return (
    <div className="flex flex-col h-full p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-900">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              e-Police Report
            </h1>
            <p className="text-sm text-muted-foreground">
              Police submission and regulatory compliance reporting
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] border border-dashed rounded-xl bg-muted/20 p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/60 mb-3" />
        <h3 className="text-lg font-semibold text-gray-800">
          e-Police Report Data
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mt-1">
          This report module is enabled under your access permissions. Complete reporting filters and data export will be available here.
        </p>
      </div>
    </div>
  );
}

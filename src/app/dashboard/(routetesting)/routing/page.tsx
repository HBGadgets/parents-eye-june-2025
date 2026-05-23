"use client";

import dynamic from "next/dynamic";

const RoutingMap = dynamic(() => import("./routing-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-96px)] min-h-[640px] items-center justify-center p-4 text-sm text-slate-500">
      Loading map...
    </div>
  ),
});

export default function Routing() {
  return <RoutingMap />;
}

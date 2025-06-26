"use client";

import React from "react";
import { QueryClientProvider, HydrationBoundary } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function Providers({
  children,
  dehydratedState,
}: {
  children: React.ReactNode;
  dehydratedState?: unknown;
}) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

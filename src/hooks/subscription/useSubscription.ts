"use client";

import { GetSubscriptionExpirationResponse } from "@/interface/modal";
import { subscriptionExpiryService } from "@/services/api/subscriptionExpiry";
import { useQuery } from "@tanstack/react-query";

export const useSubscriptionExpiry = (isShown: boolean) => {
  const query = useQuery<GetSubscriptionExpirationResponse>({
    queryKey: ["subscription-expiry"],
    queryFn: subscriptionExpiryService.getSubscriptionExpiry,
    enabled: !isShown,
    staleTime: 1000 * 60 * 60 * 24,
    cacheTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    select: (res) => ({
      expiredBranches: res.data,
      expiredBranchesCount: res.count,
    }),
  });

  return (
    query.data ?? {
      expiredBranches: [],
      expiredBranchesCount: 0,
    }
  );
};

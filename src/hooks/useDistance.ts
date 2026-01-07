"use client";

import { Distance } from "@/interface/modal";
import { distanceService } from "@/services/api/distanceService";
import { useQuery } from "@tanstack/react-query";

export const useDistance = (uniqueId?: number) => {
  const getDistanceQuery = useQuery<Distance>({
    queryKey: ["distanceByUniqueId", uniqueId],
    queryFn: () => distanceService.getDistance({ uniqueId }),
    enabled: !!uniqueId,

    // 🔒 disable auto refetches
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    distance: getDistanceQuery.data ?? [],
    isLoading: getDistanceQuery.isLoading,
    isFetching: getDistanceQuery.isFetching,
  };
};

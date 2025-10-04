"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Branch } from "@/interface/modal";

export const useBranchData = () =>
  useQuery<Branch[]>({
    queryKey: ["branchData"],
    queryFn: async () => {
      const response = await api.get<Branch[]>("/branch");
      return response;
    },
  });

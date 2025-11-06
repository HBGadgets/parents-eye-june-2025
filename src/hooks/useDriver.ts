"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Driver } from "@/interface/modal";

export const useDriver = () =>
  useQuery<Driver[]>({
    queryKey: ["driverData"],
    queryFn: async () => {
      const response = await api.get<Driver[]>("/driver");
      return response;
    },
  });

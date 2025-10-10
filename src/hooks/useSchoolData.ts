import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { School } from "@/interface/modal";

export const useSchoolData = (options?: { enabled?: boolean }) =>
  useQuery<School[]>({
    queryKey: ["schoolData"],
    queryFn: async () => {
      const response = await api.get<School[]>("/school");
      return response;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

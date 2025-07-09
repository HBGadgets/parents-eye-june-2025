import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Parent } from "@/interface/modal";

export const useParentData = () =>
  useQuery<Parent[]>({
    queryKey: ["parentData"],
    queryFn: async () => {
      const response = await api.get<Parent[]>("/parent");
      return response;
    },
  });

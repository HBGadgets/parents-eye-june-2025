import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { BranchGroup } from "@/interface/modal";

export const useBranchGroupData = () =>
  useQuery<BranchGroup[]>({
    queryKey: ["branchData"],
    queryFn: async () => {
      const response = await api.get<BranchGroup[]>("/branchGroup");
      return response;
    },
  });

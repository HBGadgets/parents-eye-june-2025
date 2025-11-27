import api from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

export const useSchoolDropdown = () => {
  return useQuery({
    queryKey: ["dropdown-schools"],
    queryFn: async () => {
      const res = await api.get("/school/dropdown");
      return res.data.data;
    },
  });
};

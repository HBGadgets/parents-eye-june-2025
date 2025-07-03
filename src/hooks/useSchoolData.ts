import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useSchoolData = () =>
  useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const { data } = await axios.get("/api/schools");
      return data;
    },
  });

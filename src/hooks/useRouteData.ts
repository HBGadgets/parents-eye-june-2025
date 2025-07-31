import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Route } from "@/interface/modal";

export const useRouteData = () =>
  useQuery<Route[]>({
    queryKey: ["routeData"],
    queryFn: async () => {
      const response = await api.get<Route[]>("/route");
      return response;
    },
  });

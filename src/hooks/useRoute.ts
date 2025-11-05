import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Branch, Device, School } from "@/interface/modal";

interface Route {
  _id: String;
  routeName: String;
  deviceObjId: Device;
  schoolId: School;
  branchId: Branch;
  createdAt: string;
}

interface RouteResponse {
  data: Route[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseRouteParams {
  search?: string;
  page?: number | string;
  limit?: number | string;
  from?: string;
  to?: string;
  schoolId?: string;
  branchId?: string;
}

const fetchRoutes = async (params: UseRouteParams): Promise<RouteResponse> => {
  const response = await api.get<RouteResponse>("/route", { params });
  return response;
};

export const useRoutes = (params: UseRouteParams) => {
  return useQuery({
    queryKey: ["routes", params],
    queryFn: () => fetchRoutes(params),
  });
};

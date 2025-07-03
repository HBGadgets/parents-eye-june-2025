import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Device } from "@/interface/modal";

export const useDeviceData = () =>
  useQuery<Device[]>({
    queryKey: ["deviceData"],
    queryFn: async () => {
      const response = await api.get<Device[]>("/device");
      return response;
    },
  });

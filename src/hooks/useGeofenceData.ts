import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Geofence } from "@/interface/modal";

export const useGeofenceData = () =>
  useQuery<Geofence[]>({
    queryKey: ["geofenceData"],
    queryFn: async () => {
      const response = await api.get<Geofence[]>("/geofence");
      return response;
    },
  });

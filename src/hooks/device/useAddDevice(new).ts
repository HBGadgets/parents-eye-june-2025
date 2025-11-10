import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { toast } from "sonner"; // optional if you're using Sonner or any toast lib

interface DevicePayload {
  name: string;
  uniqueId: string;
  deviceId: string;
  sim: string;
  speed: string;
  average: string;
  driver: string;
  model: string;
  routeNo: string;
  category: string;
  schoolId: string;
  branchId: string;
}

export const useAddDeviceNew = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DevicePayload) => {
      const { data } = await api.post("/device", payload);
      return data;
    },
    onSuccess: () => {
      toast.success("Device added successfully!");
      queryClient.invalidateQueries(["devices"]); // Refresh device list if exists
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to add device");
    },
  });
};

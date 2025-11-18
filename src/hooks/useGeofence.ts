import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { totalmem } from "os";
import { Branch, Device, School } from "@/interface/modal";

export interface Geofence {
  _id: string;
  geofenceName: string;
  area: {
    center: [number, number];
    radius: number;
  };
  pickupTime?: string;
  dropTime?: string;
  schoolId?: string;
  branchId?: string;
  routeObjId?: string;
  createdAt?: string;
  updatedAt?: string;
  route?: {
    routeNumber: string;
    device: Device;
  };
  school?: School;
  branch?: Branch;
}

interface GeofenceParams {
  schoolId?: string;
  branchId?: string;

  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

// Type guard to validate geofence data
const isValidGeofence = (geofence: any): geofence is Geofence => {
  const isValid =
    geofence &&
    typeof geofence._id === "string" &&
    geofence.area &&
    Array.isArray(geofence.area.center) &&
    geofence.area.center.length === 2 &&
    typeof geofence.area.center[0] === "number" &&
    typeof geofence.area.center[1] === "number" &&
    typeof geofence.area.radius === "number" &&
    !isNaN(geofence.area.center[0]) &&
    !isNaN(geofence.area.center[1]) &&
    !isNaN(geofence.area.radius) &&
    Math.abs(geofence.area.center[0]) <= 90 &&
    Math.abs(geofence.area.center[1]) <= 180 &&
    geofence.area.radius > 0;

  if (!isValid) {
    console.warn("❌ Invalid geofence structure:", geofence);
  }

  return isValid;
};

// Fetch geofences with validation
export const useGeofences = (params?: GeofenceParams) => {
  return useQuery({
    queryKey: ["geofences", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.schoolId) queryParams.append("schoolId", params.schoolId);
      if (params?.branchId) queryParams.append("branchId", params.branchId);
      if (params?.page) queryParams.append("page", String(params.page));
      if (params?.limit) queryParams.append("limit", String(params.limit));

      if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
      if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

      if (params?.search) queryParams.append("search", params.search);

      if (params?.schoolId) queryParams.append("schoolId", params.schoolId);
      if (params?.branchId) queryParams.append("branchId", params.branchId);

      // console.log("🔍 Fetching geofences with params:", params);
      const response = await api.get(`/geofence?${queryParams.toString()}`);

      // console.log("📥 Raw API response:", response);

      // Handle different response structures
      let data = response.data;

      // If response is wrapped in a data property
      if (data && data.data) {
        data = data.data;
      }

      // If response has a geofences property
      if (data && data.geofences) {
        data = data.geofences;
      }

      // console.log("📦 Processed data:", data);

      // Ensure it's an array
      if (!Array.isArray(data)) {
        console.warn("⚠️ API did not return an array:", data);
        return [];
      }

      // Filter out invalid geofences
      const validGeofences = data.filter(isValidGeofence);
      // console.log("✅ Valid geofences:", validGeofences.length, validGeofences);

      return {
        data: validGeofences,
        total: response.total,
        page: response.page,
        limit: response.limit,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Create geofence with proper optimistic update
export const useCreateGeofence = (params?: GeofenceParams) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      // console.log("📤 Sending geofence creation request:", payload);
      const response = await api.post("/geofence", payload);

      // console.log("📥 Create geofence raw response:", response);

      // Handle the response structure from your API
      let data = response.data;

      // Your API returns: { message: "...", geofence: {...} }
      if (data && data.geofence) {
        data = data.geofence;
      }

      // If response is wrapped in a data property
      if (data && data.data) {
        data = data.data;
      }

      // console.log("📦 Processed create response:", data);

      return data;
    },

    // Optimistic update with proper validation
    onMutate: async (newGeofence) => {
      // console.log("⚡ Optimistic update - Creating geofence:", newGeofence);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["geofences", params] });

      // Snapshot previous value
      const previousGeofences = queryClient.getQueryData<Geofence[]>([
        "geofences",
        params,
      ]);

      // Create optimistic geofence matching your API structure
      const optimisticGeofence: Geofence = {
        _id: `temp-${Date.now()}`,
        geofenceName: newGeofence.geofenceName || "New Geofence",
        area: {
          center: newGeofence.area?.center || [
            newGeofence.latitude || 0,
            newGeofence.longitude || 0,
          ],
          radius: newGeofence.area?.radius || newGeofence.radius || 200,
        },
        pickupTime: newGeofence.pickupTime,
        dropTime: newGeofence.dropTime,
        schoolId: newGeofence.schoolId,
        branchId: newGeofence.branchId,
        routeObjId: newGeofence.routeObjId,
        createdAt: new Date().toISOString(),
      };

      // console.log("🎯 Optimistic geofence created:", optimisticGeofence);

      // Only update if the optimistic geofence is valid
      if (isValidGeofence(optimisticGeofence)) {
        queryClient.setQueryData<Geofence[]>(
          ["geofences", params],
          (old = []) => {
            const updated = [...old, optimisticGeofence];
            // console.log("💾 Cache updated with optimistic data:", updated);
            return updated;
          }
        );
      } else {
        console.warn("⚠️ Optimistic geofence is invalid, not updating cache");
      }

      return { previousGeofences };
    },

    // On error, rollback
    onError: (err, newGeofence, context) => {
      console.error("❌ Mutation error:", err);

      if (context?.previousGeofences) {
        // console.log("↩️ Rolling back to previous state");
        queryClient.setQueryData(
          ["geofences", params],
          context.previousGeofences
        );
      }
    },

    // On success, replace temp with real data
    onSuccess: (data, variables) => {
      // console.log("✅ Mutation success, response data:", data);

      // If API returns undefined or null, keep the optimistic update and refetch
      if (!data) {
        console.warn("⚠️ Server returned no data, will rely on refetch");
        return;
      }

      // Validate the response data
      if (!isValidGeofence(data)) {
        console.warn(
          "⚠️ Invalid geofence data from server, will rely on refetch:",
          data
        );
        return;
      }

      queryClient.setQueryData<Geofence[]>(
        ["geofences", params],
        (old = []) => {
          // Remove temporary geofence and add the real one
          const filtered = old.filter((g) => !g._id.startsWith("temp-"));
          const updated = [...filtered, data];
          // console.log("💾 Cache updated with server response:", updated);
          return updated;
        }
      );
    },

    // Always refetch for consistency
    onSettled: () => {
      // console.log("🔄 Mutation settled, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["geofences", params] });
    },
  });
};

// Delete geofence with optimistic update
export const useDeleteGeofence = (params?: GeofenceParams) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (geofenceId: string) => {
      const response = await api.delete(`/geofence/${geofenceId}`);
      return response.data;
    },

    onMutate: async (geofenceId) => {
      await queryClient.cancelQueries({ queryKey: ["geofences", params] });

      const previousGeofences = queryClient.getQueryData<Geofence[]>([
        "geofences",
        params,
      ]);

      queryClient.setQueryData<Geofence[]>(["geofences", params], (old = []) =>
        old.filter((g) => g._id !== geofenceId)
      );

      return { previousGeofences };
    },

    onError: (err, geofenceId, context) => {
      if (context?.previousGeofences) {
        queryClient.setQueryData(
          ["geofences", params],
          context.previousGeofences
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences", params] });
    },
  });
};

// Export the type guard for use in components
export { isValidGeofence };

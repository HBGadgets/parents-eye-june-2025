import { dropdownService } from "@/services/api/dropdownService";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export interface DropdownItem {
  _id: string;
  name?: string;
  schoolName?: string;
  branchName?: string;
  routeNumber?: string;
  categoryName?: string;
  modelName?: string;
  driverName?: string;
}

export interface DropdownResponse<T> {
  page?: number;
  limit?: number;
  totalCount?: number;
  totalPages?: number;
  data: T[];
}

export const useSchoolDropdown = (shouldFetch: boolean = true) => {
  return useQuery({
    queryKey: ["dropdown-schools"],
    queryFn: dropdownService.getSchools,
    enabled: shouldFetch,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useBranchDropdown = (
  schoolId?: string,
  shouldFetch: boolean = true,
  skipSchoolId: boolean = false
) => {
  console.log("Fetching branches for schoolId:", schoolId);
  return useQuery<DropdownResponse<DropdownItem>>({
    queryKey: ["branch-dropdown", skipSchoolId ? undefined : schoolId],
    queryFn: () =>
      dropdownService.getBranches(skipSchoolId ? undefined : schoolId),
    enabled: (skipSchoolId || !!schoolId) && shouldFetch,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useDeviceDropdown = (
  branchId?: string,
  shouldFetch: boolean = true
) => {
  return useQuery<DropdownResponse<DropdownItem>>({
    queryKey: ["device-dropdown", branchId],
    queryFn: () => dropdownService.getDevices(branchId),
    enabled: !!branchId,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useDeviceDropdownWithUniqueId = (
  branchId?: string,
  shouldFetch: boolean = true
) => {
  return useQuery<DropdownResponse<DropdownItem>>({
    queryKey: ["device-dropdown-uniqueId", branchId],
    queryFn: () => dropdownService.getDevicesWithUniqueId(branchId),
    enabled: !!branchId,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useDeviceDropdownWithUniqueIdForHistory = (
  shouldFetch: boolean = true
) => {
  return useQuery<DropdownResponse<DropdownItem>>({
    queryKey: ["device-dropdown-uniqueId"],
    queryFn: () => dropdownService.getDevicesWithUniqueId(),
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useRouteDropdown = (
  branchId?: string,
  shouldFetch: boolean = true
) => {
  console.log("Fetching routes for branchId:", branchId);
  return useQuery<DropdownResponse<DropdownItem>>({
    queryKey: ["route-dropdown", branchId],
    queryFn: async () => await dropdownService.getRoutes(branchId),
    enabled: !!branchId && shouldFetch,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useParentDropdown = (
  branchId?: string,
  search: string = "",
  shouldFetch: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: ["parent-dropdown", branchId, search],
    enabled: !!branchId && shouldFetch,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await dropdownService.getParents({
        branchId: branchId as string,
        page: pageParam as number,
        limit: 10,
        search,
      });

      return res.data as DropdownResponse<DropdownItem>;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }

      return undefined;
    },
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useGeofenceDropdown = (
  routeObjId?: string,
  search: string = "",
  shouldFetch: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: ["geofence-dropdown", routeObjId, search],
    enabled: !!routeObjId && shouldFetch,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await dropdownService.getGeofence({
        routeObjId: routeObjId as string,
        page: pageParam as number,
        limit: 10,
        search,
      });

      return res.data as DropdownResponse<DropdownItem>;
    },

    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      } else {
        return undefined;
      }
    },
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useCategoryDropdown = (shouldFetch: boolean = true) => {
  return useQuery({
    queryKey: ["category-dropdown"],
    queryFn: dropdownService.getCategory,
    enabled: shouldFetch,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useModelDropdown = (shouldFetch: boolean = true) => {
  return useQuery({
    queryKey: ["model-dropdown"],
    queryFn: dropdownService.getModel,
    enabled: shouldFetch,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useDriverDropdown = (
  shouldFetch: boolean = true,
  search: string = "",
  branchId?: string
) => {
  return useInfiniteQuery({
    queryKey: ["driver-dropdown", branchId, search],
    enabled: !!branchId && shouldFetch,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await dropdownService.getDriver({
        branchId: branchId as string,
        page: pageParam as number,
        limit: 10,
        search,
      });

      return res.data as DropdownResponse<DropdownItem>;
    },

    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      } else {
        return undefined;
      }
    },
    refetchOnWindowFocus: false,
    retry: false,
  });
};

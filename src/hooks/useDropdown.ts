import api from "@/lib/axios";
import { dropdownService } from "@/services/api/dropdownService";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export interface DropdownItem {
  _id: string;
  name?: string;
  schoolName?: string;
  branchName?: string;
}

export interface DropdownResponse<T> {
  page?: number;
  limit?: number;
  totalCount?: number;
  totalPages?: number;

  data: T[];
}

export const useSchoolDropdown = () => {
  return useQuery({
    queryKey: ["dropdown-schools"],
    queryFn: dropdownService.getSchools,
    select: (res) => res.data.data,
  });
};

export const useBranchDropdown = (schoolId?: string) => {
  console.log("Fetching branches for schoolId:", schoolId);
  return useQuery<DropdownResponse<DropdownItem>>({
    queryKey: ["branch-dropdown", schoolId],
    queryFn: () => dropdownService.getBranches(schoolId),
    enabled: !!schoolId,
    select: (res) => res.data.data,
  });
};

export const useDeviceDropdown = (branchId?: string) => {
  return useQuery<DropdownResponse<DropdownItem>>({
    queryKey: ["device-dropdown", branchId],
    queryFn: () => dropdownService.getDevices(branchId),
    enabled: !!branchId,
    select: (res) => res.data.data,
  });
};

export const useRouteDropdown = (branchId?: string) => {
  console.log("Fetching routes for branchId:", branchId);
  return useQuery<DropdownResponse<DropdownItem>>({
    queryKey: ["route-dropdown", branchId],
    queryFn: async () => await dropdownService.getRoutes(branchId),
    enabled: !!branchId,
    select: (res) => res.data.data,
  });
};

export const useParentDropdown = (branchId?: string, search: string = "") => {
  return useInfiniteQuery({
    queryKey: ["parent-dropdown", branchId, search],
    enabled: !!branchId,
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
  });
};

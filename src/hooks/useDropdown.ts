import api from "@/lib/axios";
import { dropdownService } from "@/services/api/dropdownService";
import { useQuery } from "@tanstack/react-query";

export interface DropdownItem {
  _id: string;
  name?: string;
  schoolName?: string;
  branchName?: string;
}

export interface DropdownResponse<T> {
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

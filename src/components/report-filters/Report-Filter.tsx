"use client";

import { SearchableDropdown } from "@/components/SearcheableDropdownFilter";
import React, { useState, useMemo, useEffect } from "react";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useDeviceData } from "@/hooks/useDeviceData";
import { Button } from "@/components/ui/button";
import DateRangeFilter from "../ui/DateRangeFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { Column } from "@tanstack/react-table";
import { Combobox } from "@/components/ui/combobox";

interface SchoolBranchSelectorProps {
  enforceRoleBasedSelection?: boolean;
  onFilterSubmit?: (filters: {
    schoolId: string | null;
    branchId: string | null;
    deviceId: string | null;
    deviceName: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }) => void;
  className?: string;
  columns?: Column<unknown, unknown>[];
  showColumnVisibility?: boolean;
  vehicleMetaData?: Array<{ value: string; label: string }>;
  selectedVehicle?: string;
  onVehicleChange?: (value: string) => void;
  searchTerm?: string;
  onSearchChange?: (search: string) => void;
  onVehicleReachEnd?: () => void;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
}

const SchoolBranchSelector: React.FC<SchoolBranchSelectorProps> = ({
  enforceRoleBasedSelection = true,
  onFilterSubmit,
  className = "",
  columns = [],
  showColumnVisibility = false,
  vehicleMetaData,
  selectedVehicle = "",
  onVehicleChange,
  searchTerm = "",
  onSearchChange,
  onVehicleReachEnd,
  isFetchingNextPage = false,
  hasNextPage = false,
}) => {
  const [role, setRole] = useState<string | null>(null);

  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(null);
  const [internalSelectedVehicle, setInternalSelectedVehicle] = useState<string>(
    selectedVehicle || ""
  );
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [internalSearchTerm, setInternalSearchTerm] = useState("");

  // Data hooks
  const { data: schoolData } = useSchoolData();
  const { data: branchData, refetch: refetchBranches, setSchoolFilter } = useBranchData();
  const {
    data: deviceData,
    fetchNextPage,
    hasNextPage: deviceHasNextPage,
    isFetchingNextPage: deviceIsFetchingNextPage,
    refetch: refetchDevices,
  } = useDeviceData({
    searchTerm: internalSearchTerm,
    branchId: selectedBranch,
  });

  useEffect(() => {
    setInternalSelectedVehicle(selectedVehicle || "");
  }, [selectedVehicle]);

  // Decode token and apply filters based on role
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    const decoded = getDecodedToken(token);
    const rawRole = (decoded?.role || "").toLowerCase();
    setRole(rawRole);

    const isSuperAdmin = ["admin", "superadmin", "super_admin", "root"].includes(rawRole);
    const isSchoolRole = ["school", "schooladmin"].includes(rawRole);
    const isBranchRole = ["branch", "branchadmin"].includes(rawRole);

    if (isBranchRole && decoded?.branchId) {
      setSelectedBranch(decoded.branchId);
      setTimeout(() => refetchDevices?.(), 300);
    } else if (isSchoolRole && decoded?.schoolId) {
      setSelectedSchool(decoded.schoolId);
      setSchoolFilter?.(decoded.schoolId);
      setTimeout(() => refetchBranches?.(), 300);
    } else if (isSuperAdmin) {
      refetchBranches?.();
    }
  }, [refetchBranches, refetchDevices, setSchoolFilter]);

  // Fetch branch data when school changes
  useEffect(() => {
    if (selectedSchool) {
      setSelectedBranch(null);
      setInternalSelectedVehicle("");
      setSelectedDeviceName(null);
      setSchoolFilter?.(selectedSchool);
      refetchBranches?.();
    }
  }, [selectedSchool, refetchBranches, setSchoolFilter]);

  // Fetch device data when branch changes
  useEffect(() => {
    if (selectedBranch) {
      refetchDevices?.();
    }
  }, [selectedBranch, refetchDevices]);

  const schools = useMemo(() => {
    if (!schoolData) return [];
    return schoolData.map((s: any) => ({ label: s.schoolName, value: s._id }));
  }, [schoolData]);

  const branches = useMemo(() => {
    if (!branchData) return [];
    return branchData.map((b: any) => ({ label: b.branchName, value: b._id }));
  }, [branchData]);

  const internalVehicleMetaData = useMemo(() => {
    if (!deviceData?.pages) return [];
    return deviceData.pages.flat().map((d: any) => ({
      value: String(d.deviceId),
      label: d.name,
    }));
  }, [deviceData]);

  const finalVehicleMetaData = vehicleMetaData || internalVehicleMetaData;

  const handleInternalSearchChange = (search: string) => {
    setInternalSearchTerm(search);
    onSearchChange?.(search);
  };

  const handleInternalVehicleReachEnd = () => {
    if (deviceHasNextPage && !deviceIsFetchingNextPage) fetchNextPage();
    onVehicleReachEnd?.();
  };

  const handleVehicleChange = (value: string) => {
    setInternalSelectedVehicle(value);
    const found = finalVehicleMetaData.find((v) => v.value === value);
    setSelectedDeviceName(found?.label ?? null);
    onVehicleChange?.(value);
  };

  const handleSubmit = () => {
    onFilterSubmit?.({
      schoolId: selectedSchool,
      branchId: selectedBranch,
      deviceId: internalSelectedVehicle || null,
      deviceName: selectedDeviceName,
      startDate: dateRange.start,
      endDate: dateRange.end,
    });
  };

  const isSuperAdmin = ["admin", "superadmin", "super_admin", "root"].includes(
    (role || "").toLowerCase()
  );
  const isSchoolRole = ["school", "schooladmin"].includes((role || "").toLowerCase());
  const isBranchRole = ["branch", "branchadmin"].includes((role || "").toLowerCase());

  if (role === null) return null;

  return (
    <div className="w-full border border-gray-200 bg-white rounded-lg p-4 shadow-sm">
      <div className={`flex flex-wrap gap-3 items-center ${className}`}>
        {/* SCHOOL DROPDOWN — Super Admin only */}
        {isSuperAdmin && (
          <div className="flex-1 min-w-[160px] max-w-[200px]">
            <SearchableDropdown
              items={schools}
              placeholder="Choose a school..."
              searchPlaceholder="Search school..."
              emptyMessage="No school found."
              value={selectedSchool}
              onSelect={(item: any) => {
                setSelectedSchool(item.value);
                onVehicleChange?.("");
              }}
            />
          </div>
        )}

        {/* BRANCH DROPDOWN — Show for super admin + school login */}
        {isSuperAdmin || isSchoolRole ? (
          <div className="flex-1 min-w-[160px] max-w-[200px]">
            <SearchableDropdown
              items={branches}
              placeholder="Choose a branch..."
              searchPlaceholder="Search branch..."
              emptyMessage={
                isSchoolRole
                  ? "No branch found for this school."
                  : !selectedSchool
                  ? "Select a school first."
                  : "No branch found."
              }
              value={selectedBranch}
              onSelect={(item: any) => {
                setSelectedBranch(item.value);
                onVehicleChange?.("");
              }}
            />
          </div>
        ) : null}

        {/* DEVICE DROPDOWN — always visible */}
        <div className="flex-1 min-w-[160px] max-w-[200px]">
          <Combobox
            items={finalVehicleMetaData}
            value={internalSelectedVehicle}
            onValueChange={handleVehicleChange}
            placeholder="Search vehicle..."
            searchPlaceholder="Search vehicles..."
            emptyMessage={
              !selectedBranch ? "Select a branch first." : "No vehicles found."
            }
            width="w-full"
            infiniteScroll
            limit={20}
            onReachEnd={handleInternalVehicleReachEnd}
            isLoadingMore={isFetchingNextPage || deviceIsFetchingNextPage}
            onSearchChange={handleInternalSearchChange}
            searchValue={searchTerm || internalSearchTerm}
          />
        </div>

        {/* DATE + COLUMN FILTERS */}
        <div className="flex min-w-[340px] max-w-[380px] gap-2">
          <DateRangeFilter
            onDateRangeChange={(start, end) => setDateRange({ start, end })}
            placeholderClassName="font-bold"
          />
          {showColumnVisibility && columns.length > 0 ? (
            <ColumnVisibilitySelector columns={columns} buttonVariant="outline" />
          ) : (
            <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm flex items-center">
              Columns
            </div>
          )}
        </div>
      </div>

      {/* SUBMIT BUTTON */}
      <div className="flex justify-end mt-4">
        <Button
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
          onClick={handleSubmit}
        >
          Show Report
        </Button>
      </div>
    </div>
  );
};

export default SchoolBranchSelector;

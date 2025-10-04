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
import { useExport } from "@/hooks/useExport";
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
  columns?: Column<any, unknown>[];
  onColumnVisibilityChange?: (visibility: any) => void;
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
  onColumnVisibilityChange,
  showColumnVisibility = false,
  vehicleMetaData = [],
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
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(
    null
  );
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [loading, setLoading] = useState(false);

  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();
  const { data: deviceData } = useDeviceData();
  const { exportToPDF, exportToExcel } = useExport();

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      const decoded = getDecodedToken(token);
      const userRole = decoded?.role?.toLowerCase() || null;
      setRole(userRole);

      if (userRole === "branch" && decoded?.branchId) {
        setSelectedBranch(decoded.branchId);
      } else if (
        (userRole === "school" || userRole === "schooladmin") &&
        decoded?.schoolId
      ) {
        setSelectedSchool(decoded.schoolId);
      } else if (
        userRole === "branchadmin" &&
        decoded?.schoolId &&
        decoded?.branchId
      ) {
        setSelectedSchool(decoded.schoolId);
        setSelectedBranch(decoded.branchId);
      }
    }
  }, []);

  const schools = useMemo(() => {
    if (!schoolData) return [];
    return schoolData.map((school) => ({
      label: school.schoolName,
      value: school._id,
    }));
  }, [schoolData]);

  const branches = useMemo(() => {
    if (!branchData) return [];
    if (selectedSchool) {
      return branchData
        .filter((branch: any) => branch.schoolId?._id === selectedSchool)
        .map((branch: any) => ({
          label: branch.branchName,
          value: branch._id,
        }));
    }
    return [];
  }, [branchData, selectedSchool]);

  const filteredVehicleMetaData = useMemo(() => {
    if (!selectedBranch) {
      return [];
    }
    return vehicleMetaData.filter(() => true);
  }, [vehicleMetaData, selectedBranch]);

  const handleVehicleChange = (value: string) => {
    if (onVehicleChange) {
      onVehicleChange(value);
    }
    const selected = vehicleMetaData.find((vehicle) => vehicle.value === value);
    setSelectedDeviceName(selected?.label || null);
  };

  const handleSubmit = () => {
    const filterData = {
      schoolId: selectedSchool,
      branchId: selectedBranch,
      deviceName: selectedDeviceName,
      deviceId: selectedVehicle,
      startDate: dateRange.start,
      endDate: dateRange.end,
    };
    onFilterSubmit?.(filterData);
  };

  if (role === null) return null;

  return (
    <div className="w-full border border-gray-200 bg-white rounded-lg p-4 shadow-sm">
      {/* Filters row */}
      <div className={`flex flex-wrap gap-3 items-center ${className}`}>
        {/* User Column */}
        <div className="flex-1 min-w-[160px] max-w-[200px]">
          {role !== "branch" && (
            <>
              {role !== "school" ? (
                <SearchableDropdown
                  items={schools}
                  placeholder="Choose a school..."
                  searchPlaceholder="Search school..."
                  emptyMessage="No school found."
                  value={selectedSchool}
                  onSelect={(item) => {
                    setSelectedSchool(item.value);
                    setSelectedBranch(null);
                    if (onVehicleChange) {
                      onVehicleChange("");
                    }
                  }}
                  disabled={
                    enforceRoleBasedSelection &&
                    (role === "schooladmin" || role === "branchadmin")
                  }
                />
              ) : (
                <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm">
                  School User
                </div>
              )}
            </>
          )}
          {role === "branch" && (
            <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm">
              Branch User
            </div>
          )}
        </div>

        {/* Groups Column */}
        <div className="flex-1 min-w-[160px] max-w-[200px]">
          {role !== "branch" ? (
            <SearchableDropdown
              items={branches}
              placeholder="Choose a branch..."
              searchPlaceholder="Search branch..."
              emptyMessage={
                !selectedSchool
                  ? "Select a school first."
                  : "No branch found for this school."
              }
              value={selectedBranch}
              onSelect={(item) => {
                setSelectedBranch(item.value);
                if (onVehicleChange) {
                  onVehicleChange("");
                }
              }}
              disabled={
                !selectedSchool ||
                (enforceRoleBasedSelection && role === "branchadmin")
              }
            />
          ) : (
            <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm">
              Branch Group
            </div>
          )}
        </div>

        {/* Vehicles Column */}
        <div className="flex-1 min-w-[160px] max-w-[200px]">
          <Combobox
            items={filteredVehicleMetaData}
            value={selectedVehicle}
            onValueChange={handleVehicleChange}
            placeholder="Search vehicle..."
            searchPlaceholder="Search vehicles..."
            emptyMessage={
              !selectedBranch
                ? "Select a branch first."
                : "No vehicles found for this branch."
            }
            width="w-full"
            infiniteScroll={true}
            limit={20}
            onReachEnd={onVehicleReachEnd}
            isLoadingMore={isFetchingNextPage}
            onSearchChange={onSearchChange}
            searchValue={searchTerm}
          />
        </div>

        {/* Date + Columns in same row */}
        <div className="flex min-w-[340px] max-w-[380px] gap-2">
          <DateRangeFilter
            onDateRangeChange={(start, end) => setDateRange({ start, end })}
            placeholderClassName="font-bold" // 👈 makes placeholder bold
          />

          {showColumnVisibility && columns.length > 0 ? (
            <ColumnVisibilitySelector
              columns={columns}
              buttonVariant="outline"
              buttonSize="default"
            />
          ) : (
            <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm flex items-center">
              Select...
            </div>
          )}
        </div>
      </div>

      {/* Show Now Button (below, right aligned) */}
      <div className="flex justify-end mt-4">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Loading..." : "Show Report"}
        </Button>
      </div>
    </div>
  );
};

export default SchoolBranchSelector;

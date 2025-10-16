// components/filters/ReportFilter.tsx
"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { Combobox } from "@/components/ui/combobox";
import { useInfiniteDeviceData } from "@/hooks/useInfiniteDeviceData";
import DateRangeFilter from "../ui/DateRangeFilter";
import { formatDateToYYYYMMDD } from "@/util/formatDate";
import { Button } from "../ui/button";

export interface FilterValues {
  schoolId: string | null;
  branchId: string | null;
  deviceId: string | null;
  deviceName: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface ReportFilterConfig {
  showSchool?: boolean;
  showBranch?: boolean;
  showDevice?: boolean;
  showDateRange?: boolean;
  showSubmitButton?: boolean;
  submitButtonText?: string;
  dateRangeMaxDays?: number;
  dateRangeTitle?: string;
  enforceRoleBasedSelection?: boolean;
  customValidation?: (filters: FilterValues) => string | null;
}

interface ReportFilterProps {
  onSubmit: (filters: FilterValues) => void;
  config?: ReportFilterConfig;
  className?: string;
  initialValues?: Partial<FilterValues>;

  // Optional controlled props
  selectedSchool?: string | null;
  onSchoolChange?: (schoolId: string | null) => void;

  selectedBranch?: string | null;
  onBranchChange?: (branchId: string | null) => void;

  selectedDevice?: string | null;
  onDeviceChange?: (deviceId: string | null, deviceName: string | null) => void;

  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange) => void;
}

const defaultConfig: ReportFilterConfig = {
  showSchool: true,
  showBranch: true,
  showDevice: true,
  showDateRange: true,
  showSubmitButton: true,
  submitButtonText: "Generate Report",
  // dateRangeMaxDays: 90,
  dateRangeTitle: "Select Date Range",
  enforceRoleBasedSelection: true,
};

export const ReportFilter: React.FC<ReportFilterProps> = ({
  onSubmit,
  config = {},
  className = "",
  initialValues = {},

  // Controlled props (optional)
  selectedSchool: controlledSchool,
  onSchoolChange,

  selectedBranch: controlledBranch,
  onBranchChange,

  selectedDevice: controlledDevice,
  onDeviceChange,

  dateRange: controlledDateRange,
  onDateRangeChange,
}) => {
  const mergedConfig = { ...defaultConfig, ...config };

  // State management (only used if not controlled)
  const [internalSchool, setInternalSchool] = useState<string | null>(
    initialValues.schoolId || null
  );
  const [internalBranch, setInternalBranch] = useState<string | null>(
    initialValues.branchId || null
  );
  const [internalDevice, setInternalDevice] = useState<string | null>(
    initialValues.deviceId || null
  );
  const [internalDateRange, setInternalDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  const [role, setRole] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Use controlled values if provided, otherwise use internal state
  const selectedSchool =
    controlledSchool !== undefined ? controlledSchool : internalSchool;
  const selectedBranch =
    controlledBranch !== undefined ? controlledBranch : internalBranch;
  const selectedDevice =
    controlledDevice !== undefined ? controlledDevice : internalDevice;
  const dateRange = controlledDateRange || internalDateRange;

  // Data hooks
  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Normalize role
  const normalizedRole = useMemo(() => {
    const r = (role || "").toLowerCase();
    if (["superadmin", "super_admin", "admin", "root"].includes(r))
      return "superAdmin";
    if (["school", "schooladmin"].includes(r)) return "school";
    if (["branch", "branchadmin"].includes(r)) return "branch";
    return undefined;
  }, [role]);

  // Infinite device data
  const {
    data: deviceData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteDeviceData({
    role: normalizedRole as any,
    branchId: selectedBranch || undefined,
    search: debouncedSearch,
    limit: 20,
  });

  // Decode token
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;
    const decoded = getDecodedToken(token);
    setRole((decoded?.role || "").toLowerCase());
  }, []);

  // Role checks
  const isSuperAdmin = ["admin", "superadmin", "super_admin", "root"].includes(
    (role || "").toLowerCase()
  );
  const isSchoolRole = ["school", "schooladmin"].includes(
    (role || "").toLowerCase()
  );

  // Memoized options
  const schools = useMemo(() => {
    if (!schoolData) return [];
    return schoolData.map((s: any) => ({ label: s.schoolName, value: s._id }));
  }, [schoolData]);

  const branches = useMemo(() => {
    if (!branchData) return [];
    if (isSuperAdmin) {
      if (!selectedSchool) return [];
      return branchData
        .filter((b: any) => b.schoolId?._id === selectedSchool)
        .map((b: any) => ({ label: b.branchName, value: b._id }));
    }
    return branchData.map((b: any) => ({ label: b.branchName, value: b._id }));
  }, [branchData, isSuperAdmin, selectedSchool]);

  const deviceItems = useMemo(() => {
    if (!deviceData?.pages?.length) return [];
    return deviceData.pages.flatMap((pg: any) => {
      const list = pg.devices ?? pg.data ?? [];
      return list.map((d: any) => ({ label: d.name, value: d._id }));
    });
  }, [deviceData]);

  // Reset handlers
  useEffect(() => {
    if (controlledDevice === undefined) {
      setInternalDevice(null);
    }
  }, [selectedSchool, selectedBranch, controlledDevice]);

  // Change handlers
  const handleSchoolChange = useCallback(
    (value: string) => {
      if (onSchoolChange) {
        onSchoolChange(value);
      } else {
        setInternalSchool(value);
      }

      // Reset dependent fields
      if (onBranchChange) {
        onBranchChange(null);
      } else {
        setInternalBranch(null);
      }

      if (onDeviceChange) {
        onDeviceChange(null, null);
      } else {
        setInternalDevice(null);
      }
    },
    [onSchoolChange, onBranchChange, onDeviceChange]
  );

  const handleBranchChange = useCallback(
    (value: string) => {
      if (onBranchChange) {
        onBranchChange(value);
      } else {
        setInternalBranch(value);
      }

      // Reset device
      if (onDeviceChange) {
        onDeviceChange(null, null);
      } else {
        setInternalDevice(null);
      }
    },
    [onBranchChange, onDeviceChange]
  );

  const handleDeviceChange = useCallback(
    (value: string) => {
      const deviceName =
        deviceItems.find((item) => item.value === value)?.label || null;

      if (onDeviceChange) {
        onDeviceChange(value, deviceName);
      } else {
        setInternalDevice(value);
      }
    },
    [deviceItems, onDeviceChange]
  );

  const handleDateChange = useCallback(
    (start: Date | null, end: Date | null) => {
      const newDateRange = { startDate: start, endDate: end };

      if (onDateRangeChange) {
        onDateRangeChange(newDateRange);
      } else {
        setInternalDateRange(newDateRange);
      }
    },
    [onDateRangeChange]
  );

  const handleReachEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetching && selectedBranch) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    selectedBranch,
    fetchNextPage,
  ]);

  // Prefetch logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        deviceItems.length > 0 &&
        deviceItems.length < 20 &&
        hasNextPage &&
        !isFetchingNextPage &&
        selectedBranch
      ) {
        fetchNextPage();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [deviceItems.length, hasNextPage, isFetchingNextPage, selectedBranch]);

  // Validation and submission
  const handleSubmit = useCallback(() => {
    const deviceName =
      deviceItems.find((item) => item.value === selectedDevice)?.label || null;

    const filters: FilterValues = {
      schoolId: selectedSchool,
      branchId: selectedBranch,
      deviceId: selectedDevice,
      deviceName,
      startDate: dateRange.startDate
        ? formatDateToYYYYMMDD(dateRange.startDate)
        : null,
      endDate: dateRange.endDate
        ? formatDateToYYYYMMDD(dateRange.endDate)
        : null,
    };

    // Built-in validation
    if (mergedConfig.showBranch && !filters.branchId) {
      alert("Please select a branch");
      return;
    }

    if (mergedConfig.showDevice && !filters.deviceId) {
      alert("Please select a device");
      return;
    }

    if (
      mergedConfig.showDateRange &&
      (!filters.startDate || !filters.endDate)
    ) {
      alert("Please select both start and end dates");
      return;
    }

    // Custom validation
    if (mergedConfig.customValidation) {
      const validationError = mergedConfig.customValidation(filters);
      if (validationError) {
        alert(validationError);
        return;
      }
    }

    onSubmit(filters);
  }, [
    selectedSchool,
    selectedBranch,
    selectedDevice,
    dateRange,
    deviceItems,
    mergedConfig,
    onSubmit,
  ]);

  return (
    <div className={`flex flex-wrap gap-4 justify-between ${className}`}>
      <div className="space-x-4">
        {/* School Selector */}
        {mergedConfig.showSchool && isSuperAdmin && (
          <Combobox
            items={schools}
            value={selectedSchool}
            onValueChange={handleSchoolChange}
            placeholder="Select School"
            searchPlaceholder="Search Schools..."
            emptyMessage="No schools found"
          />
        )}

        {/* Branch Selector */}
        {mergedConfig.showBranch && (
          <>
            {isSuperAdmin && (
              <Combobox
                items={branches}
                value={selectedBranch}
                onValueChange={handleBranchChange}
                placeholder="Select Branch"
                searchPlaceholder="Search Branches..."
                emptyMessage={
                  !selectedSchool
                    ? "Select a school first"
                    : "No branches found"
                }
                disabled={!selectedSchool}
              />
            )}
            {!isSuperAdmin && isSchoolRole && (
              <Combobox
                items={branches}
                value={selectedBranch}
                onValueChange={handleBranchChange}
                placeholder="Select Branch"
                searchPlaceholder="Search Branches..."
                emptyMessage="No branches found"
              />
            )}
          </>
        )}

        {/* Device Selector */}
        {mergedConfig.showDevice && (
          <Combobox
            items={deviceItems}
            value={selectedDevice}
            onValueChange={handleDeviceChange}
            placeholder="Select Vehicle"
            searchPlaceholder="Search vehicles..."
            emptyMessage={
              !selectedBranch ? "Select a branch first" : "No vehicles found"
            }
            onSearchChange={setSearch}
            searchValue={search}
            onReachEnd={handleReachEnd}
            isLoadingMore={isFetchingNextPage}
            disabled={!selectedBranch}
          />
        )}

        {/* Date Range Filter */}
        {mergedConfig.showDateRange && (
          <DateRangeFilter
            onDateRangeChange={handleDateChange}
            title={mergedConfig.dateRangeTitle}
            maxDays={mergedConfig.dateRangeMaxDays}
          />
        )}
      </div>
      {/* Submit Button */}
      {mergedConfig.showSubmitButton && (
        <Button
          onClick={handleSubmit}
          disabled={
            (mergedConfig.showBranch && !selectedBranch) ||
            (mergedConfig.showDevice && !selectedDevice) ||
            (mergedConfig.showDateRange &&
              (!dateRange.startDate || !dateRange.endDate))
          }
          className="px-6"
        >
          {mergedConfig.submitButtonText}
        </Button>
      )}
    </div>
  );
};

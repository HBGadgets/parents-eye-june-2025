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
import { FloatingMenu } from "@/components/floatingMenu";
import { useExport } from "@/hooks/useExport";

interface SchoolBranchSelectorProps {
  enforceRoleBasedSelection?: boolean;
  onFilterSubmit?: (filters: {
    schoolId: string | null;
    branchId: string | null;
    deviceId: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }) => void;
  className?: string;
  columns?: Column<any, unknown>[];
  onColumnVisibilityChange?: (visibility: any) => void;
  showColumnVisibility?: boolean;
}

const SchoolBranchSelector: React.FC<SchoolBranchSelectorProps> = ({
  enforceRoleBasedSelection = true,
  onFilterSubmit,
  className = "",
  columns = [],
  onColumnVisibilityChange,
  showColumnVisibility = false,
}) => {
  const [role, setRole] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(
    null
  );
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
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
      } else if (userRole === "school" && decoded?.schoolId) {
        setSelectedSchool(decoded.schoolId);
      } else if (userRole === "schooladmin" && decoded?.schoolId) {
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
    if (role === "school" && selectedSchool) {
      return branchData
        .filter((branch: any) => branch.schoolId?._id === selectedSchool)
        .map((branch: any) => ({
          label: branch.branchName,
          value: branch._id,
        }));
    }

    if (role !== "branch" && role !== "branchadmin" && !selectedSchool) {
      return [];
    }

    return branchData
      .filter((branch: any) => {
        if (selectedSchool) {
          return branch.schoolId?._id === selectedSchool;
        }
        return true;
      })
      .map((branch: any) => ({
        label: branch.branchName,
        value: branch._id,
      }));
  }, [branchData, role, selectedSchool]);

  const devices = useMemo(() => {
    if (!deviceData || !deviceData.devices) return [];

    if (role === "branch" && selectedBranch) {
      return deviceData.devices
        .filter((d: any) => d.branchId?._id === selectedBranch)
        .map((d: any) => ({
          label: d.name,
          value: d.deviceId,
        }));
    }

    if (role !== "branch" && (!selectedSchool || !selectedBranch)) {
      return [];
    }

    return deviceData.devices
      .filter((d: any) => {
        const matchSchool = selectedSchool ? d.schoolId?._id === selectedSchool : true;
        const matchBranch = selectedBranch ? d.branchId?._id === selectedBranch : true;
        return matchSchool && matchBranch;
      })
      .map((d: any) => ({
        label: d.name,
        value: d.deviceId,
      }));
  }, [deviceData, selectedSchool, selectedBranch, role]);

  const handleSubmit = () => {
    const filterData = {
      schoolId: selectedSchool,
      branchId: selectedBranch,
      deviceName: selectedDeviceName,
      deviceId: selectedDevice,
      startDate: dateRange.start,
      endDate: dateRange.end,
    };

    console.log("Submitted Filters:", filterData);
    onFilterSubmit?.(filterData);

    // if (role !== "branch") {
    //   setSelectedSchool(null);
    //   setSelectedBranch(null);
    // }
    // setSelectedDevice(null);
    // setDateRange({ start: null, end: null });
  };

  if (role === null) return null;

  const exportData: any[] = [];
  const columnsForExport: any[] = [];

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <div
        className={`flex flex-wrap gap-4 items-center ${className}`}
      >
        {role !== "branch" && (
          <>
            {role !== "school" && (
              <div className="min-w-[180px] max-w-[220px] flex-1">
                <SearchableDropdown
                  items={schools}
                  placeholder="Choose a school..."
                  searchPlaceholder="Search school..."
                  emptyMessage="No school found."
                  value={selectedSchool}
                  onSelect={(item) => {
                    setSelectedSchool(item.value);
                    setSelectedBranch(null);
                    setSelectedDevice(null);
                  }}
                  disabled={
                    enforceRoleBasedSelection &&
                    (role === "schooladmin" || role === "branchadmin")
                  }
                />
              </div>
            )}

            <div className="min-w-[180px] max-w-[220px] flex-1">
              <SearchableDropdown
                items={branches}
                placeholder="Choose a branch..."
                searchPlaceholder="Search branch..."
                emptyMessage={
                  !selectedSchool && role !== "branchadmin"
                    ? "Select a school first."
                    : selectedSchool
                    ? "No branch found for this school."
                    : "No branch found."
                }
                value={selectedBranch}
                onSelect={(item) => {
                  setSelectedBranch(item.value);
                  setSelectedDevice(null);
                }}
                disabled={
                  (enforceRoleBasedSelection && role === "branchadmin") ||
                  (!selectedSchool &&
                    role !== "branchadmin" &&
                    role !== "branch")
                }
              />
            </div>
          </>
        )}

        <div className="min-w-[180px] max-w-[220px] flex-1">
          <SearchableDropdown
            items={devices}
            placeholder="Choose a device..."
            searchPlaceholder="Search device..."
            emptyMessage={
              role === "branch"
                ? selectedBranch
                  ? "No devices found."
                  : "No devices available."
                : !selectedBranch
                ? "Select a branch first."
                : "No devices found."
            }
            value={selectedDevice}
            onSelect={(item) => {
              setSelectedDevice(item.value);
              setSelectedDeviceName(item.label);
            }}
            disabled={
              role === "branch"
                ? !selectedBranch
                : role !== "branch" && !selectedBranch
            }
          />
        </div>

        <div className="min-w-[200px] max-w-[260px] flex-1">
          <DateRangeFilter
            onDateRangeChange={(start, end) => setDateRange({ start, end })}
          />
        </div>

        {showColumnVisibility && columns.length > 0 && (
          <div className="min-w-[150px] max-w-[200px] flex-1">
            <ColumnVisibilitySelector
              columns={columns}
              buttonVariant="outline"
              buttonSize="default"
            />
          </div>
        )}

        <div className="min-w-[120px] max-w-[160px] flex-1">
          <Button onClick={handleSubmit} className="mt-1 w-full" disabled={loading}>
            {loading ? "Loading..." : "Show Report"}
          </Button>
        </div>

        <div className="min-w-[120px] max-w-[160px] flex-1">
          <FloatingMenu
            onExportPdf={() =>
              exportToPDF(exportData, columnsForExport, {
                title: "Export",
                companyName: "Parents Eye",
              })
            }
            onExportExcel={() =>
              exportToExcel(exportData, columnsForExport, {
                title: "Export",
                companyName: "Parents Eye",
              })
            }
          />
        </div>
      </div>
    </div>
  );
};

export default SchoolBranchSelector;

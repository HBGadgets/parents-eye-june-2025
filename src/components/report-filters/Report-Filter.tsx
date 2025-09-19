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
    deviceName: string | null;
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

  // Schools dropdown
  const schools = useMemo(() => {
    if (!schoolData) return [];
    return schoolData.map((school) => ({
      label: school.schoolName,
      value: school._id,
    }));
  }, [schoolData]);

  // Branches dropdown
  const branches = useMemo(() => {
    if (!branchData || !selectedSchool) return [];
    return branchData
      .filter((branch: any) => branch.schoolId?._id === selectedSchool)
      .map((branch: any) => ({
        label: branch.branchName,
        value: branch._id,
      }));
  }, [branchData, selectedSchool]);

  // Devices dropdown (✅ FIXED: only selected branch’s devices show)
  const devices = useMemo(() => {
    if (!deviceData || !selectedBranch) return [];

    const list = Array.isArray(deviceData)
      ? deviceData
      : deviceData.devices || [];

    return list
      .filter((d: any) => {
        if (!d.branchId) return false; // skip devices without branchId
        if (typeof d.branchId === "string") {
          return d.branchId === selectedBranch;
        }
        if (typeof d.branchId === "object" && d.branchId._id) {
          return d.branchId._id === selectedBranch;
        }
        return false;
      })
      .map((d: any) => ({
        label: d.name || d.deviceId || "Unnamed Device",
        value: d.deviceId || d._id,
      }));
  }, [deviceData, selectedBranch]);

  // Handle submit
  const handleSubmit = () => {
    const filterData = {
      schoolId: selectedSchool,
      branchId: selectedBranch,
      deviceName: selectedDeviceName,
      deviceId: selectedDevice,
      startDate: dateRange.start,
      endDate: dateRange.end,
    };
    onFilterSubmit?.(filterData);
  };

  if (role === null) return null;

  const exportData: any[] = [];
  const columnsForExport: any[] = [];

  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-4 items-center ${className}`}>
        {/* School selector */}
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

            {/* Branch selector */}
            <div className="min-w-[180px] max-w-[220px] flex-1">
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
                  setSelectedDevice(null);
                }}
                disabled={
                  !selectedSchool ||
                  (enforceRoleBasedSelection && role === "branchadmin")
                }
              />
            </div>
          </>
        )}

        {/* Device selector */}
        <div className="min-w-[180px] max-w-[220px] flex-1">
          <SearchableDropdown
            items={devices}
            placeholder="Choose a device..."
            searchPlaceholder="Search device..."
            emptyMessage={
              !selectedBranch
                ? "Select a branch first."
                : "No devices found for this branch."
            }
            value={selectedDevice}
            onSelect={(item) => {
              setSelectedDevice(item.value);
              setSelectedDeviceName(item.label);
            }}
            disabled={!selectedBranch}
          />
        </div>

        {/* Date range filter */}
        <div className="min-w-[200px] max-w-[260px] flex-1">
          <DateRangeFilter
            onDateRangeChange={(start, end) => setDateRange({ start, end })}
          />
        </div>

        {/* Column visibility */}
        {showColumnVisibility && columns.length > 0 && (
          <div className="min-w-[150px] max-w-[200px] flex-1">
            <ColumnVisibilitySelector
              columns={columns}
              buttonVariant="outline"
              buttonSize="default"
            />
          </div>
        )}

        {/* Show report button */}
        <div className="min-w-[120px] max-w-[160px] flex-1">
          <Button
            onClick={handleSubmit}
            className="mt-1 w-full"
            disabled={loading}
          >
            {loading ? "Loading..." : "Show Report"}
          </Button>
        </div>

        {/* Export menu */}
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

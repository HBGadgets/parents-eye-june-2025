"use client";

import { SearchableDropdown } from "@/components/SearcheableDropdownFilter";
import React, { useState, useMemo, useEffect } from "react";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchGroupData } from "@/hooks/useBranchGroup";
import { useDeviceData } from "@/hooks/useDeviceData";
import { Button } from "@/components/ui/button";
import DateRangeFilter from "../ui/DateRangeFilter";

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
}

const SchoolBranchSelector: React.FC<SchoolBranchSelectorProps> = ({
  enforceRoleBasedSelection = true,
  onFilterSubmit,
  className = "",
}) => {
  const [role, setRole] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const { data: schoolData } = useSchoolData();
  const { data: branchesGroup } = useBranchGroupData();
  const { data: deviceData } = useDeviceData();

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      const decoded = getDecodedToken(token);
      const userRole = decoded?.role?.toLowerCase() || null;
      setRole(userRole);

      if (userRole === "branch" && decoded?.branchId) {
        setSelectedBranch(decoded.branchId);
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

  const schools = useMemo(
    () =>
      (schoolData || []).map((s) => ({
        label: s.schoolName,
        value: s._id,
      })),
    [schoolData]
  );

  const branches = useMemo(() => {
    if (!branchesGroup || !selectedSchool) return [];
    return branchesGroup
      .filter((group) => group.schoolId?._id === selectedSchool)
      .flatMap((group) =>
        (group.AssignedBranch || []).map((branch) => ({
          label: branch.branchName,
          value: branch._id,
        }))
      );
  }, [branchesGroup, selectedSchool]);

  const devices = useMemo(() => {
    if (!deviceData || !deviceData.devices) return [];
    return deviceData.devices
      .filter((d: any) => {
        const matchSchool = selectedSchool ? d.schoolId?._id === selectedSchool : true;
        const matchBranch = selectedBranch ? d.branchId?._id === selectedBranch : true;
        return matchSchool && matchBranch;
      })
      .map((d: any) => ({
        label: d.name,
        value: d._id,
      }));
  }, [deviceData, selectedSchool, selectedBranch]);

const handleSubmit = () => {
  const filterData = {
    schoolId: selectedSchool,
    branchId: selectedBranch,
    deviceId: selectedDevice,
    startDate: dateRange.start,
    endDate: dateRange.end,
  };

  // Print the selected data and date
  console.log("Submitted Filters:", filterData);

  // Pass it to parent if needed
  onFilterSubmit?.(filterData);

  // Reset only for non-branch roles
  if (role !== "branch") {
    setSelectedSchool(null);
    setSelectedBranch(null);
  }
  setSelectedDevice(null);
  setDateRange({ start: null, end: null });
};


  if (role === null) return null;

  return (
    <div className={`flex flex-row gap-4 items-center ${className}`}>
      {role !== "branch" && (
        <>
          <div className="w-56">
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

          <div className="w-56">
            <SearchableDropdown
              items={branches}
              placeholder="Choose a branch..."
              searchPlaceholder="Search branch..."
              emptyMessage={
                selectedSchool ? "No branch found for this school." : "Select a school first."
              }
              value={selectedBranch}
              onSelect={(item) => {
                setSelectedBranch(item.value);
                setSelectedDevice(null);
              }}
              disabled={enforceRoleBasedSelection && role === "branchadmin"}
            />
          </div>
        </>
      )}

      <div className="w-56">
        <SearchableDropdown
          items={devices}
          placeholder="Choose a device..."
          searchPlaceholder="Search device..."
          emptyMessage="No devices found."
          value={selectedDevice}
          onSelect={(item) => setSelectedDevice(item.value)}
          disabled={role !== "branch" && !selectedBranch}
        />
      </div>

      <div className="w-64">
        <DateRangeFilter onDateRangeChange={(start, end) => setDateRange({ start, end })} />
      </div>

      <div>
        <Button onClick={handleSubmit} className="mt-1">
          Submit
        </Button>
      </div>
    </div>
  );
};

export default SchoolBranchSelector;

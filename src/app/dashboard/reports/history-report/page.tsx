"use client";
import { useMemo, useEffect, useState } from "react";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { useBranchData } from "@/hooks/useBranchData";
import { useDeviceData } from "@/hooks/useDeviceData";
import { useSchoolData } from "@/hooks/useSchoolData";
import { getDecodedToken } from "@/lib/jwt";
import Link from "next/link";
import Cookies from "js-cookie";
import { HistoryMap } from "@/components/history/history-map";

type UserRole = "superAdmin" | "school" | "branchGroup" | "branch" | null;

export default function HistoryReport() {
  const { data: vehicleData } = useDeviceData();
  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [userRole, setUserRole] = useState<UserRole>(null);

  useEffect(() => {
    const token = Cookies.get("token");
    const decoded = token ? getDecodedToken(token) : null;
    const role = decoded?.role;
    if (
      typeof role === "string" &&
      ["superAdmin", "school", "branchGroup", "branch"].includes(role)
    ) {
      setUserRole(role as UserRole);
    }
  }, []);

  const schoolMetaData = useMemo(
    () =>
      Array.isArray(schoolData)
        ? schoolData.map((school) => ({
            value: school._id,
            label: school.schoolName,
          }))
        : [],
    [schoolData]
  );

  const branchMetaData = useMemo(() => {
    if (!Array.isArray(branchData)) return [];
    return branchData
      .filter((branch) =>
        userRole === "superAdmin"
          ? branch?.schoolId?._id === selectedSchool
          : true
      )
      .map((branch) => ({
        value: branch._id,
        label: branch.branchName,
      }));
  }, [branchData, userRole, selectedSchool]);

  const vehicleMetaData = useMemo(() => {
    if (!Array.isArray(vehicleData)) return [];
    return vehicleData
      .filter((vehicle) =>
        userRole === "superAdmin" || userRole === "school"
          ? vehicle?.branchId?._id === selectedBranch
          : true
      )
      .map((vehicle) => ({
        value: vehicle._id,
        label: vehicle.name,
      }));
  }, [vehicleData, userRole, selectedBranch]);

  // Memoize date handler if needed, otherwise define inline as the intent is simple
  const handleDateFilter = useMemo(
    () => (startDate: Date | null, endDate: Date | null) => {
      console.log("Selected Date Range:", startDate, endDate);
      // Implement filtering logic based on selected date range
    },
    []
  );

  return (
    <>
      <section>
        {/* Filters */}
        <header className="flex flex-col">
          <div className="flex gap-4">
            {userRole === "superAdmin" && (
              <>
                <Combobox
                  items={schoolMetaData}
                  value={selectedSchool}
                  onValueChange={setSelectedSchool}
                  placeholder="Select School"
                  emptyMessage="No schools found"
                  width="w-[300px]"
                />
                <Combobox
                  items={branchMetaData}
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                  placeholder="Select Branch"
                  emptyMessage="No branches found"
                  width="w-[300px]"
                />
              </>
            )}

            {userRole === "school" && (
              <>
                <Combobox
                  items={branchMetaData}
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                  placeholder="Select Branch"
                  emptyMessage="No branches found"
                  width="w-[300px]"
                />
              </>
            )}

            <Combobox
              items={vehicleMetaData}
              value={selectedVehicle}
              onValueChange={setSelectedVehicle}
              placeholder="Select Vehicle"
              emptyMessage="No vehicles found"
              width="w-[300px]"
            />

            <DateRangeFilter
              onDateRangeChange={handleDateFilter}
              title="Search by Request Date"
            />
          </div>
        </header>
        {/* <div>
          <Link href="/dashboard" className="ml-auto">
            <button className="bg-red-800 hover:bg-red-900 text-white font-semibold py-2 px-4 cursor-pointer rounded">
              Back to Dasboard
            </button>
          </Link>
        </div> */}
        <section>
          <HistoryMap />
        </section>
      </section>
    </>
  );
}

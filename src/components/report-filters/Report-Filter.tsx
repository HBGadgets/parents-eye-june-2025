// components/filters/ReportFilter.tsx
"use client";
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Combobox } from "@/components/ui/combobox";
import {
  useSchoolDropdown,
  useBranchDropdown,
  useDeviceDropdownWithUniqueId,
} from "@/hooks/useDropdown";
import DateRangeFilter from "../ui/DateRangeFilter";
import { formatDateToYYYYMMDD } from "@/util/formatDate";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, GitBranch, Car, Calendar, Filter } from "lucide-react";
import { ColumnVisibilitySelector } from "../column-visibility-selector";

export interface FilterValues {
  schoolId: string | string[] | null;
  branchId: string | string[] | null;
  deviceId: string | string[] | null;
  deviceName: string | string[] | null;
  from: string | null;
  to: string | null;
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
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
  customValidation?: (filters: FilterValues) => string | null;
  cardTitle?: string;
  cardDescription?: string;
  table?: any;
  showColumnVisibility?: boolean;

  // Multi-select options
  multiSelectSchool?: boolean;
  multiSelectBranch?: boolean;
  multiSelectDevice?: boolean;
  showBadges?: boolean;
  maxBadges?: number;

  // Array formatting option
  arrayFormat?: "comma" | "array" | "repeat";
  arraySeparator?: string;
}

interface ReportFilterProps {
  onSubmit: (filters: FilterValues) => void;
  config?: ReportFilterConfig;
  className?: string;
  initialValues?: Partial<FilterValues>;

  // Single select props
  selectedSchool?: string | null;
  onSchoolChange?: (schoolId: string | null) => void;

  selectedBranch?: string | null;
  onBranchChange?: (branchId: string | null) => void;

  selectedDevice?: string | null;
  onDeviceChange?: (deviceId: string | null, deviceName: string | null) => void;

  // Multi-select props
  selectedSchools?: string[];
  onSchoolsChange?: (schoolIds: string[]) => void;

  selectedBranches?: string[];
  onBranchesChange?: (branchIds: string[]) => void;

  selectedDevices?: string[];
  onDevicesChange?: (deviceIds: string[], deviceNames: string[]) => void;

  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange) => void;

  table?: any;
}

type DecodedToken = {
  role: string;
  schoolId?: string;
  id?: string;
  branchId?: string;
};

const defaultConfig: ReportFilterConfig = {
  showSchool: true,
  showBranch: true,
  showDevice: true,
  showDateRange: true,
  showSubmitButton: true,
  submitButtonText: "Generate Report",
  dateRangeTitle: "Select Date Range",
  cardTitle: "Report Filters",
  cardDescription: "Configure filters to generate your custom report",
  showColumnVisibility: true,
  multiSelectSchool: false,
  multiSelectBranch: false,
  multiSelectDevice: false,
  showBadges: true,
  maxBadges: 2,
  arrayFormat: "comma",
  arraySeparator: ",",
};

export const ReportFilter: React.FC<ReportFilterProps> = ({
  onSubmit,
  config = {},
  className = "",
  initialValues = {},

  // Single select
  selectedSchool: controlledSchool,
  onSchoolChange,

  selectedBranch: controlledBranch,
  onBranchChange,

  selectedDevice: controlledDevice,
  onDeviceChange,

  // Multi-select
  selectedSchools: controlledSchools,
  onSchoolsChange,

  selectedBranches: controlledBranches,
  onBranchesChange,

  selectedDevices: controlledDevices,
  onDevicesChange,

  dateRange: controlledDateRange,
  onDateRangeChange,

  table,
}) => {
  const mergedConfig = { ...defaultConfig, ...config };

  // ---------------- Auth & Role ----------------
  const [decodedToken, setDecodedToken] = useState<DecodedToken>({ role: "" });
  const role = decodedToken.role || "";

  // ---------------- Single Select State ----------------
  const [internalSchool, setInternalSchool] = useState<string | undefined>(
    typeof initialValues.schoolId === "string"
      ? initialValues.schoolId
      : undefined
  );
  const [internalBranch, setInternalBranch] = useState<string | undefined>(
    typeof initialValues.branchId === "string"
      ? initialValues.branchId
      : undefined
  );
  const [internalDevice, setInternalDevice] = useState<string | undefined>(
    typeof initialValues.deviceId === "string"
      ? initialValues.deviceId
      : undefined
  );

  // ---------------- Multi-Select State ----------------
  const [internalSchools, setInternalSchools] = useState<string[]>(
    Array.isArray(initialValues.schoolId) ? initialValues.schoolId : []
  );
  const [internalBranches, setInternalBranches] = useState<string[]>(
    Array.isArray(initialValues.branchId) ? initialValues.branchId : []
  );
  const [internalDevices, setInternalDevices] = useState<string[]>(
    Array.isArray(initialValues.deviceId) ? initialValues.deviceId : []
  );

  const [internalDateRange, setInternalDateRange] = useState<DateRange>({
    from: null,
    to: null,
  });

  // ---------------- Refs to prevent infinite loops ----------------
  const prevSchoolRef = useRef<string | undefined>();
  const prevSchoolsLengthRef = useRef<number>(0);
  const prevBranchRef = useRef<string | undefined>();
  const prevBranchesLengthRef = useRef<number>(0);

  // ⭐ NEW: Ref to store latest deviceItems without causing callback recreation
  const deviceItemsRef = useRef<Array<{ label: string; value: string }>>([]);

  // Determine active values based on mode
  const selectedSchool = mergedConfig.multiSelectSchool
    ? undefined
    : controlledSchool !== undefined
    ? controlledSchool
    : internalSchool;

  const selectedSchools = mergedConfig.multiSelectSchool
    ? controlledSchools !== undefined
      ? controlledSchools
      : internalSchools
    : [];

  const selectedBranch = mergedConfig.multiSelectBranch
    ? undefined
    : controlledBranch !== undefined
    ? controlledBranch
    : internalBranch;

  const selectedBranches = mergedConfig.multiSelectBranch
    ? controlledBranches !== undefined
      ? controlledBranches
      : internalBranches
    : [];

  const selectedDevice = mergedConfig.multiSelectDevice
    ? undefined
    : controlledDevice !== undefined
    ? controlledDevice
    : internalDevice;

  const selectedDevices = mergedConfig.multiSelectDevice
    ? controlledDevices !== undefined
      ? controlledDevices
      : internalDevices
    : [];

  const dateRange = controlledDateRange || internalDateRange;

  // ---------------- Combobox Open States ----------------
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);

  // ---------------- Lazy Loading States ----------------
  const [shouldFetchSchools, setShouldFetchSchools] = useState(false);
  const [shouldFetchBranches, setShouldFetchBranches] = useState(false);
  const [shouldFetchDevices, setShouldFetchDevices] = useState(false);

  // ---------------- Decode Token ----------------
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setDecodedToken(decoded);
    } catch (err) {
      console.error("Token decode failed", err);
    }
  }, []);

  // ---------------- Role-based Defaults ----------------
  const tokenSchoolId = useMemo(
    () => (role === "school" ? decodedToken.id : decodedToken.schoolId),
    [role, decodedToken.id, decodedToken.schoolId]
  );

  const tokenBranchId = useMemo(
    () => (role === "branch" ? decodedToken.id : undefined),
    [role, decodedToken.id]
  );

  // ---------------- Apply Role Filters & Auto-fetch ----------------
  useEffect(() => {
    if (
      role === "school" &&
      tokenSchoolId &&
      !controlledSchool &&
      !mergedConfig.multiSelectSchool
    ) {
      setInternalSchool(tokenSchoolId);
      setShouldFetchBranches(true);
    }
    if (
      role === "branch" &&
      tokenBranchId &&
      !controlledBranch &&
      !mergedConfig.multiSelectBranch
    ) {
      setInternalBranch(tokenBranchId);
      setShouldFetchDevices(true);
    }
    if (role === "branchGroup") {
      setShouldFetchBranches(true);
    }
  }, [
    role,
    tokenSchoolId,
    tokenBranchId,
    controlledSchool,
    controlledBranch,
    mergedConfig.multiSelectSchool,
    mergedConfig.multiSelectBranch,
  ]);

  // ---------------- Reset Dependent Filters ----------------
  useEffect(() => {
    if (role !== "superAdmin") return;

    const hasSchoolSelection = mergedConfig.multiSelectSchool
      ? selectedSchools.length > 0
      : !!selectedSchool;

    const schoolChanged = mergedConfig.multiSelectSchool
      ? prevSchoolsLengthRef.current !== selectedSchools.length
      : prevSchoolRef.current !== selectedSchool;

    if (!hasSchoolSelection && schoolChanged) {
      if (mergedConfig.multiSelectBranch) {
        if (controlledBranches === undefined) setInternalBranches([]);
      } else {
        if (controlledBranch === undefined) setInternalBranch(undefined);
      }
      setShouldFetchBranches(false);
    }

    prevSchoolRef.current = selectedSchool;
    prevSchoolsLengthRef.current = selectedSchools.length;
  }, [
    selectedSchool,
    selectedSchools.length,
    role,
    mergedConfig.multiSelectSchool,
    mergedConfig.multiSelectBranch,
    controlledBranch,
    controlledBranches,
  ]);

  useEffect(() => {
    if (role === "branch") return;

    const hasBranchSelection = mergedConfig.multiSelectBranch
      ? selectedBranches.length > 0
      : !!selectedBranch;

    const branchChanged = mergedConfig.multiSelectBranch
      ? prevBranchesLengthRef.current !== selectedBranches.length
      : prevBranchRef.current !== selectedBranch;

    if (!hasBranchSelection && branchChanged) {
      if (mergedConfig.multiSelectDevice) {
        if (controlledDevices === undefined) setInternalDevices([]);
      } else {
        if (controlledDevice === undefined) setInternalDevice(undefined);
      }
      setShouldFetchDevices(false);
    }

    prevBranchRef.current = selectedBranch;
    prevBranchesLengthRef.current = selectedBranches.length;
  }, [
    selectedBranch,
    selectedBranches.length,
    role,
    mergedConfig.multiSelectBranch,
    mergedConfig.multiSelectDevice,
    controlledDevice,
    controlledDevices,
  ]);

  // ---------------- Lazy Dropdown Queries ----------------
  const { data: schools = [], isLoading: schoolsLoading } =
    useSchoolDropdown(shouldFetchSchools);

  const { data: branches = [], isLoading: branchesLoading } = useBranchDropdown(
    selectedSchool,
    shouldFetchBranches,
    role === "branchGroup"
  );

  const { data: devices = [], isLoading: devicesLoading } =
    useDeviceDropdownWithUniqueId(selectedBranch, shouldFetchDevices);

  // ---------------- Dropdown Items ----------------
  const schoolItems = useMemo(
    () =>
      schools.map((s) => ({
        label: s.schoolName!,
        value: s._id,
      })),
    [schools]
  );

  const branchItems = useMemo(
    () =>
      branches.map((b) => ({
        label: b.branchName!,
        value: b._id,
      })),
    [branches]
  );

  const deviceItems = useMemo(
    () =>
      devices.map((d) => ({
        label: d.name!,
        value: d.uniqueId,
      })),
    [devices]
  );

  // ⭐ NEW: Update deviceItemsRef whenever deviceItems changes
  useEffect(() => {
    deviceItemsRef.current = deviceItems;
  }, [deviceItems]);

  // ---------------- Change Handlers ----------------
  const handleSchoolChange = useCallback(
    (value?: string) => {
      if (onSchoolChange) {
        onSchoolChange(value || null);
      } else {
        setInternalSchool(value);
      }

      if (mergedConfig.multiSelectBranch) {
        if (onBranchesChange) onBranchesChange([]);
        else setInternalBranches([]);
      } else {
        if (onBranchChange) onBranchChange(null);
        else setInternalBranch(undefined);
      }

      if (mergedConfig.multiSelectDevice) {
        if (onDevicesChange) onDevicesChange([], []);
        else setInternalDevices([]);
      } else {
        if (onDeviceChange) onDeviceChange(null, null);
        else setInternalDevice(undefined);
      }

      if (value) {
        setShouldFetchBranches(true);
      }
    },
    [
      onSchoolChange,
      onBranchChange,
      onBranchesChange,
      onDeviceChange,
      onDevicesChange,
      mergedConfig.multiSelectBranch,
      mergedConfig.multiSelectDevice,
    ]
  );

  const handleSchoolsChange = useCallback(
    (values: string[]) => {
      if (onSchoolsChange) {
        onSchoolsChange(values);
      } else {
        setInternalSchools(values);
      }

      if (mergedConfig.multiSelectBranch) {
        if (onBranchesChange) onBranchesChange([]);
        else setInternalBranches([]);
      } else {
        if (onBranchChange) onBranchChange(null);
        else setInternalBranch(undefined);
      }

      if (mergedConfig.multiSelectDevice) {
        if (onDevicesChange) onDevicesChange([], []);
        else setInternalDevices([]);
      } else {
        if (onDeviceChange) onDeviceChange(null, null);
        else setInternalDevice(undefined);
      }

      if (values.length > 0) {
        setShouldFetchBranches(true);
      }
    },
    [
      onSchoolsChange,
      onBranchChange,
      onBranchesChange,
      onDeviceChange,
      onDevicesChange,
      mergedConfig.multiSelectBranch,
      mergedConfig.multiSelectDevice,
    ]
  );

  const handleBranchChange = useCallback(
    (value?: string) => {
      if (onBranchChange) {
        onBranchChange(value || null);
      } else {
        setInternalBranch(value);
      }

      if (mergedConfig.multiSelectDevice) {
        if (onDevicesChange) onDevicesChange([], []);
        else setInternalDevices([]);
      } else {
        if (onDeviceChange) onDeviceChange(null, null);
        else setInternalDevice(undefined);
      }

      if (value) {
        setShouldFetchDevices(true);
      }
    },
    [
      onBranchChange,
      onDeviceChange,
      onDevicesChange,
      mergedConfig.multiSelectDevice,
    ]
  );

  const handleBranchesChange = useCallback(
    (values: string[]) => {
      if (onBranchesChange) {
        onBranchesChange(values);
      } else {
        setInternalBranches(values);
      }

      if (mergedConfig.multiSelectDevice) {
        if (onDevicesChange) onDevicesChange([], []);
        else setInternalDevices([]);
      } else {
        if (onDeviceChange) onDeviceChange(null, null);
        else setInternalDevice(undefined);
      }

      if (values.length > 0) {
        setShouldFetchDevices(true);
      }
    },
    [
      onBranchesChange,
      onDeviceChange,
      onDevicesChange,
      mergedConfig.multiSelectDevice,
    ]
  );

  const handleDeviceChange = useCallback(
    (value?: string) => {
      const deviceName =
        deviceItems.find((item) => item.value === value)?.label || null;

      if (onDeviceChange) {
        onDeviceChange(value || null, deviceName);
      } else {
        setInternalDevice(value);
      }
    },
    [deviceItems, onDeviceChange]
  );

  const handleDevicesChange = useCallback(
    (values: string[]) => {
      const deviceNames = values
        .map((val) => deviceItems.find((item) => item.value === val)?.label)
        .filter(Boolean) as string[];

      if (onDevicesChange) {
        onDevicesChange(values, deviceNames);
      } else {
        setInternalDevices(values);
      }
    },
    [deviceItems, onDevicesChange]
  );

  const handleDateChange = useCallback(
    (start: Date | null, end: Date | null) => {
      const newDateRange = { from: start, to: end };

      if (onDateRangeChange) {
        onDateRangeChange(newDateRange);
      } else {
        setInternalDateRange(newDateRange);
      }
    },
    [onDateRangeChange]
  );

  // ---------------- Helper: Format Array Values ----------------
  const formatArrayValue = useCallback(
    (values: string[]): string | string[] => {
      if (values.length === 0) return [];

      switch (mergedConfig.arrayFormat) {
        case "comma":
          return values.join(mergedConfig.arraySeparator || ",");
        case "array":
          return values;
        case "repeat":
          return values;
        default:
          return values.join(mergedConfig.arraySeparator || ",");
      }
    },
    [mergedConfig.arrayFormat, mergedConfig.arraySeparator]
  );

  // ---------------- Validation ----------------
  const isValid = useMemo(() => {
    if (mergedConfig.showSchool && role === "superAdmin") {
      if (mergedConfig.multiSelectSchool) {
        if (selectedSchools.length === 0) return false;
      } else {
        if (!selectedSchool) return false;
      }
    }

    if (
      mergedConfig.showBranch &&
      (role === "superAdmin" || role === "school" || role === "branchGroup")
    ) {
      if (mergedConfig.multiSelectBranch) {
        if (selectedBranches.length === 0) return false;
      } else {
        if (!selectedBranch) return false;
      }
    }

    if (mergedConfig.showDevice) {
      if (mergedConfig.multiSelectDevice) {
        if (selectedDevices.length === 0) return false;
      } else {
        if (!selectedDevice) return false;
      }
    }

    if (mergedConfig.showDateRange && (!dateRange.from || !dateRange.to)) {
      return false;
    }

    return true;
  }, [
    mergedConfig.showSchool,
    mergedConfig.showBranch,
    mergedConfig.showDevice,
    mergedConfig.showDateRange,
    mergedConfig.multiSelectSchool,
    mergedConfig.multiSelectBranch,
    mergedConfig.multiSelectDevice,
    role,
    selectedSchool,
    selectedSchools.length,
    selectedBranch,
    selectedBranches.length,
    selectedDevice,
    selectedDevices.length,
    dateRange.from,
    dateRange.to,
  ]);

  // ⭐ FIXED: Submit Handler - Now uses deviceItemsRef
  const handleSubmit = useCallback(() => {
    let deviceIdValue: string | string[] | null = null;
    let deviceNameValue: string | string[] | null = null;

    // Use ref instead of deviceItems directly
    if (mergedConfig.multiSelectDevice) {
      deviceIdValue = formatArrayValue(selectedDevices);
      const deviceNames = selectedDevices
        .map(
          (val) =>
            deviceItemsRef.current.find((item) => item.value === val)?.label
        )
        .filter(Boolean) as string[];
      deviceNameValue = formatArrayValue(deviceNames);
    } else {
      deviceIdValue = selectedDevice || null;
      deviceNameValue =
        deviceItemsRef.current.find((item) => item.value === selectedDevice)
          ?.label || null;
    }

    const filters: FilterValues = {
      schoolId: mergedConfig.multiSelectSchool
        ? formatArrayValue(selectedSchools)
        : selectedSchool || null,
      branchId: mergedConfig.multiSelectBranch
        ? formatArrayValue(selectedBranches)
        : selectedBranch || null,
      deviceId: deviceIdValue,
      deviceName: deviceNameValue,
      from: dateRange.from ? formatDateToYYYYMMDD(dateRange.from) : null,
      to: dateRange.to ? formatDateToYYYYMMDD(dateRange.to) : null,
    };

    // Validation alerts
    if (mergedConfig.showSchool && role === "superAdmin") {
      if (mergedConfig.multiSelectSchool) {
        if (selectedSchools.length === 0) {
          alert("Please select at least one school");
          return;
        }
      } else {
        if (!filters.schoolId) {
          alert("Please select a school");
          return;
        }
      }
    }

    if (mergedConfig.showBranch) {
      if (mergedConfig.multiSelectBranch) {
        if (selectedBranches.length === 0) {
          alert("Please select at least one branch");
          return;
        }
      } else {
        if (!filters.branchId) {
          alert("Please select a branch");
          return;
        }
      }
    }

    if (mergedConfig.showDevice) {
      if (mergedConfig.multiSelectDevice) {
        if (selectedDevices.length === 0) {
          alert("Please select at least one vehicle");
          return;
        }
      } else {
        if (!filters.deviceId) {
          alert("Please select a vehicle");
          return;
        }
      }
    }

    if (mergedConfig.showDateRange && (!filters.from || !filters.to)) {
      alert("Please select both start and end dates");
      return;
    }

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
    selectedSchools,
    selectedBranch,
    selectedBranches,
    selectedDevice,
    selectedDevices,
    dateRange.from,
    dateRange.to,
    role,
    mergedConfig.multiSelectSchool,
    mergedConfig.multiSelectBranch,
    mergedConfig.multiSelectDevice,
    mergedConfig.showSchool,
    mergedConfig.showBranch,
    mergedConfig.showDevice,
    mergedConfig.showDateRange,
    mergedConfig.customValidation,
    onSubmit,
    formatArrayValue,
  ]); // deviceItems removed from dependencies

  return (
    <Card className={`w-full shadow-sm ${className}`}>
      <CardHeader className="space-y-1 pb-4">
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Filter className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">
                {mergedConfig.cardTitle}
              </CardTitle>
            </div>
          </div>
          <div>
            {table && mergedConfig.showColumnVisibility && (
              <ColumnVisibilitySelector
                columns={table.getAllColumns()}
                buttonVariant="outline"
                buttonSize="default"
                className="cursor-pointer"
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* School Selector */}
          {mergedConfig.showSchool && role === "superAdmin" && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                School{mergedConfig.multiSelectSchool && "s"}
              </label>
              <Combobox
                items={schoolItems}
                multiple={mergedConfig.multiSelectSchool}
                value={selectedSchool}
                onValueChange={handleSchoolChange}
                selectedValues={selectedSchools}
                onSelectedValuesChange={handleSchoolsChange}
                placeholder={
                  mergedConfig.multiSelectSchool
                    ? "Select Schools"
                    : "Select School"
                }
                searchPlaceholder="Search Schools..."
                className="cursor-pointer"
                showBadges={mergedConfig.showBadges}
                maxBadges={mergedConfig.maxBadges}
                emptyMessage={
                  schoolsLoading ? "Loading schools..." : "No schools found"
                }
                open={schoolOpen}
                onOpenChange={(open) => {
                  setSchoolOpen(open);
                  if (open) {
                    setShouldFetchSchools(true);
                  }
                }}
              />
            </div>
          )}

          {/* Branch Selector */}
          {mergedConfig.showBranch &&
            (role === "superAdmin" ||
              role === "school" ||
              role === "branchGroup") && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  Branch{mergedConfig.multiSelectBranch && "es"}
                </label>
                <Combobox
                  items={branchItems}
                  multiple={mergedConfig.multiSelectBranch}
                  value={selectedBranch}
                  onValueChange={handleBranchChange}
                  selectedValues={selectedBranches}
                  onSelectedValuesChange={handleBranchesChange}
                  placeholder={
                    role === "superAdmin" &&
                    !selectedSchool &&
                    selectedSchools.length === 0
                      ? "Select school first"
                      : mergedConfig.multiSelectBranch
                      ? "Select Branches"
                      : "Select Branch"
                  }
                  searchPlaceholder="Search Branches..."
                  className="cursor-pointer"
                  showBadges={mergedConfig.showBadges}
                  maxBadges={mergedConfig.maxBadges}
                  emptyMessage={
                    branchesLoading
                      ? "Loading branches..."
                      : "No branches found"
                  }
                  disabled={
                    role === "superAdmin" &&
                    !selectedSchool &&
                    selectedSchools.length === 0
                  }
                  open={branchOpen}
                  onOpenChange={(open) => {
                    setBranchOpen(open);
                    if (open && role !== "school") {
                      setShouldFetchBranches(true);
                    }
                  }}
                />
              </div>
            )}

          {/* Device Selector */}
          {mergedConfig.showDevice && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                Vehicle{mergedConfig.multiSelectDevice && "s"}
              </label>
              <Combobox
                items={deviceItems}
                multiple={mergedConfig.multiSelectDevice}
                value={selectedDevice}
                onValueChange={handleDeviceChange}
                selectedValues={selectedDevices}
                onSelectedValuesChange={handleDevicesChange}
                placeholder={
                  selectedBranch ||
                  selectedBranches.length > 0 ||
                  role === "branch"
                    ? mergedConfig.multiSelectDevice
                      ? "Select Vehicles"
                      : "Select Vehicle"
                    : "Select branch first"
                }
                searchPlaceholder="Search vehicles..."
                className="cursor-pointer"
                showBadges={mergedConfig.showBadges}
                maxBadges={mergedConfig.maxBadges}
                emptyMessage={
                  devicesLoading ? "Loading vehicles..." : "No vehicles found"
                }
                disabled={
                  role !== "branch" &&
                  !selectedBranch &&
                  selectedBranches.length === 0
                }
                open={deviceOpen}
                onOpenChange={(open) => {
                  setDeviceOpen(open);
                  if (
                    open &&
                    (selectedBranch ||
                      selectedBranches.length > 0 ||
                      role === "branch")
                  ) {
                    setShouldFetchDevices(true);
                  }
                }}
              />
            </div>
          )}

          {/* Date Range Filter */}
          {mergedConfig.showDateRange && (
            <div className="space-y-2 cursor-pointer">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground cursor-pointer" />
                {mergedConfig.dateRangeTitle || "Date Range"}
              </label>
              <DateRangeFilter
                onDateRangeChange={handleDateChange}
                maxDays={mergedConfig.dateRangeMaxDays}
              />
            </div>
          )}

          {/* Submit Button */}
          {mergedConfig.showSubmitButton && (
            <Button
              onClick={handleSubmit}
              disabled={!isValid}
              className="px-6 cursor-pointer mt-6"
              size="lg"
            >
              {mergedConfig.submitButtonText}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportFilter;

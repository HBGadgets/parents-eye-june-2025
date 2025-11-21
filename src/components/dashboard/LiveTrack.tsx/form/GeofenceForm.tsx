import { Combobox } from "@/components/ui/combobox";
import { useBranchData } from "@/hooks/useBranchData";
import { useInfiniteRouteData } from "@/hooks/useInfiniteRouteData";
import { useSchoolData } from "@/hooks/useSchoolData";
import React, { useState, useCallback, useMemo, memo, useEffect } from "react";

// Type definitions
export type UserRole = "admin" | "user" | "superAdmin" | "school" | "branch";

export interface GeofenceFormData {
  geofenceName: string;
  pickupTime: string;
  dropTime: string;
}

export interface GeofencePayload extends GeofenceFormData {
  area: {
    center: [number, number];
    radius: number;
  };
  schoolId?: string;
  branchId?: string;
  routeObjId: string;
}

interface GeofenceFormProps {
  center: [number, number];
  radius: number;
  onSubmit: (data: GeofencePayload) => void;
  onCancel: () => void;
  schoolId?: string;
  branchId?: string;
  routeObjId?: string;
  role: UserRole;
  className?: string;
  isLoading?: boolean;
}

// Utility function to convert 24-hour format to 12-hour AM/PM format
const convertTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":").map(Number);

  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight
  const hoursFormatted = hours12 < 10 ? `0${hours12}` : hours12;

  const minutesFormatted = minutes < 10 ? `0${minutes}` : minutes;

  return `${hoursFormatted}:${minutesFormatted} ${period}`;
};

const GeofenceFormComponent: React.FC<GeofenceFormProps> = memo(
  ({
    center,
    radius,
    onSubmit,
    onCancel,
    schoolId = "",
    branchId = "",
    routeObjId = "",
    role,
    className = "",
    isLoading = false,
  }) => {
    const [formData, setFormData] = useState<GeofenceFormData>({
      geofenceName: "",
      pickupTime: "",
      dropTime: "",
    });
    const [selectedSchool, setSelectedSchool] = useState(schoolId);
    const [selectedBranch, setSelectedBranch] = useState(branchId);
    const [selectedRoute, setSelectedRoute] = useState(routeObjId);
    const [routeSearchTerm, setRouteSearchTerm] = useState("");

    const { data: allSchoolData } = useSchoolData({
      enabled: role === "superAdmin",
    });
    const { data: allBranchData } = useBranchData();

    const {
      data: routeInfiniteData,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading: isLoadingRoutes,
    } = useInfiniteRouteData({
      schoolId: selectedSchool,
      branchId: selectedBranch,
      search: routeSearchTerm,
      limit: 20,
      role,
    });

    const convertTo12Hour = (time24: string): string => {
      const [hours, minutes] = time24.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const hours12 = hours % 12 || 12;
      const hoursFormatted = hours12 < 10 ? `0${hours12}` : hours12;
      const minutesFormatted = minutes < 10 ? `0${minutes}` : minutes;
      return `${hoursFormatted}:${minutesFormatted} ${period}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      const payload = {
        geofenceName: formData.geofenceName,
        pickupTime: convertTo12Hour(formData.pickupTime),
        dropTime: convertTo12Hour(formData.dropTime),
        schoolId: selectedSchool,
        branchId: selectedBranch,
        routeObjId: selectedRoute,
      };

      onSubmit(payload);
    };

    const handleInputChange = useCallback(
      (field: keyof GeofenceFormData) => (value: string) => {
        setFormData((prev) => ({
          ...prev,
          [field]: value,
        }));
      },
      []
    );

    const handleGeofenceNameChange = useMemo(
      () => handleInputChange("geofenceName"),
      [handleInputChange]
    );
    const handlePickupTimeChange = useMemo(
      () => handleInputChange("pickupTime"),
      [handleInputChange]
    );
    const handleDropTimeChange = useMemo(
      () => handleInputChange("dropTime"),
      [handleInputChange]
    );

    const schoolMetaData = useMemo(() => {
      if (!Array.isArray(allSchoolData)) return [];
      return allSchoolData.map((school) => ({
        value: school._id.toString(),
        label: school.schoolName,
      }));
    }, [allSchoolData]);

    const branchMetaData = useMemo(() => {
      if (!Array.isArray(allBranchData)) return [];

      if (role === "superAdmin" && selectedSchool) {
        return allBranchData
          .filter((branch) => branch.schoolId._id === selectedSchool)
          .map((branch) => ({
            value: branch._id.toString(),
            label: branch.branchName,
          }));
      }

      return allBranchData.map((branch) => ({
        value: branch._id.toString(),
        label: branch.branchName,
      }));
    }, [allBranchData, selectedSchool, role]);

    const routeMetaData = useMemo(() => {
      if (!routeInfiniteData?.pages) return [];

      return routeInfiniteData.pages.flatMap((page) =>
        page.data.map((route) => ({
          value: route._id.toString(),
          label: route.routeNumber,
        }))
      );
    }, [routeInfiniteData]);

    const handleSchoolChange = useCallback((value: string) => {
      setSelectedSchool(value);
      setSelectedBranch("");
      setSelectedRoute("");
    }, []);

    const handleBranchChange = useCallback((value: string) => {
      setSelectedBranch(value);
      setSelectedRoute("");
    }, []);

    const handleRouteChange = useCallback((value: string) => {
      setSelectedRoute(value);
    }, []);

    const handleRouteReachEnd = useCallback(() => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleRouteSearchChange = useCallback((search: string) => {
      setRouteSearchTerm(search);
    }, []);

    const { isRouteDisabled, routeEmptyMessage } = useMemo(() => {
      if (role === "superAdmin") {
        if (!selectedSchool || !selectedBranch) {
          return {
            isRouteDisabled: true,
            routeEmptyMessage: "Please select school and branch first",
          };
        }
      } else if (role === "school") {
        if (!selectedBranch) {
          return {
            isRouteDisabled: true,
            routeEmptyMessage: "Please select branch first",
          };
        }
      }
      return {
        isRouteDisabled: isLoadingRoutes,
        routeEmptyMessage: "No routes found",
      };
    }, [role, selectedSchool, selectedBranch, isLoadingRoutes]);

    useEffect(() => {
      console.log("[Selected School]: ", selectedSchool);
    }, [selectedSchool]);

    useEffect(() => {
      console.log("[Selected Branch]: ", selectedBranch);
      console.log("[Routes Count]: ", routeMetaData.length);
    }, [selectedBranch, routeMetaData.length]);

    return (
      <div
        className={`absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-sm ${className}`}
        style={{ zIndex: 1000 }}
      >
        <h3 className="text-lg font-semibold mb-3">Create Geofence</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormInput
            label="Geofence Name"
            type="text"
            value={formData.geofenceName}
            onChange={handleGeofenceNameChange}
            placeholder="e.g., Zone A"
            required
            disabled={isLoading}
          />
          {/* 
          <div className="space-y-1">
            {role === "superAdmin" && (
              <Combobox
                items={schoolMetaData}
                value={selectedSchool}
                onValueChange={handleSchoolChange}
                placeholder="Select School"
                searchPlaceholder="Search school..."
                emptyMessage="No schools found"
                width="w-full"
                infiniteScroll={false}
              />
            )}

            {(role === "superAdmin" || role === "school") && (
              <Combobox
                items={
                  role === "superAdmin"
                    ? selectedSchool
                      ? branchMetaData
                      : []
                    : branchMetaData
                }
                value={selectedBranch}
                onValueChange={handleBranchChange}
                placeholder="Select Branch"
                searchPlaceholder="Search Branch..."
                emptyMessage={
                  role === "superAdmin" && !selectedSchool
                    ? "Please select a school first"
                    : "No branch found"
                }
                width="w-full"
                infiniteScroll={false}
                disabled={role === "superAdmin" && !selectedSchool}
              />
            )}

            <Combobox
              items={routeMetaData}
              value={selectedRoute}
              onValueChange={handleRouteChange}
              placeholder="Select Route"
              searchPlaceholder="Search route..."
              emptyMessage={routeEmptyMessage}
              width="w-full"
              infiniteScroll={true}
              onReachEnd={handleRouteReachEnd}
              isLoadingMore={isFetchingNextPage}
              searchValue={routeSearchTerm}
              onSearchChange={handleRouteSearchChange}
              disabled={isRouteDisabled}
            />
          </div> */}

          <FormInput
            label="Pickup Time"
            type="time"
            value={formData.pickupTime}
            onChange={handlePickupTimeChange}
            required
            disabled={isLoading}
          />

          <FormInput
            label="Drop Time"
            type="time"
            value={formData.dropTime}
            onChange={handleDropTimeChange}
            required
            disabled={isLoading}
          />

          <GeofenceDetails center={center} radius={radius} />
          <FormActions isLoading={isLoading} onCancel={onCancel} />
        </form>
      </div>
    );
  }
);

export const GeofenceForm = memo(GeofenceFormComponent);
GeofenceForm.displayName = "GeofenceForm";

// FormInput Component (unchanged)
interface FormInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const FormInput: React.FC<FormInputProps> = memo(
  ({
    label,
    type,
    value,
    onChange,
    placeholder = "",
    required = false,
    disabled = false,
  }) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
      },
      [onChange]
    );

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type={type}
          required={required}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          placeholder={placeholder}
        />
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

// GeofenceDetails Component (unchanged)
interface GeofenceDetailsProps {
  center: [number, number];
  radius: number;
}

const GeofenceDetails: React.FC<GeofenceDetailsProps> = memo(
  ({ center, radius }) => {
    const formattedCoordinates = useMemo(
      () => `${center[0].toFixed(6)}, ${center[1].toFixed(6)}`,
      [center]
    );

    return (
      <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-md border border-gray-200">
        <p>
          <span className="font-medium">Center:</span> {formattedCoordinates}
        </p>
        <p>
          <span className="font-medium">Radius:</span> {radius}m
        </p>
      </div>
    );
  }
);

GeofenceDetails.displayName = "GeofenceDetails";

// FormActions Component (unchanged)
interface FormActionsProps {
  isLoading: boolean;
  onCancel: () => void;
}

const FormActions: React.FC<FormActionsProps> = memo(
  ({ isLoading, onCancel }) => {
    return (
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transform"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creating...
            </span>
          ) : (
            "Create"
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transform"
        >
          Cancel
        </button>
      </div>
    );
  }
);

FormActions.displayName = "FormActions";

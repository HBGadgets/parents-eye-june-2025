"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, ExternalLink } from "lucide-react";
import { Branch, Geofence, Route, School } from "@/interface/modal";
import { useRouteDropdown } from "@/hooks/useDropdown";
import { Combobox } from "@/components/ui/combobox";
import { TimePicker12 } from "../time-picker-12h";
import { useGeofenceStore } from "@/store/geofenceStore";

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface Coords {
  lat: number;
  lng: number;
}

interface Props {
  locationSearchQuery: string;
  setLocationSearchQuery: (value: string) => void;
  searchResults: SearchResult[];
  showSearchResults: boolean;
  selectSearchResult: (result: SearchResult) => void;
  currentGeofenceName: string;
  updateGeofenceName: (value: string) => void;
  currentRadius: number;
  updateRadius: (value: number) => void;
  currentCoords: Coords;
  updateCoordinates: (lat: number, lng: number) => void;
  openStreetView: () => void;
  saveGeofences: () => void;
  isLoading: boolean;
  tempGeofence: any;
  selectedRoute: Route | null;
  handleRouteSelect?: (route: Route | null) => void;
  selectedSchool: School | null;
  handleSchoolSelect: (school: School | null) => void;
  selectedBranch: Branch | null;
  handleBranchSelect: (branch: Branch | null) => void;
  pickupTime: Date | undefined;
  setPickupTime: (time: Date | undefined) => void;
  dropTime: Date | undefined;
  setDropTime: (time: Date | undefined) => void;
  role: string;
  schools: School[];
  branches: Branch[];
}

function parseTimeStringToDate(timeString: string): Date | null {
  try {
    const match = timeString.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3].toLowerCase();

    if (meridiem === "pm" && hours < 12) {
      hours += 12;
    } else if (meridiem === "am" && hours === 12) {
      hours = 0;
    }

    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
  } catch (error) {
    console.error("Failed to parse time string:", timeString, error);
    return null;
  }
}

const GeofenceConfigurationPanel: React.FC<Props> = ({
  pickupTime,
  setPickupTime,
  dropTime,
  setDropTime,
  handleRouteSelect,
  handleBranchSelect,
  handleSchoolSelect,
  selectedRoute,
  selectedSchool,
  selectedBranch,
  locationSearchQuery,
  setLocationSearchQuery,
  searchResults,
  showSearchResults,
  selectSearchResult,
  currentGeofenceName,
  updateGeofenceName,
  currentRadius,
  updateRadius,
  currentCoords,
  updateCoordinates,
  openStreetView,
  saveGeofences,
  isLoading,
  tempGeofence,
  role,
  schools,
  branches,
}) => {
  const editRowData = useGeofenceStore((state) => state.rowData);

  const lastInitializedId = useRef<string | null>(null);
  const routeInitialized = useRef<boolean>(false);

  const { data: routesData = [] } = useRouteDropdown(
    selectedBranch?._id,
    !!selectedBranch?._id
  );

  const schoolItems = useMemo(
    () =>
      schools.map((school) => ({
        label: school.schoolName?.trim() || `School ${school._id}`,
        value: school._id,
      })),
    [schools]
  );

  const branchItems = useMemo(
    () =>
      branches.map((branch) => ({
        label: branch.branchName?.trim() || `Branch ${branch._id}`,
        value: branch._id,
      })),
    [branches]
  );

  const routeItems = useMemo(
    () =>
      routesData.map((route) => ({
        label:
          (route.routeNumber || route.name)?.trim() || `Route ${route._id}`,
        value: route._id,
      })),
    [routesData]
  );

  // Main initialization - only depends on editRowData._id
  useEffect(() => {
    if (editRowData && editRowData._id !== lastInitializedId.current) {
      console.log("=== 🚀 INITIALIZING EDIT MODE ===");
      console.log("EditRowData:", editRowData);
      console.log(
        "Schools available:",
        schools.length,
        schools.map((s) => ({ id: s._id, name: s.schoolName }))
      );
      console.log(
        "Branches available:",
        branches.length,
        branches.map((b) => ({ id: b._id, name: b.branchName }))
      );

      lastInitializedId.current = editRowData._id;
      routeInitialized.current = false;

      // Basic fields
      if (editRowData.geofenceName) {
        updateGeofenceName(editRowData.geofenceName);
      }

      if (editRowData.area?.radius) {
        updateRadius(editRowData.area.radius);
      }

      if (editRowData.area?.center && Array.isArray(editRowData.area.center)) {
        const [lat, lng] = editRowData.area.center;
        updateCoordinates(lat, lng);
      }

      // Times
      if (editRowData.pickupTime) {
        const pickupDate = parseTimeStringToDate(editRowData.pickupTime);
        if (pickupDate) setPickupTime(pickupDate);
      }

      if (editRowData.dropTime) {
        const dropDate = parseTimeStringToDate(editRowData.dropTime);
        if (dropDate) setDropTime(dropDate);
      }

      // School
      if (editRowData.schoolId) {
        console.log("Looking for school with ID:", editRowData.schoolId);
        const matchingSchool = schools.find(
          (s) => s._id === editRowData.schoolId
        );
        if (matchingSchool) {
          console.log("✅ Found school:", matchingSchool.schoolName);
          handleSchoolSelect(matchingSchool);
        } else {
          console.error(
            "❌ School NOT found! Available IDs:",
            schools.map((s) => s._id)
          );
        }
      }

      // Branch
      if (editRowData.branchId) {
        console.log("Looking for branch with ID:", editRowData.branchId);
        const matchingBranch = branches.find(
          (b) => b._id === editRowData.branchId
        );
        if (matchingBranch) {
          console.log("✅ Found branch:", matchingBranch.branchName);
          handleBranchSelect(matchingBranch);
        } else {
          console.error(
            "❌ Branch NOT found! Available IDs:",
            branches.map((b) => b._id)
          );
        }
      }
    }
  }, [editRowData?._id]); // ONLY depend on _id to avoid infinite loop

  // Separate effect for route initialization
  useEffect(() => {
    if (
      editRowData &&
      editRowData._id === lastInitializedId.current &&
      editRowData.routeObjId &&
      routesData.length > 0 &&
      handleRouteSelect &&
      !routeInitialized.current
    ) {
      console.log("=== 🚌 ROUTE INITIALIZATION ===");
      console.log("Looking for route with ID:", editRowData.routeObjId);
      console.log(
        "Routes available:",
        routesData.length,
        routesData.map((r) => ({ id: r._id, name: r.routeNumber || r.name }))
      );

      const matchingRoute = routesData.find(
        (r) => r._id === editRowData.routeObjId
      );

      if (matchingRoute) {
        console.log(
          "✅ Found route:",
          matchingRoute.routeNumber || matchingRoute.name
        );
        handleRouteSelect(matchingRoute);
        routeInitialized.current = true;
      } else {
        console.error(
          "❌ Route NOT found! Available IDs:",
          routesData.map((r) => r._id)
        );
      }
    }
  }, [routesData.length, editRowData?.routeObjId, editRowData?._id]);

  // Cleanup on unmount or when editRowData clears
  useEffect(() => {
    if (!editRowData) {
      console.log("=== 🧹 CLEARING EDIT MODE ===");
      lastInitializedId.current = null;
      routeInitialized.current = false;
    }
  }, [editRowData]);

  // Debug current state
  useEffect(() => {
    console.log(dropTime);
    console.log(pickupTime);
  }, [dropTime, pickupTime]);

  return (
    <Card className="absolute top-14 right-4 w-auto min-w-[500px] max-w-[60vw] z-[1000]">
      <CardContent className=" space-y-4">
        <h2 className="text-lg font-semibold">Configuration</h2>

        <div className="flex justify-around items-center">
          {role === "superAdmin" && (
            <div className="space-y-2">
              <Label>School</Label>
              <Combobox
                items={schoolItems}
                value={selectedSchool?._id}
                onValueChange={(value) => {
                  const school = schools.find((s) => s._id === value) || null;
                  handleSchoolSelect(school);
                }}
                placeholder="Select school"
                searchPlaceholder="Search school..."
                emptyMessage="No school found"
                width="w-[140px]"
              />
            </div>
          )}

          {["superAdmin", "branchGroup", "school"].includes(role) && (
            <div className="space-y-2">
              <Label>Branch</Label>
              <Combobox
                items={branchItems}
                value={selectedBranch?._id}
                onValueChange={(value) => {
                  const branch = branches.find((b) => b._id === value) || null;
                  handleBranchSelect(branch);
                }}
                placeholder="Select branch"
                searchPlaceholder="Search branch..."
                emptyMessage="No branch found"
                width="w-[140px]"
                disabled={role === "superAdmin" && !selectedSchool}
              />
            </div>
          )}

          {handleRouteSelect && (
            <div className="space-y-2">
              <Label>Route</Label>
              <Combobox
                items={routeItems}
                value={selectedRoute?._id}
                onValueChange={(value) => {
                  const route = routesData.find((r) => r._id === value) || null;
                  handleRouteSelect(route);
                }}
                placeholder="Select route"
                searchPlaceholder="Search school..."
                emptyMessage="No route found"
                width="w-[140px]"
                disabled={!selectedBranch}
              />
            </div>
          )}
        </div>

        {/* Rest of your JSX - no changes */}
        <div className="space-y-2 relative">
          <Label>Search Location</Label>
          <Input
            type="text"
            placeholder="Search for a location..."
            value={locationSearchQuery}
            onChange={(e) => setLocationSearchQuery(e.target.value)}
            className="text-sm mt-1"
          />
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  onClick={() => selectSearchResult(result)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {result.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Geofence Name</Label>
          <Input
            type="text"
            placeholder="Enter geofence name"
            value={currentGeofenceName}
            onChange={(e) => updateGeofenceName(e.target.value)}
            className="text-sm mt-1"
          />
        </div>

        <div className="space-y-2">
          <Label>Radius (meters)</Label>
          <Input
            type="number"
            placeholder="Enter radius in meters"
            value={currentRadius}
            onChange={(e) => updateRadius(parseInt(e.target.value) || 100)}
            className="text-sm mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Pickup time</Label>
            <TimePicker12 date={pickupTime} setDate={setPickupTime} />
          </div>
          <div className="space-y-2">
            <Label>Drop time</Label>
            <TimePicker12 date={dropTime} setDate={setDropTime} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={currentCoords.lat}
              placeholder={String(currentCoords.lat)}
              onChange={(e) =>
                updateCoordinates(parseFloat(e.target.value), currentCoords.lng)
              }
              className="text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={currentCoords.lng}
              placeholder={String(currentCoords.lng)}
              onChange={(e) =>
                updateCoordinates(currentCoords.lat, parseFloat(e.target.value))
              }
              className="text-xs"
            />
          </div>
        </div>

        <div className="space-y-2 pt-4">
          <Button
            variant="outline"
            className="w-full cursor-pointer"
            onClick={openStreetView}
            type="button"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Street View
          </Button>
          <Button
            className="w-full cursor-pointer"
            onClick={saveGeofences}
            disabled={isLoading || !tempGeofence}
            type="button"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Geofence"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeofenceConfigurationPanel;

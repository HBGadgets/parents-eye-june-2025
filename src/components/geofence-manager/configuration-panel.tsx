"use client";

import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, ExternalLink } from "lucide-react";
import { Branch, Route, School } from "@/interface/modal";
import { getDecodedToken } from "@/lib/jwt";
import Cookies from "js-cookie";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useInfiniteRouteData } from "@/hooks/useInfiniteRouteData";
import { SearchableDropdown } from "../SearcheableDropdownFilter";
import { TimePicker12 } from "../time-picker-12h";

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
  /* Location Search */
  locationSearchQuery: string;
  setLocationSearchQuery: (value: string) => void;
  searchResults: SearchResult[];
  showSearchResults: boolean;
  selectSearchResult: (result: SearchResult) => void;

  /* Geofence Fields */
  currentGeofenceName: string;
  updateGeofenceName: (value: string) => void;
  currentRadius: number;
  updateRadius: (value: number) => void;

  currentCoords: Coords;
  updateCoordinates: (lat: number, lng: number) => void;

  /* Actions */
  openStreetView: () => void;
  saveGeofences: () => void;
  isLoading: boolean;
  tempGeofence: any;

  /* Filters */
  selectedRoute: Route | null;
  handleRouteSelect?: (route: Route | null) => void;

  selectedSchool: School | null;
  handleSchoolSelect: (school: School | null) => void;

  selectedBranch: Branch | null;
  handleBranchSelect: (branch: Branch | null) => void;

  filteredBranches?: Branch[];
  filteredRoutes?: Route[];

  /* Time */
  pickupTime: Date | undefined;
  setPickupTime: (time: Date | undefined) => void;

  dropTime: Date | undefined;
  setDropTime: (time: Date | undefined) => void;
}

const GeofenceConfigurationPanel: React.FC<Props> = ({
  // Time
  pickupTime,
  setPickupTime,
  dropTime,
  setDropTime,

  // Filters
  handleRouteSelect,
  filteredRoutes,
  filteredBranches,
  handleBranchSelect,
  handleSchoolSelect,

  selectedRoute,
  selectedSchool,
  selectedBranch,

  // Location search
  locationSearchQuery,
  setLocationSearchQuery,
  searchResults,
  showSearchResults,
  selectSearchResult,

  // Geofence fields
  currentGeofenceName,
  updateGeofenceName,
  currentRadius,
  updateRadius,
  currentCoords,
  updateCoordinates,

  // Actions
  openStreetView,
  saveGeofences,
  isLoading,
  tempGeofence,
}) => {
  const token = Cookies.get("token");
  const decoded = token ? getDecodedToken(token) : null;
  const role = decoded?.role;

  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();
  // const { data: routeData } = useInfiniteRouteData({
  //   role,
  //   schoolId: selectedSchool?._id,
  //   branchId: selectedBranch?._id,
  //   limit: "all",
  // });

  // console.log("branchData:", branchData);
  // console.log("routes:", routeData);

  // const flatRoutes = routeData?.pages.flatMap((p) => p.data) || [];

  // console.log("flatRoutes:", flatRoutes);

  return (
    <Card className="absolute bottom-4 right-4 w-auto min-w-[320px] max-w-[90vw] z-[1000]">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <h3 className="font-semibold">Configuration</h3>

        {/* School / Branch / Route Filters */}
        <div className="flex space-x-2 mb-4">
          {role === "superAdmin" && (
            <SearchableDropdown
              items={schoolData || []}
              placeholder="Select school..."
              onSelect={handleSchoolSelect}
              value={selectedSchool?._id}
              valueKey="_id"
              labelKey="schoolName"
              className="w-[180px]"
            />
          )}

          {["superAdmin", "branchGroup", "school"].includes(role) && (
            <SearchableDropdown
              items={
                role === "superAdmin"
                  ? filteredBranches || []
                  : branchData || []
              }
              placeholder="Select branch..."
              onSelect={handleBranchSelect}
              value={selectedBranch?._id}
              valueKey="_id"
              labelKey="branchName"
              className="w-[180px]"
            />
          )}

          <SearchableDropdown
            items={
              role === "branch" ? filteredRoutes || [] : filteredRoutes || []
            }
            placeholder="Select route..."
            onSelect={handleRouteSelect}
            value={selectedRoute?._id}
            valueKey="_id"
            labelKey="routeNumber"
            className="w-[180px]"
          />
        </div>

        {/* Location Search */}
        <div>
          <Label className="text-sm font-medium">Search Location</Label>

          <div className="relative">
            <Input
              placeholder="Search for address or place..."
              value={locationSearchQuery}
              onChange={(e) => setLocationSearchQuery(e.target.value)}
              className="text-sm mt-1"
            />

            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-card border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-accent cursor-pointer text-xs border-b last:border-b-0"
                    onClick={() => selectSearchResult(result)}
                  >
                    {result.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Geofence Name */}
        <div>
          <Label className="text-sm font-medium">Geofence Name</Label>
          <Input
            placeholder="Enter geofence name"
            value={currentGeofenceName}
            onChange={(e) => updateGeofenceName(e.target.value)}
            className="text-sm mt-1"
          />
        </div>

        {/* Radius */}
        <div>
          <Label className="text-sm font-medium">Radius (meters)</Label>
          <Input
            type="number"
            min="10"
            value={currentRadius}
            onChange={(e) => updateRadius(parseInt(e.target.value) || 100)}
            className="text-sm mt-1"
          />
        </div>

        {/* Time Pickers */}
        <div className="flex mt-4 gap-4 w-full justify-between">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-bold">Pickup time</Label>
            <TimePicker12 date={pickupTime} setDate={setPickupTime} />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs font-bold">Drop time</Label>
            <TimePicker12 date={dropTime} setDate={setDropTime} />
          </div>
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={currentCoords.lat}
              onChange={(e) =>
                updateCoordinates(parseFloat(e.target.value), currentCoords.lng)
              }
              className="text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={currentCoords.lng}
              onChange={(e) =>
                updateCoordinates(currentCoords.lat, parseFloat(e.target.value))
              }
              className="text-xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button variant="outline" onClick={openStreetView} className="flex-1">
            <ExternalLink className="mr-2 h-4 w-4" />
            Street View
          </Button>

          <Button
            onClick={saveGeofences}
            disabled={!tempGeofence || isLoading}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Saving..." : "Save Geofence"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeofenceConfigurationPanel;

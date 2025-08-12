"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, ExternalLink } from "lucide-react";
import { CustomFilter } from "../ui/CustomFilter";
import { Branch, Route, School } from "@/interface/modal";
import { getDecodedToken } from "@/lib/jwt";
import Cookies from "js-cookie";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useRouteData } from "@/hooks/useRouteData";
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
  locationSearchQuery: string;
  setLocationSearchQuery: (value: string) => void;
  searchLocation: (query: string) => void;
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
  setSelectedRoute: (route: Route) => void;
  selectedRoute: Route | null;
  setSelectedSchool: (school: School | null) => void;
  selectedSchool: School | null;
  setSelectedBranch: (branch: Branch | null) => void;
  selectedBranch: Branch | null;
  filterResults: any[];
  setFilterResults: (results: any[]) => void;
  handleCustomFilter: (filtered: any[]) => void;
  handleSchoolSelect: (school: School | null) => void;
  handleBranchSelect: (branch: Branch | null) => void;
  filteredBranches?: Branch[]; // Optional prop for filtered branches
  filteredRoutes?: Route[]; // Optional prop for filtered routes
  handleRouteSelect?: (route: Route | null) => void; // Optional prop for route selection
  setPickupTime: (time: Date | undefined) => void;
  dropTime: Date | undefined;
  pickupTime: Date | undefined;
  setDropTime: (time: Date | undefined) => void;
}

const GeofenceConfigurationPanel: React.FC<Props> = ({
  setDropTime,
  dropTime,
  pickupTime,
  setPickupTime,
  handleRouteSelect,
  filteredRoutes,
  filteredBranches,
  handleBranchSelect,
  handleSchoolSelect,
  handleCustomFilter,
  setSelectedRoute,
  selectedRoute,
  setSelectedSchool,
  selectedSchool,
  setSelectedBranch,
  selectedBranch,
  filterResults,
  setFilterResults,
  locationSearchQuery,
  setLocationSearchQuery,
  searchLocation,
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
}) => {
  const token = Cookies.get("token");
  const decoded = token ? getDecodedToken(token) : null;
  const role = decoded?.role;
  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();
  const { data: routeData } = useRouteData();

  useEffect(() => {
    console.log("Role", role);
    console.log("School Data", schoolData);
    console.log("Branch Data", branchData);
    console.log("Route Data", routeData);
  }, [role]);

  function formatTimeToAMPM(date: Date): string {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  useEffect(() => {
    console.log("geofences pickup time: ", pickupTime);
  }, [pickupTime]);

  useEffect(() => {
    console.log("geofences drop time: ", dropTime);
  }, [dropTime]);

  return (
    <Card className="absolute bottom-4 right-4 w-auto min-w-[320px] max-w-[90vw] z-[1000]">
      <CardContent className="p-4 space-y-4">
        <h3 className="font-semibold">Configuration</h3>

        {/* Geofence Filter */}
        <div className="flex space-x-2 mb-4">
          {/* School Filter */}
          {role === "superAdmin" && (
            <SearchableDropdown
              items={schoolData || []}
              placeholder="Select school..."
              searchPlaceholder="Search schools..."
              emptyMessage="No schools found."
              onSelect={handleSchoolSelect}
              valueKey="_id"
              labelKey="schoolName"
              className="w-[180px]"
            />
          )}

          {/* Branch Filter */}
          {["superAdmin", "branchGroup", "school"].includes(role) && (
            <SearchableDropdown
              // items={filteredBranches || []}
              items={
                role === "superAdmin"
                  ? filteredBranches || []
                  : branchData || []
              }
              placeholder="Select branch..."
              searchPlaceholder="Search branch..."
              emptyMessage="No branches found."
              onSelect={handleBranchSelect}
              valueKey="_id"
              labelKey="branchName"
              className="w-[180px]"
            />
          )}

          {/* Route No. Filter */}
          <SearchableDropdown
            // items={filteredRoutes || []}
            items={role === "branch" ? routeData || [] : filteredRoutes || []}
            placeholder="Select route..."
            searchPlaceholder="Search routes..."
            emptyMessage="No routes found."
            onSelect={handleRouteSelect}
            valueKey="_id"
            labelKey="routeNumber"
            className="w-[180px]"
          />
        </div>

        {/* Location Search */}
        <div>
          <Label htmlFor="location-search" className="text-sm font-medium">
            Search Location
          </Label>
          <div className="relative">
            <Input
              id="location-search"
              placeholder="Search for address or place..."
              value={locationSearchQuery}
              onChange={(e) => {
                setLocationSearchQuery(e.target.value);
                // searchLocation(e.target.value);
              }}
              className="text-sm mt-1"
            />
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-accent cursor-pointer text-xs border-b border-border last:border-b-0"
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
          <Label htmlFor="geofence-name" className="text-sm font-medium">
            Geofence Name
          </Label>
          <Input
            id="geofence-name"
            placeholder="Enter geofence name"
            value={currentGeofenceName}
            onChange={(e) => updateGeofenceName(e.target.value)}
            className="text-sm mt-1"
          />
        </div>

        {/* Radius */}
        <div>
          <Label htmlFor="radius-input" className="text-sm font-medium">
            Radius (meters)
          </Label>
          <Input
            id="radius-input"
            type="number"
            min="10"
            value={currentRadius}
            onChange={(e) => updateRadius(parseInt(e.target.value) || 100)}
            className="text-sm mt-1"
          />
        </div>

        {/* Pickup time and Drop time */}
        <div className="flex mt-4 gap-4 w-full justify-between">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-bold" htmlFor="pickup">
              Pickup time
            </Label>
            <TimePicker12 date={pickupTime} setDate={setPickupTime} />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs font-bold" htmlFor="drop">
              Drop time
            </Label>
            <TimePicker12 date={dropTime} setDate={setDropTime} />
          </div>
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="latitude" className="text-xs">
              Latitude
            </Label>
            <Input
              id="latitude"
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
            <Label htmlFor="longitude" className="text-xs">
              Longitude
            </Label>
            <Input
              id="longitude"
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

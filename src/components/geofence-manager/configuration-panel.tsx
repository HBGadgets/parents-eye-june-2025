// components/GeofenceConfigurationPanel.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, ExternalLink } from "lucide-react";

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
}

const GeofenceConfigurationPanel: React.FC<Props> = ({
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
  return (
    <Card className="absolute bottom-4 right-4 w-80 z-[1000]">
      <CardContent className="p-4 space-y-4">
        <h3 className="font-semibold">Configuration</h3>

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
                searchLocation(e.target.value);
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

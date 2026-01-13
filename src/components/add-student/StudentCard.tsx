"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";
import { useGeofenceDropdown } from "@/hooks/useDropdown";

// ---------- TYPES ----------

export interface StudentFormData {
  id: string;
  childName: string;
  rollNumber: string;
  className: string;
  section: string;
  DOB: Date | undefined;
  age: number | "";
  gender: "male" | "female" | "";
  routeObjId: string;
  pickupGeoId: string;
  dropGeoId: string;
  routeName?: string; // ✅ Added
  pickupGeoName?: string;
  dropGeoName?: string;
}

export interface GeofenceSearchState {
  pickup: string;
  drop: string;
}

interface StudentCardProps {
  student: StudentFormData;
  index: number;
  routes: any[]; // ✅ Raw routes data
  routeOpen: boolean; // ✅ Added
  onRouteOpenChange: (open: boolean) => void; // ✅ Added
  isLoadingRoutes: boolean; // ✅ Added
  branchSelected: boolean;
  geofenceSearch: GeofenceSearchState;

  onStudentChange: (
    id: string,
    field: keyof StudentFormData,
    value: any
  ) => void;

  onDOBChange: (id: string, date: Date | undefined) => void;

  onGeofenceSearchChange: (
    studentId: string,
    type: "pickup" | "drop",
    value: string
  ) => void;

  onRemoveSibling: (id: string) => void;
  canRemove: boolean;
}

// ---------- STUDENT CARD COMPONENT ----------

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  index,
  routes,
  routeOpen,
  onRouteOpenChange,
  isLoadingRoutes,
  branchSelected,
  geofenceSearch,
  onStudentChange,
  onDOBChange,
  onGeofenceSearchChange,
  onRemoveSibling,
  canRemove,
}) => {
  const [pickupOpen, setPickupOpen] = React.useState(false);
  const [dropOpen, setDropOpen] = React.useState(false);

  // Only fetch when dropdown is opened
  const {
    data: pickupGeofencePages,
    fetchNextPage: fetchNextPickupPage,
    hasNextPage: hasNextPickupPage,
    isFetchingNextPage: isFetchingNextPickupPage,
    isLoading: isLoadingPickupGeofences,
  } = useGeofenceDropdown(
    student.routeObjId,
    geofenceSearch?.pickup || "",
    pickupOpen
  );

  const {
    data: dropGeofencePages,
    fetchNextPage: fetchNextDropPage,
    hasNextPage: hasNextDropPage,
    isFetchingNextPage: isFetchingNextDropPage,
    isLoading: isLoadingDropGeofences,
  } = useGeofenceDropdown(
    student.routeObjId,
    geofenceSearch?.drop || "",
    dropOpen
  );

  const pickupGeofences = React.useMemo(
    () => pickupGeofencePages?.pages.flatMap((p: any) => p.data || []) ?? [],
    [pickupGeofencePages]
  );

  const dropGeofences = React.useMemo(
    () => dropGeofencePages?.pages.flatMap((p: any) => p.data || []) ?? [],
    [dropGeofencePages]
  );

  // ✅ Build route items with preselected value injection
  const routeItems = React.useMemo(() => {
    const items = (routes || []).map((r: any) => ({
      value: r._id,
      label: r.routeNumber,
    }));

    // Inject preselected route if not in list
    if (
      student.routeObjId &&
      student.routeName &&
      !items.some((item) => item.value === student.routeObjId)
    ) {
      items.unshift({
        value: student.routeObjId,
        label: student.routeName,
      });
    }

    return items;
  }, [routes, student.routeObjId, student.routeName]);

  // ✅ Inject preselected item if it exists but hasn't been fetched
  const pickupGeofenceItems = React.useMemo(() => {
    const items = pickupGeofences.map((g: any) => ({
      value: g._id,
      label: g.geofenceName,
    }));

    // If there's a preselected value and name, but it's not in the fetched list
    if (
      student.pickupGeoId &&
      student.pickupGeoName &&
      !items.some((item) => item.value === student.pickupGeoId)
    ) {
      items.unshift({
        value: student.pickupGeoId,
        label: student.pickupGeoName,
      });
    }

    return items;
  }, [pickupGeofences, student.pickupGeoId, student.pickupGeoName]);

  // ✅ Inject preselected item if it exists but hasn't been fetched
  const dropGeofenceItems = React.useMemo(() => {
    const items = dropGeofences.map((g: any) => ({
      value: g._id,
      label: g.geofenceName,
    }));

    // If there's a preselected value and name, but it's not in the fetched list
    if (
      student.dropGeoId &&
      student.dropGeoName &&
      !items.some((item) => item.value === student.dropGeoId)
    ) {
      items.unshift({
        value: student.dropGeoId,
        label: student.dropGeoName,
      });
    }

    return items;
  }, [dropGeofences, student.dropGeoId, student.dropGeoName]);

  // ✅ Handle route change with name storage
  const handleRouteChange = React.useCallback(
    (val?: string) => {
      if (!val) {
        onStudentChange(student.id, "routeObjId", "");
        onStudentChange(student.id, "routeName", "");
        // Also clear geofences when route changes
        onStudentChange(student.id, "pickupGeoId", "");
        onStudentChange(student.id, "dropGeoId", "");
        onStudentChange(student.id, "pickupGeoName", "");
        onStudentChange(student.id, "dropGeoName", "");
        return;
      }

      const route = routeItems.find((item) => item.value === val);
      onStudentChange(student.id, "routeObjId", val);
      onStudentChange(student.id, "routeName", route?.label || "");
      // Clear geofences when route changes
      onStudentChange(student.id, "pickupGeoId", "");
      onStudentChange(student.id, "dropGeoId", "");
      onStudentChange(student.id, "pickupGeoName", "");
      onStudentChange(student.id, "dropGeoName", "");
    },
    [student.id, routeItems, onStudentChange]
  );

  const handlePickupChange = React.useCallback(
    (val?: string) => {
      if (!val) {
        onStudentChange(student.id, "pickupGeoId", "");
        onStudentChange(student.id, "pickupGeoName", "");
        return;
      }

      const geofence = pickupGeofenceItems.find((item) => item.value === val);
      onStudentChange(student.id, "pickupGeoId", val);
      onStudentChange(student.id, "pickupGeoName", geofence?.label || "");
    },
    [student.id, pickupGeofenceItems, onStudentChange]
  );

  // ✅ Handle drop change with name storage
  const handleDropChange = React.useCallback(
    (val?: string) => {
      if (!val) {
        onStudentChange(student.id, "dropGeoId", "");
        onStudentChange(student.id, "dropGeoName", "");
        return;
      }

      const geofence = dropGeofenceItems.find((item) => item.value === val);
      onStudentChange(student.id, "dropGeoId", val);
      onStudentChange(student.id, "dropGeoName", geofence?.label || "");
    },
    [student.id, dropGeofenceItems, onStudentChange]
  );

  // ✅ Handle pickup dropdown open/close with search reset
  const handlePickupOpenChange = React.useCallback(
    (open: boolean) => {
      setPickupOpen(open);
      // Clear search when opening
      if (open) {
        onGeofenceSearchChange(student.id, "pickup", "");
      }
    },
    [student.id, onGeofenceSearchChange]
  );

  // ✅ Handle drop dropdown open/close with search reset
  const handleDropOpenChange = React.useCallback(
    (open: boolean) => {
      setDropOpen(open);
      // Clear search when opening
      if (open) {
        onGeofenceSearchChange(student.id, "drop", "");
      }
    },
    [student.id, onGeofenceSearchChange]
  );

  return (
    <div className="p-4 border rounded-lg space-y-4 relative bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">
          {index === 0 ? "Student" : `Sibling ${index + 1}`}
        </h3>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemoveSibling(student.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* NAME */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Student Name *</label>
          <Input
            placeholder="Student Name"
            value={student.childName}
            onChange={(e) =>
              onStudentChange(student.id, "childName", e.target.value)
            }
          />
        </div>

        {/* ROLL */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Roll Number</label>
          <Input
            placeholder="Roll Number"
            value={student.rollNumber}
            onChange={(e) =>
              onStudentChange(student.id, "rollNumber", e.target.value)
            }
          />
        </div>

        {/* CLASS */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Class</label>
          <Input
            placeholder="Class"
            value={student.className}
            onChange={(e) =>
              onStudentChange(student.id, "className", e.target.value)
            }
          />
        </div>

        {/* SECTION */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Section</label>
          <Input
            placeholder="Section"
            value={student.section}
            onChange={(e) =>
              onStudentChange(student.id, "section", e.target.value)
            }
          />
        </div>

        {/* DOB */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Date of Birth</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !student.DOB && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {student.DOB ? (
                  student.DOB.toLocaleDateString("en-GB")
                ) : (
                  <span>Pick date of birth</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[9999]" align="start">
              <Calendar
                mode="single"
                selected={student.DOB}
                onSelect={(date) => onDOBChange(student.id, date)}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                captionLayout="dropdown"
                startMonth={new Date(1900, 0)}
                endMonth={new Date()}
                defaultMonth={student.DOB || new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* AGE */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Age</label>
          <Input
            type="number"
            placeholder="Age"
            value={student.age}
            readOnly
            className="bg-muted"
            title="Auto-calculated from Date of Birth"
          />
        </div>

        {/* GENDER */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">Gender</label>
          <RadioGroup
            value={student.gender}
            onValueChange={(value) =>
              onStudentChange(student.id, "gender", value as "male" | "female")
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id={`male-${student.id}`} />
              <Label htmlFor={`male-${student.id}`}>Male</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id={`female-${student.id}`} />
              <Label htmlFor={`female-${student.id}`}>Female</Label>
            </div>
          </RadioGroup>
        </div>

        {/* ROUTE */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">Route *</label>
          <Combobox
            items={routeItems}
            value={student.routeObjId}
            onValueChange={handleRouteChange} // ✅ Use handler with name storage
            placeholder={
              branchSelected ? "Select Route" : "Select branch first"
            }
            searchPlaceholder="Search route..."
            emptyMessage={
              isLoadingRoutes ? "Loading routes..." : "No routes found"
            }
            width="w-full"
            disabled={!branchSelected}
            open={routeOpen} // ✅ Control open state
            onOpenChange={onRouteOpenChange} // ✅ Handle open change
          />
        </div>

        {/* PICKUP */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Pickup Location *</label>
          <Combobox
            items={pickupGeofenceItems}
            value={student.pickupGeoId}
            onValueChange={handlePickupChange}
            placeholder={
              student.routeObjId
                ? "Select Pickup Location"
                : "Select route first"
            }
            searchPlaceholder="Search location..."
            emptyMessage={
              isLoadingPickupGeofences
                ? "Loading locations..."
                : "No locations found"
            }
            width="w-full"
            disabled={!student.routeObjId}
            onReachEnd={() => {
              if (hasNextPickupPage && !isFetchingNextPickupPage) {
                fetchNextPickupPage();
              }
            }}
            isLoadingMore={isFetchingNextPickupPage}
            searchValue={geofenceSearch?.pickup || ""}
            onSearchChange={(val) =>
              onGeofenceSearchChange(student.id, "pickup", val)
            }
            open={pickupOpen}
            onOpenChange={handlePickupOpenChange}
          />
        </div>

        {/* DROP */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Drop Location *</label>
          <Combobox
            items={dropGeofenceItems}
            value={student.dropGeoId}
            onValueChange={handleDropChange}
            placeholder={
              student.routeObjId ? "Select Drop Location" : "Select route first"
            }
            searchPlaceholder="Search location..."
            emptyMessage={
              isLoadingDropGeofences
                ? "Loading locations..."
                : "No locations found"
            }
            width="w-full"
            disabled={!student.routeObjId}
            onReachEnd={() => {
              if (hasNextDropPage && !isFetchingNextDropPage) {
                fetchNextDropPage();
              }
            }}
            isLoadingMore={isFetchingNextDropPage}
            searchValue={geofenceSearch?.drop || ""}
            onSearchChange={(val) =>
              onGeofenceSearchChange(student.id, "drop", val)
            }
            open={dropOpen}
            onOpenChange={handleDropOpenChange}
          />
        </div>
      </div>
    </div>
  );
};

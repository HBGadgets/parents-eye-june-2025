"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Route } from "@/interface/modal";

interface Props {
  onSubmit: (data: {
    routeNumber: string;
    deviceObjId: string;
    schoolId: string;
    branchId: string;
  }) => void;

  onClose: () => void;
  initialData?: Route | null;

  schools: { _id: string; schoolName: string }[];
  branches: { _id: string; branchName: string }[];
  devices: { _id: string; name: string }[];

  selectedSchoolId?: string;
  selectedBranchId?: string;

  onSchoolChange?: (id?: string) => void;
  onBranchChange?: (id?: string) => void;
  decodedToken?: {
    role: string;
    schoolId?: string;
    id?: string;
    branchId?: string;
  };
}

export default function AddRouteForm({
  onSubmit,
  onClose,
  initialData,
  schools,
  branches,
  devices,
  selectedSchoolId,
  selectedBranchId,
  onSchoolChange,
  onBranchChange,
  decodedToken,
}: Props) {
  const [routeNumber, setRouteNumber] = useState("");
  const [deviceObjId, setDeviceObjId] = useState("");

  const decodedTokenRole = decodedToken?.role;
  const tokenSchoolId =
    decodedToken?.role === "school" ? decodedToken?.id : decodedToken?.schoolId;

  const tokenBranchId = decodedToken?.id;

  useEffect(() => {
    if (decodedTokenRole === "school" && tokenSchoolId) {
      onSchoolChange?.(tokenSchoolId);
    }

    if (decodedTokenRole === "branch" && tokenBranchId) {
      onBranchChange?.(tokenBranchId);
    }
  }, []);

  // ✅ PREFILL EDIT DATA
  useEffect(() => {
    if (initialData) {
      setRouteNumber(initialData?.routeNumber);
      onSchoolChange?.(initialData?.schoolId?._id);
      onBranchChange?.(initialData?.branchId?._id);
      setDeviceObjId(initialData?.deviceObjId?._id);
    }
  }, [initialData]);

  useEffect(() => {
    if (!initialData) {
      setDeviceObjId("");
    }
  }, [selectedBranchId]);

  const handleSave = () => {
    // if (
    //   !routeNumber ||
    //   !selectedSchoolId ||
    //   !selectedBranchId ||
    //   !deviceObjId
    // ) {
    //   // alert("All fields are required");
    //   toast.warning("All fields are required");
    //   return;
    // }

    onSubmit({
      routeNumber,
      schoolId: selectedSchoolId!,
      branchId: selectedBranchId!,
      deviceObjId,
    });
  };

  return (
    <Card className="w-[400px] shadow-xl">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Route" : "Add Route"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ROUTE NUMBER */}
        <div>
          <label className="text-sm font-medium">Route Number *</label>
          <Input
            placeholder="e.g. PH-101"
            value={routeNumber}
            onChange={(e) => setRouteNumber(e.target.value)}
          />
        </div>

        {/* SCHOOL */}
        {decodedTokenRole === "superAdmin" && (
          <div>
            <label className="text-sm font-medium">School *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {schools.find((s) => s._id === selectedSchoolId)
                    ?.schoolName || "Select School"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0">
                <Command>
                  <CommandInput placeholder="Search school..." />
                  <CommandEmpty>No schools found</CommandEmpty>
                  <CommandGroup className="max-h-[220px] overflow-y-auto">
                    {schools.map((s) => (
                      <CommandItem
                        key={s._id}
                        onSelect={() => onSchoolChange?.(s._id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4",
                            s._id === selectedSchoolId
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {s.schoolName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* BRANCH */}
        {decodedTokenRole !== "branch" && (
          <div>
            <label className="text-sm font-medium">Branch *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  disabled={
                    decodedTokenRole === "superAdmin" && !selectedSchoolId
                  }
                >
                  {branches.find((b) => b._id === selectedBranchId)
                    ?.branchName ||
                    (selectedSchoolId
                      ? "Select Branch"
                      : "Select school first")}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0">
                <Command>
                  <CommandInput placeholder="Search branch..." />
                  <CommandEmpty>No branches found</CommandEmpty>
                  <CommandGroup className="max-h-[220px] overflow-y-auto">
                    {branches.map((b) => (
                      <CommandItem
                        key={b._id}
                        onSelect={() => onBranchChange?.(b._id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4",
                            selectedBranchId === b._id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {b.branchName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* DEVICE */}
        <div>
          <label className="text-sm font-medium">Device *</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                disabled={decodedTokenRole !== "branch" && !selectedBranchId}
              >
                {devices.find((d) => d._id === deviceObjId)?.name ||
                  (selectedBranchId ? "Select Device" : "Select branch first")}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-0">
              <Command>
                <CommandInput placeholder="Search device..." />
                <CommandEmpty>No devices found</CommandEmpty>
                <CommandGroup className="max-h-[220px] overflow-y-auto">
                  {devices.map((d) => (
                    <CommandItem
                      key={d._id}
                      onSelect={() => setDeviceObjId(d._id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4",
                          d._id === deviceObjId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {d.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            className="bg-primary"
            onClick={handleSave}
            className="cursor-pointer"
          >
            {initialData ? "Update" : "Create"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

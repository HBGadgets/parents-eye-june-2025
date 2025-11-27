"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}

export default function AddRouteForm({
  onSubmit,
  onClose,
  initialData,
  schools,
  branches,
  devices,
}: Props) {
  const [routeNumber, setRouteNumber] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [deviceObjId, setDeviceObjId] = useState("");

  useEffect(() => {
    if (initialData) {
      setRouteNumber(initialData.routeNumber);
      setSchoolId(initialData.schoolId._id);
      setBranchId(initialData.branchId._id);
      setDeviceObjId(initialData.deviceObjId._id);
    }
  }, [initialData]);

  const handleSave = () => {
    if (!routeNumber || !schoolId || !branchId || !deviceObjId) {
      alert("All fields are required");
      return;
    }

    onSubmit({
      routeNumber,
      schoolId,
      branchId,
      deviceObjId,
    });
  };

  return (
    <Card className="w-[400px] shadow-lg">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Route" : "Add Route"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ROUTE NUMBER */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Route Number *</label>
          <Input
            placeholder="e.g. PH-101"
            value={routeNumber}
            onChange={(e) => setRouteNumber(e.target.value)}
            required
          />
        </div>

        {/* SCHOOL */}
        <div className="space-y-1">
          <label className="text-sm font-medium">School *</label>
          <Select value={schoolId} onValueChange={setSchoolId} required>
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder="Select School" />
            </SelectTrigger>
            <SelectContent>
              {schools.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.schoolName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* BRANCH */}
        <div className="space-y-1">
          <label className="text-sm font-medium cursor-pointer">Branch *</label>
          <Select value={branchId} onValueChange={setBranchId} required>
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b._id} value={b._id}>
                  {b.branchName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* DEVICE */}
        <div className="space-y-1">
          <label className="text-sm font-medium cursor-pointer">Device *</label>
          <Select value={deviceObjId} onValueChange={setDeviceObjId} required>
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder="Select Device" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((d) => (
                <SelectItem key={d._id} value={d._id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end gap-2 pt-3">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button className="bg-primary cursor-pointer" onClick={handleSave}>
            {initialData ? "Update" : "Create"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

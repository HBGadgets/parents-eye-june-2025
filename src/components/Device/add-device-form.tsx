"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "../ui/combobox";
import { toast } from "sonner";

// Hooks
import { useDriver } from "@/hooks/useDriver";
import { useRoutes } from "@/hooks/useRoute";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useAddDeviceNew } from "@/hooks/device/useAddDevice(new)";
import { useAddDeviceOld } from "@/hooks/device/useAddDevice(old)";

export const AddDeviceForm = () => {
  // ======================
  // 🔹 Hook Setup
  // ======================
  const { data: driverData, isLoading: driverLoading } = useDriver();
  const { data: routeData } = useRoutes({ limit: "all" });
  const { data: schoolData, isLoading: schoolLoading } = useSchoolData();
  const { data: branchData } = useBranchData();

  const addDeviceMutationNew = useAddDeviceNew();
  const addDeviceMutationOld = useAddDeviceOld();

  // ======================
  // 🔹 Local State
  // ======================
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    uniqueId: "",
    deviceId: "",
    sim: "",
    speed: "",
    average: "",
    driver: "",
    model: "",
    routeNo: "",
    category: "",
    schoolId: "",
    branchId: "",
  });

  // Reset form on modal close
  useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        deviceId: "",
        uniqueId: "",
        sim: "",
        speed: "",
        average: "",
        driver: "",
        model: "",
        routeNo: "",
        category: "",
        schoolId: "",
        branchId: "",
      });
    }
  }, [open]);

  // ======================
  // 🔹 Dropdown Options
  // ======================
  const driverOptions = useMemo(
    () =>
      driverData?.drivers?.map((driver: any) => ({
        value: driver._id,
        label: driver.driverName,
      })) || [],
    [driverData]
  );

  const schoolOptions = useMemo(
    () =>
      schoolData?.map((s: any) => ({
        value: s._id,
        label: s.schoolName,
      })) || [],
    [schoolData]
  );

  const branchOptions = useMemo(() => {
    if (!branchData) return [];
    const filtered = formData.schoolId
      ? branchData.filter((b: any) => b.schoolId._id === formData.schoolId)
      : branchData;
    return filtered.map((b: any) => ({
      value: b._id,
      label: b.branchName,
    }));
  }, [branchData, formData.schoolId]);

  const routeOptions = useMemo(() => {
    if (!routeData) return [];
    const filtered = formData.branchId
      ? routeData.data.filter((r: any) => r.branchId?._id === formData.branchId)
      : routeData.data;
    return filtered.map((r: any) => ({
      value: r._id,
      label: r.routeNumber,
    }));
  }, [routeData, formData.branchId]);

  // ======================
  // 🔹 Handlers
  // ======================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Transform data for old API (minimal fields)
  const transformForOldApi = (data: any) => ({
    name: data.name,
    uniqueId: data.uniqueId,
    model: data.model,
    category: data.category,
    phone: data.sim, // old API expects phone instead of sim
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1️⃣ Prepare payloads
      const oldPayload = transformForOldApi(formData);

      // 2️⃣ Create in old system FIRST
      const oldResult = await addDeviceMutationOld.mutateAsync(oldPayload);

      // Check if old system responded with valid ID
      if (!oldResult?.id) {
        throw new Error("Old system failed to return device ID");
      }

      // 3️⃣ Create in new system using old ID
      const newPayload = {
        ...formData,
        deviceId: oldResult.id, // 🔗 Link old + new
      };

      const newResult = await addDeviceMutationNew.mutateAsync(newPayload);

      // 4️⃣ Show success toast
      toast.success("✅ Device added successfully to both systems!");

      setOpen(false);
    } catch (error: any) {
      console.error("Error adding device:", error);
      toast.error(
        error?.response?.data?.message ||
          "❌ Failed to add device in both systems"
      );
    }
  };

  // ======================
  // 🔹 Render
  // ======================
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer">Add Device</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Device</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Device Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Device Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter device name"
              required
            />
          </div>

          {/* IMEI */}
          <div className="grid gap-2">
            <Label htmlFor="uniqueId">IMEI No.</Label>
            <Input
              id="uniqueId"
              name="uniqueId"
              value={formData.uniqueId}
              onChange={handleInputChange}
              placeholder="Enter IMEI number"
              required
            />
          </div>

          {/* SIM */}
          <div className="grid gap-2">
            <Label htmlFor="sim">SIM No.</Label>
            <Input
              id="sim"
              name="sim"
              type="number"
              value={formData.sim}
              onChange={handleInputChange}
              placeholder="Enter SIM number"
              required
            />
          </div>

          {/* Speed */}
          <div className="grid gap-2">
            <Label htmlFor="speed">Speed Limit</Label>
            <Input
              id="speed"
              name="speed"
              type="number"
              value={formData.speed}
              onChange={handleInputChange}
              placeholder="Enter speed limit"
              required
            />
          </div>

          {/* Average */}
          <div className="grid gap-2">
            <Label htmlFor="average">Average</Label>
            <Input
              id="average"
              name="average"
              type="number"
              value={formData.average}
              onChange={handleInputChange}
              placeholder="Enter average"
              required
            />
          </div>

          {/* Driver */}
          <div className="grid gap-2">
            <Label htmlFor="driver">Driver</Label>
            <Combobox
              items={driverOptions}
              value={formData.driver}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, driver: value }))
              }
              placeholder="Select driver..."
              searchPlaceholder="Search driver..."
              emptyMessage="No driver found."
              disabled={driverLoading}
            />
          </div>

          {/* Model */}
          <div className="grid gap-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              placeholder="Enter model"
              required
            />
          </div>

          {/* Category */}
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="Enter category"
              required
            />
          </div>

          {/* School */}
          <div className="grid gap-2">
            <Label htmlFor="schoolId">School</Label>
            <Combobox
              items={schoolOptions}
              value={formData.schoolId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, schoolId: value }))
              }
              placeholder="Select school..."
              searchPlaceholder="Search school..."
              emptyMessage="No school found."
              disabled={schoolLoading}
            />
          </div>

          {/* Branch */}
          <div className="grid gap-2">
            <Label htmlFor="branch">Branch</Label>
            <Combobox
              items={branchOptions}
              value={formData.branchId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, branchId: value }))
              }
              placeholder="Select branch..."
              searchPlaceholder="Search branch..."
              emptyMessage="No branch found."
              disabled={!formData.schoolId}
            />
          </div>

          {/* Route */}
          <div className="grid gap-2">
            <Label htmlFor="routeNo">Route No.</Label>
            <Combobox
              items={routeOptions}
              value={formData.routeNo}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, routeNo: value }))
              }
              placeholder="Select route..."
              searchPlaceholder="Search route..."
              emptyMessage="No route found."
              disabled={!formData.branchId}
            />
          </div>

          {/* Footer */}
          <DialogFooter className="col-span-full mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button
                variant="outline"
                type="button"
                className="cursor-pointer"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={addDeviceMutationNew.isPending}
              className="cursor-pointer"
            >
              {addDeviceMutationNew.isPending ? "Saving..." : "Save Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

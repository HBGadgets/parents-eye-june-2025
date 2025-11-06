"use client";

import { useState, useMemo, useEffect, use } from "react";
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
import { useDriver } from "@/hooks/useDriver";
import { useRoutes } from "@/hooks/useRoute";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useAddDeviceNew } from "@/hooks/device/useAddDevice(new)";
import { toast } from "sonner";
import { add } from "lodash";
import { useAddDeviceOld } from "@/hooks/device/useAddDevice(old)";

export const AddDeviceForm = () => {
  const { data: driverData, isLoading: driverLoading } = useDriver();
  const { data: routeData } = useRoutes({
    limit: "all",
  });
  const { data: schoolData, isLoading: schoolLoading } = useSchoolData();
  const { data: branchData } = useBranchData();
  const addDeviceMutationNew = useAddDeviceNew();
  const addDeviceMutationOld = useAddDeviceOld();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
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


  useEffect(() => {
    if (!open) {
      // Reset all fields when dialog closes
      setFormData({
        name: "",
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

  // 🧠 Convert driver data into combobox-friendly format
  const driverOptions = useMemo(() => {
    if (!driverData) return [];
    return driverData.map((driver: any) => ({
      value: driver._id,
      label: driver.driverName,
    }));
  }, [driverData]);

  // 🏫 School Options (no filtering needed)
  const schoolOptions = useMemo(() => {
    if (!schoolData) return [];
    return schoolData.map((s: any) => ({
      value: s._id,
      label: s.schoolName,
    }));
  }, [schoolData]);

  // 🏢 Branch Options (filter by selected school)
  const branchOptions = useMemo(() => {
    if (!branchData) return [];
    // Only show branches belonging to the selected school
    const filteredBranches = formData.schoolId
      ? branchData.filter((b: any) => b.schoolId._id === formData.schoolId)
      : branchData;

    return filteredBranches.map((b: any) => ({
      value: b._id,
      label: b.branchName,
    }));
  }, [branchData, formData.schoolId]);

  // 🛣️ Route Options (filter by selected branch)
  const routeOptions = useMemo(() => {
    if (!routeData) return [];
    // Only show routes belonging to the selected branch
    const filteredRoutes = formData.branchId
      ? routeData.data.filter(
          (r: any) => r?.branchId?._id === formData.branchId
        )
      : routeData.data;

    return filteredRoutes.map((r: any) => ({
      value: r._id,
      label: r.routeNumber,
    }));
  }, [routeData, formData.branchId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting:", formData);
    try {
      await addDeviceMutationNew.mutateAsync(formData);
      await addDeviceMutationOld.mutateAsync(formData);
      toast.success("Device added successfully!");
      setOpen(false);
    } catch (error: any) {
      // console.error("Error adding device:", error);
      toast.error(error?.response?.data?.message || "Failed to add device");
    }
  };

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
              width="w-full"
              disabled={driverLoading}
            />
          </div>

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
              width="w-full"
              disabled={schoolLoading}
            />
          </div>

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
              width="w-full"
              disabled={!formData.schoolId}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="routeNo">Route No.</Label>
            <Combobox
              items={routeOptions}
              value={formData.routeNo}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, routeNo: value }))
              }
              placeholder="Select route no..."
              searchPlaceholder="Search route no..."
              emptyMessage="No route no found."
              width="w-full"
              disabled={!formData.branchId}
            />
          </div>

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
              className="cursor-pointer"
              disabled={addDeviceMutationNew.isPending}
            >
              {addDeviceMutationNew.isPending ? "Saving..." : "Save Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

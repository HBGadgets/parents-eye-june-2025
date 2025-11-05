"use client";

import { useState } from "react";
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
// import { Combobox } from "@/components/ui/combobox"; // if needed later

export const AddDeviceForm = () => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting:", formData);
    // TODO: integrate API call to add device
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Device</Button>
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

          <div>
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

          <div>
            <Label htmlFor="sim">SIM No.</Label>
            <Input
              id="sim"
              name="sim"
              value={formData.sim}
              onChange={handleInputChange}
              placeholder="Enter SIM number"
              required
            />
          </div>

          <div>
            <Label htmlFor="speed">Speed Limit</Label>
            <Input
              id="speed"
              name="speed"
              value={formData.speed}
              onChange={handleInputChange}
              placeholder="Enter speed limit"
              required
            />
          </div>

          <div>
            <Label htmlFor="average">Average</Label>
            <Input
              id="average"
              name="average"
              value={formData.average}
              onChange={handleInputChange}
              placeholder="Enter average"
              required
            />
          </div>

          <div>
            <Label htmlFor="driver">Driver</Label>
            {/* <Combobox
              items={driverOprions}
              value={driver}
              onValueChange={setDriver}
              placeholder="Search driver..."
              searchPlaceholder="Search driver..."
              emptyMessage="No driver found."
              width="w-full"
              onSearchChange={setDriverSearch}
              searchValue={driverSearch}
            /> */}
          </div>

          <DialogFooter className="col-span-full mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save Device</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

"use client";

import { useState } from "react";
import GeofenceManager from "@/components/geofence-manager/GeofenceManager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogHeader,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export default function Geofence() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* —————————————————— trigger —————————————————— */}
      <div className="p-4">
        <DialogTrigger asChild>
          <Button className="cursor-pointer">Add geofence</Button>
        </DialogTrigger>
      </div>

      {/* ——————————— full-screen modal ——————————— */}
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 rounded-none !m-0 !left-0 !top-0 !transform-none !translate-x-0 !translate-y-0">
        <VisuallyHidden>
          <DialogTitle>Add Geofence</DialogTitle>
        </VisuallyHidden>
        {/* close button */}
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-[1000] cursor-pointer"
          >
            <X className="h-6 w-6 " />
          </Button>
        </DialogClose>

        {/* your manager renders only while the modal is open */}
        <GeofenceManager />
      </DialogContent>
    </Dialog>
  );
}

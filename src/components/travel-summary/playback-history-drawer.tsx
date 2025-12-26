"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface PlaybackHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uniqueId?: number;
  startDate?: string;
  endDate?: string;
}

export function PlaybackHistoryDrawer({
  open,
  onOpenChange,
  uniqueId,
  startDate,
  endDate,
}: PlaybackHistoryDrawerProps) {
  console.log("PlaybackHistoryDrawer props:", {
    open,
    uniqueId,
    startDate,
    endDate,
  });
   const toUTCDayRange = (
     dateInput: string
   ): {
     from: string;
     to: string;
   } => {
     let year: number, month: number, day: number;

     // Case 1: dd/MM/yyyy
     if (dateInput.includes("/")) {
       const [d, m, y] = dateInput.split("/").map(Number);
       day = d;
       month = m - 1;
       year = y;
     }
     // Case 2: yyyy-MM-dd
     else {
       const [y, m, d] = dateInput.split("-").map(Number);
       day = d;
       month = m - 1;
       year = y;
     }

     const from = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
     const to = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

     return {
       from: from.toISOString(),
       to: to.toISOString(),
     };
   };
  const {from, to} = toUTCDayRange(startDate, endDate);
 

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle>Playback History</DrawerTitle>
            <DrawerDescription>
              Vehicle ID: <b>{uniqueId ?? "-"}</b>
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4">
            <div className="text-sm text-muted-foreground mb-2">
              Date Range: from {startDate} → to {endDate}
            </div>

            <div className="h-[200px] border rounded-md flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <div>
                  <h1 className="font-semibold">PLAYBACK HISTORY</h1>
                </div>
              </ResponsiveContainer>
            </div>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

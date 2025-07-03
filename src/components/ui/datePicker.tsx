"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  label: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  open,
  setOpen,
  date,
  setDate,
  className,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="date" className="px-1">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className={`w-48 justify-between font-normal ${className || ""}`}
          >
            {date ? date.toLocaleDateString("en-GB") : "Select date"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              setDate(selectedDate);
              setOpen(false);
            }}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

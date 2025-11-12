"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils"; // optional, if you have this helper

interface DatePickerProps {
  label?: string;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  date,
  setDate,
  placeholder = "Select date",
  disabled = false,
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // 👇 Prevent Radix Dialog from closing when clicking inside popover
  React.useEffect(() => {
    const popoverEl = popoverRef.current;
    if (!popoverEl) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.stopPropagation();
    };
    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
    };

    popoverEl.addEventListener("mousedown", handleMouseDown);
    popoverEl.addEventListener("click", handleClick);

    return () => {
      popoverEl.removeEventListener("mousedown", handleMouseDown);
      popoverEl.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <Label htmlFor="date" className="px-1">
          {label}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            disabled={disabled}
            className={cn("w-48 justify-between font-normal", className)}
          >
            {date ? date.toLocaleDateString("en-GB") : placeholder}
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>

        {/* 👇 Attach ref to intercept clicks */}
        <PopoverContent
          ref={popoverRef}
          className="w-auto overflow-hidden p-0 z-[9999]"
          align="start"
          side="bottom"
          sideOffset={5}
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              setDate(selectedDate);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

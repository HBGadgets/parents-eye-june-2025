import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type DateRangeFilterProps = {
  onDateRangeChange?: (start: Date | null, end: Date | null) => void;
  title?: string;
  maxDays?: number;
  defaultStartDate?: Date | null;
  defaultEndDate?: Date | null;
  showTime?: boolean;
};

const cn = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(" ");

const formatTo12Hr = (time24: string): string => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  onDateRangeChange,
  title = "Select Date Range",
  maxDays,
  defaultStartDate,
  defaultEndDate,
  showTime = false
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<string>("00:00");
  const [endTime, setEndTime] = useState<string>("23:59");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showYearSelector, setShowYearSelector] = useState<boolean>(false);
  const [showMonthSelector, setShowMonthSelector] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only update if props are provided
    if (defaultStartDate !== undefined) {
      setSelectedStartDate(defaultStartDate);
      // Update calendar month to show the selected date
      if (defaultStartDate) {
        setCurrentMonth(new Date(defaultStartDate));
        if (showTime) {
          setStartTime(
            `${defaultStartDate.getHours().toString().padStart(2, "0")}:${defaultStartDate
              .getMinutes()
              .toString()
              .padStart(2, "0")}`
          );
        }
      }
    }
    if (defaultEndDate !== undefined) {
      setSelectedEndDate(defaultEndDate);
      if (showTime && defaultEndDate) {
        const isToday =
          defaultEndDate.toDateString() === new Date().toDateString();
        // If it's today and the time is 00:00 (default), use current time
        // Otherwise use the time from the date object
        if (
          isToday &&
          defaultEndDate.getHours() === 0 &&
          defaultEndDate.getMinutes() === 0
        ) {
          const now = new Date();
          setEndTime(
            `${now.getHours().toString().padStart(2, "0")}:${now
              .getMinutes()
              .toString()
              .padStart(2, "0")}`
          );
        } else {
          setEndTime(
            `${defaultEndDate.getHours().toString().padStart(2, "0")}:${defaultEndDate
              .getMinutes()
              .toString()
              .padStart(2, "0")}`
          );
        }
      }
    }
    setIsSelecting(false);
  }, [defaultStartDate, defaultEndDate, showTime]);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

  // Helper function to calculate days between dates (inclusive)
  const getDaysBetween = (date1: Date, date2: Date): number => {
    const utc1 = Date.UTC(
      date1.getFullYear(),
      date1.getMonth(),
      date1.getDate()
    );
    const utc2 = Date.UTC(
      date2.getFullYear(),
      date2.getMonth(),
      date2.getDate()
    );
    const diffTime = Math.abs(utc2 - utc1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive count
  };

  const popoverRef = React.useRef<HTMLDivElement>(null);

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

  // Helper function to check if a date should be disabled due to max limit
  const isDateDisabled = (date: Date): boolean => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Disable if date is strictly in the future
    if (checkDate > today) return true;

    // Existing maxDays logic
    if (!maxDays || !selectedStartDate || !isSelecting) return false;

    const daysDiff = getDaysBetween(selectedStartDate, checkDate);
    return daysDiff > maxDays;
  };

  // Helper function to get maximum allowed end date
  const getMaxEndDate = (startDate: Date): Date => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (!maxDays) return today; // Limit end date only up to today if no maxDays

    const maxEnd = new Date(startDate);
    maxEnd.setDate(startDate.getDate() + maxDays - 1);

    return maxEnd > today ? today : maxEnd;
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear(),
      month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days: Date[] = [];

    for (let i = 0; i < firstDayOfMonth; i++)
      days.unshift(new Date(year, month, -i));
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    for (let i = 1; i <= 42 - days.length; i++)
      days.push(new Date(year, month + 1, i));

    return days;
  };

  const formatDate = (date: Date, timeOverride?: string): string => {
    const dateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;

    if (showTime) {
      const timeStr24 =
        timeOverride ||
        `${date.getHours().toString().padStart(2, "0")}:${date
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
      return `${dateStr} ${formatTo12Hr(timeStr24)}`;
    }

    return dateStr;
  };

  const applySelectedRange = (start: Date | null, end: Date | null, currentStartTime = startTime, currentEndTime = endTime) => {
    let finalStart = start ? new Date(start) : null;
    let finalEnd = end ? new Date(end) : null;

    if (finalStart && !finalEnd) {
      finalEnd = new Date(finalStart);
    } else if (finalEnd && !finalStart) {
      finalStart = new Date(finalEnd);
    }

    if (finalStart) {
      if (showTime) {
        const [hours, minutes] = currentStartTime.split(":").map(Number);
        finalStart.setHours(hours, minutes, 0, 0);
      } else {
        finalStart.setHours(0, 1, 1, 0);
      }
    }

    if (finalEnd) {
      if (showTime) {
        const [hours, minutes] = currentEndTime.split(":").map(Number);
        finalEnd.setHours(hours, minutes, 59, 999);
      } else {
        finalEnd.setHours(23, 59, 59, 999);
      }
    }

    if (finalStart && finalEnd && finalStart > finalEnd) {
      setError("Start time must be before end time");
      return;
    }

    setError(null);
    onDateRangeChange?.(finalStart, finalEnd);
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return; // Prevent clicking disabled dates

    if (!isSelecting) {
      setSelectedStartDate(date);
      setSelectedEndDate(date);
      setIsSelecting(true);
      applySelectedRange(date, date);
    } else {
      let newStart = selectedStartDate;
      let newEnd = selectedEndDate;
      let newEndTime = endTime;

      if (date < selectedStartDate!) {
        newStart = date;
        newEnd = selectedStartDate;
        setSelectedStartDate(date);
        setSelectedEndDate(selectedStartDate);
      } else {
        // Check if the range exceeds max days limit
        if (maxDays && getDaysBetween(selectedStartDate!, date) > maxDays) {
          // Set end date to maximum allowed
          const maxEnd = getMaxEndDate(selectedStartDate!);
          newEnd = maxEnd;
          setSelectedEndDate(maxEnd);
        } else {
          newEnd = date;
          setSelectedEndDate(date);
          if (showTime) {
            const isToday = date.toDateString() === new Date().toDateString();
            if (isToday) {
              const now = new Date();
              newEndTime = `${now.getHours().toString().padStart(2, "0")}:${now
                .getMinutes()
                .toString()
                .padStart(2, "0")}`;
              setEndTime(newEndTime);
            } else {
              newEndTime = "23:59";
              setEndTime("23:59");
            }
          }
        }
      }
      setIsSelecting(false);
      applySelectedRange(newStart, newEnd, startTime, newEndTime);
      setIsOpen(false);
    }
  };

  const isDateInRange = (date: Date): boolean =>
    !!selectedStartDate &&
    !!selectedEndDate &&
    date >= selectedStartDate! &&
    date <= selectedEndDate!;

  const isDateSelected = (date: Date): boolean =>
    selectedStartDate?.toDateString() === date.toDateString() ||
    selectedEndDate?.toDateString() === date.toDateString();

  const handleApply = () => {
    applySelectedRange(selectedStartDate, selectedEndDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setIsSelecting(false);
    setStartTime("00:00");
    setEndTime("23:59");
    setError(null);
    onDateRangeChange?.(null, null);
    setIsOpen(false);
  };

  const handleYearChange = (year: number) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth()));
    setShowYearSelector(false);
  };

  const handleMonthChange = (monthIndex: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex));
    setShowMonthSelector(false);
  };

  const createPreset = (
    label: string,
    startDate: Date,
    endDate: Date = startDate,
    updateMonth = false
  ) => {
    // Check if preset exceeds max days limit
    const daysDiff = getDaysBetween(startDate, endDate);
    const isDisabled = maxDays && daysDiff > maxDays;

    return {
      label,
      disabled: isDisabled,
      action: () => {
        if (isDisabled) return; // Don't execute if disabled

        let finalEnd = endDate;
        if (maxDays && daysDiff > maxDays) {
          // Adjust end date to respect max limit
          finalEnd = getMaxEndDate(startDate);
        }
        setSelectedStartDate(startDate);
        setSelectedEndDate(finalEnd);
        setIsSelecting(false);
        if (updateMonth) setCurrentMonth(startDate);
        applySelectedRange(startDate, finalEnd);
        setIsOpen(false);
      },
    };
  };

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  // Calculate Monday of current week
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay; // Handle Sunday case
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() + daysToMonday);

  // Calculate Monday of last week (7 days before current week Monday)
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  // Calculate Sunday of last week (6 days after Monday of last week)
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);

  const allPresets = [
    createPreset("Today", today, today, true),
    createPreset("Yesterday", yesterday, yesterday, true),
    createPreset("Last Week", lastWeekStart, lastWeekEnd, true),
    createPreset("This Week", thisWeekStart, today, true),
    createPreset("This Month", thisMonthStart, today, true),
    createPreset("Last Month", lastMonthStart, lastMonthEnd, true),
    {
      label: "Custom Range",
      disabled: false,
      action: () => {
        setSelectedStartDate(null);
        setSelectedEndDate(null);
        setIsSelecting(false);
      },
    },
  ];

  // Filter presets based on maxDays limit
  const presets = maxDays
    ? allPresets.filter((preset) => {
      // Always show Custom Range
      if (preset.label === "Custom Range") return true;

      // For other presets, check if they exceed maxDays
      const startDate =
        preset.label === "Today"
          ? today
          : preset.label === "Yesterday"
            ? yesterday
            : preset.label === "Last Week"
              ? lastWeekStart
              : preset.label === "This Week"
                ? thisWeekStart
                : preset.label === "This Month"
                  ? thisMonthStart
                  : preset.label === "Last Month"
                    ? lastMonthStart
                    : null;

      const endDate =
        preset.label === "Today"
          ? today
          : preset.label === "Yesterday"
            ? yesterday
            : preset.label === "Last Week"
              ? lastWeekEnd
              : preset.label === "This Week"
                ? today
                : preset.label === "This Month"
                  ? today
                  : preset.label === "Last Month"
                    ? lastMonthEnd
                    : null;

      if (!startDate || !endDate) return true;

      const daysDiff = getDaysBetween(startDate, endDate);
      return daysDiff <= maxDays;
    })
    : allPresets;

  const isPresetActive = (label: string): boolean => {
    if (!selectedStartDate || !selectedEndDate) return false;

    const formatDateString = (date: Date) => date.toDateString();
    const startStr = formatDateString(selectedStartDate);
    const endStr = formatDateString(selectedEndDate);

    // Recalculate the date ranges for comparison
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const calculatedThisWeekStart = new Date(today);
    calculatedThisWeekStart.setDate(today.getDate() + daysToMonday);

    const calculatedLastWeekStart = new Date(calculatedThisWeekStart);
    calculatedLastWeekStart.setDate(calculatedThisWeekStart.getDate() - 7);

    const calculatedLastWeekEnd = new Date(calculatedLastWeekStart);
    calculatedLastWeekEnd.setDate(calculatedLastWeekStart.getDate() + 6);

    switch (label) {
      case "Today":
        return (
          startStr === formatDateString(today) &&
          endStr === formatDateString(today)
        );
      case "Yesterday":
        return (
          startStr === formatDateString(yesterday) &&
          endStr === formatDateString(yesterday)
        );
      case "Last Week":
        return (
          startStr === formatDateString(calculatedLastWeekStart) &&
          endStr === formatDateString(calculatedLastWeekEnd)
        );
      case "This Week":
        return (
          startStr === formatDateString(calculatedThisWeekStart) &&
          endStr === formatDateString(today)
        );
      case "This Month":
        return (
          startStr === formatDateString(thisMonthStart) &&
          endStr === formatDateString(today)
        );
      case "Last Month":
        return (
          startStr === formatDateString(lastMonthStart) &&
          endStr === formatDateString(lastMonthEnd)
        );
      default:
        return false;
    }
  };

  const SelectorDropdown = ({
    show,
    items,
    onSelect,
    current,
  }: {
    show: boolean;
    items: unknown[];
    onSelect: (item: unknown) => void;
    current: unknown;
  }) =>
    show && (
      <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-lg z-10 w-full min-w-[100px]">
        <ScrollArea className="h-48">
          <div className="p-1">
            {items.map((item, index) => (
              <Button
                key={typeof item === "string" ? item : String(item)}
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start font-normal h-8 px-2",
                  (typeof item === "string"
                    ? index === current
                    : item === current) && "bg-accent text-accent-foreground"
                )}
                onClick={() => onSelect(typeof item === "string" ? index : item)}
              >
                {typeof item === "string" ? item : String(item)}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
    );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-normal cursor-pointer w-full"
        >
          <Calendar className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {selectedStartDate && selectedEndDate
              ? `${formatDate(selectedStartDate, startTime)} - ${formatDate(
                selectedEndDate,
                endTime
              )}`
              : title}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent ref={popoverRef} className="w-auto p-0 z-[9999]" align="start">
        <div className="flex">
          <div className="border-r p-3 w-36">
            <div className="space-y-1">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  disabled={preset.disabled}
                  className={cn(
                    "w-full justify-start h-7 px-2 text-xs font-normal cursor-pointer",
                    isPresetActive(preset.label) &&
                    "bg-accent text-accent-foreground",
                    preset.disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={preset.action}
                >
                  {preset.label}
                  {preset.disabled && maxDays && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({maxDays}d)
                    </span>
                  )}
                </Button>
              ))}
            </div>
            {maxDays && (
              <div className="mt-4 p-2 text-xs text-muted-foreground border-t">
                Maximum selection: {maxDays} days
              </div>
            )}
          </div>

          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() - 1
                    )
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-semibold px-1 h-7 text-xs cursor-pointer"
                    onClick={() => setShowMonthSelector(!showMonthSelector)}
                  >
                    {months[currentMonth.getMonth()]}{" "}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                  <SelectorDropdown
                    show={showMonthSelector}
                    items={months}
                    onSelect={handleMonthChange}
                    current={currentMonth.getMonth()}
                  />
                </div>

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-semibold px-1 h-7 text-xs cursor-pointer"
                    onClick={() => setShowYearSelector(!showYearSelector)}
                  >
                    {currentMonth.getFullYear()}{" "}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                  <SelectorDropdown
                    show={showYearSelector}
                    items={years}
                    onSelect={handleYearChange}
                    current={currentMonth.getFullYear()}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() + 1
                    )
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] font-medium text-muted-foreground py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((date, index) => {
                const isCurrentMonth =
                  date.getMonth() === currentMonth.getMonth();
                const isSelected = isDateSelected(date);
                const inRange = isDateInRange(date);
                const disabled = isDateDisabled(date);

                return (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => handleDateClick(date)}
                    className={cn(
                      "h-7 w-7 p-0 text-xs font-normal cursor-pointer",
                      !isCurrentMonth && "text-muted-foreground opacity-50",
                      isSelected &&
                      "bg-primary hover:bg-primary hover:text-white text-white hover:scale-105",
                      inRange &&
                      !isSelected &&
                      "bg-[#dbeafe] text-accent-foreground",
                      disabled &&
                      "opacity-30 cursor-not-allowed hover:bg-transparent"
                    )}
                  >
                    {date.getDate()}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {showTime && (
          <div className="flex items-center gap-4 px-4 pb-4 border-t pt-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="start-time" className="text-xs">
                Start Time ({formatTo12Hr(startTime)})
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setError(null);
                }}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch (err) { }
                }}
                className="h-7 text-xs cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="end-time" className="text-xs">
                End Time ({formatTo12Hr(endTime)})
              </Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setError(null);
                }}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch (err) { }
                }}
                className="h-7 text-xs cursor-pointer"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-t">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="cursor-pointer"
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button size="sm" className="cursor-pointer text-white" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeFilter;

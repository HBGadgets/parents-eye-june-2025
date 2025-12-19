import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DateRangeFilterProps = {
  onDateRangeChange?: (start: Date | null, end: Date | null) => void;
  title?: string;
  maxDays?: number; // New prop for maximum days limit
};

const cn = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(" ");

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  onDateRangeChange,
  title = "Select Date Range",
  maxDays, // New prop
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showYearSelector, setShowYearSelector] = useState<boolean>(false);
  const [showMonthSelector, setShowMonthSelector] = useState<boolean>(false);

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

  // Helper function to check if a date should be disabled due to max limit
  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Strip time

    // Disable if date is in the future
    if (date > today) return true;

    // Existing maxDays logic
    if (!maxDays || !selectedStartDate || selectedEndDate) return false;

    const daysDiff = getDaysBetween(selectedStartDate, date);
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

  const formatDate = (date: Date): string =>
    `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return; // Prevent clicking disabled dates

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(date);
      setSelectedEndDate(null);
    } else {
      if (date < selectedStartDate) {
        setSelectedStartDate(date);
        setSelectedEndDate(selectedStartDate);
      } else {
        // Check if the range exceeds max days limit
        if (maxDays && getDaysBetween(selectedStartDate, date) > maxDays) {
          // Set end date to maximum allowed
          const maxEnd = getMaxEndDate(selectedStartDate);
          setSelectedEndDate(maxEnd);
        } else {
          setSelectedEndDate(date);
        }
      }
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
    let start = selectedStartDate,
      end = selectedEndDate;

    if (selectedStartDate && !selectedEndDate)
      end = new Date(selectedStartDate);
    else if (selectedEndDate && !selectedStartDate)
      start = new Date(selectedEndDate);

    if (start) {
      start = new Date(start);
      start.setHours(0, 1, 1, 0);
    }
    if (end) {
      end = new Date(end);
      end.setHours(23, 59, 59, 999);
    }

    onDateRangeChange?.(start, end);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
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

        if (maxDays && daysDiff > maxDays) {
          // Adjust end date to respect max limit
          const adjustedEnd = getMaxEndDate(startDate);
          setSelectedStartDate(startDate);
          setSelectedEndDate(adjustedEnd);
        } else {
          setSelectedStartDate(startDate);
          setSelectedEndDate(endDate);
        }
        if (updateMonth) setCurrentMonth(startDate);
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
      <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={typeof item === "string" ? item : item}
            className={cn(
              "w-full px-3 py-1 text-sm hover:bg-gray-100 text-left",
              (typeof item === "string"
                ? index === current
                : item === current) && "bg-blue-50 text-blue-600"
            )}
            onClick={() => onSelect(typeof item === "string" ? index : item)}
          >
            {typeof item === "string" ? item : item}
          </button>
        ))}
      </div>
    );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-normal"
        >
          <Calendar className="mr-2 h-4 w-4" />
          {selectedStartDate && selectedEndDate
            ? `${formatDate(selectedStartDate)} - ${formatDate(
                selectedEndDate
              )}`
            : title}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
        <div className="flex">
          <div className="border-r p-4 w-48">
            <div className="space-y-1">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  disabled={preset.disabled}
                  className={cn(
                    "w-full justify-start h-8 px-2 font-normal",
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

          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
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
                    className="font-semibold px-2 h-auto"
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
                    className="font-semibold px-2 h-auto"
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
                  className="text-center text-sm font-medium text-muted-foreground py-2"
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
                      "h-8 w-8 p-0 font-normal",
                      !isCurrentMonth && "text-muted-foreground opacity-50",
                      isSelected &&
                        "bg-primary hover:bg-primary hover:text-primary-foreground",
                      inRange &&
                        !isSelected &&
                        "bg-[#FFE58A] text-accent-foreground",
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

        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeFilter;

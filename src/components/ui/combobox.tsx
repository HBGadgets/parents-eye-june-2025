"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface ComboboxItem {
  value: string;
  label: string;
}

interface ComboboxProps {
  items: ComboboxItem[];
  value?: string;
  onValueChange?: (value?: string) => void;

  // Multi-select props
  multiple?: boolean;
  selectedValues?: string[];
  onSelectedValuesChange?: (values: string[]) => void;

  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  width?: string;
  disabled?: boolean;
  onReachEnd?: () => void;
  isLoadingMore?: boolean;
  onSearchChange?: (search: string) => void;
  searchValue?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  // Multi-select display options
  showBadges?: boolean;
  maxBadges?: number;
  closeOnSelect?: boolean;

  // Select All option
  showSelectAll?: boolean;
  selectAllLabel?: string;
}

export function Combobox({
  items,
  value: controlledValue,
  onValueChange,

  // Multi-select
  multiple = false,
  selectedValues: controlledSelectedValues,
  onSelectedValuesChange,

  placeholder = "Select item...",
  searchPlaceholder = "Search...",
  emptyMessage = "No item found.",
  className,
  width = "w-[200px]",
  disabled = false,
  onReachEnd,
  isLoadingMore = false,
  onSearchChange,
  searchValue,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,

  showBadges = true,
  maxBadges = 2,
  closeOnSelect,

  // Select All
  showSelectAll = true,
  selectAllLabel = "Select All",
}: ComboboxProps) {
  // Internal state for uncontrolled mode
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState<string | undefined>(
    undefined
  );
  const [internalSelectedValues, setInternalSelectedValues] = React.useState<
    string[]
  >([]);
  const [internalSearchValue, setInternalSearchValue] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  // Determine if component is controlled for value
  const isValueControlled = onValueChange !== undefined;
  const value = isValueControlled ? controlledValue : internalValue;

  // Determine if component is controlled for multi-select
  const isMultiValueControlled = onSelectedValuesChange !== undefined;
  const selectedValues = isMultiValueControlled
    ? controlledSelectedValues || []
    : internalSelectedValues;

  // Determine if component is controlled for open state
  const isOpenControlled = controlledOnOpenChange !== undefined;
  const open = isOpenControlled ? controlledOpen : internalOpen;

  // Default closeOnSelect behavior
  const shouldCloseOnSelect = closeOnSelect ?? !multiple;

  const setValue = React.useCallback(
    (newValue?: string) => {
      console.log("🎯 Combobox setValue called with:", newValue);
      console.log("🎯 Is controlled:", isValueControlled);

      if (isValueControlled && onValueChange) {
        onValueChange(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [isValueControlled, onValueChange]
  );

  const setSelectedValues = React.useCallback(
    (newValues: string[]) => {
      console.log("🎯 Combobox setSelectedValues called with:", newValues);
      console.log("🎯 Is multi controlled:", isMultiValueControlled);

      if (isMultiValueControlled && onSelectedValuesChange) {
        onSelectedValuesChange(newValues);
      } else {
        setInternalSelectedValues(newValues);
      }
    },
    [isMultiValueControlled, onSelectedValuesChange]
  );

  // Handle open state changes
  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      console.log("🚪 Combobox setOpen called with:", newOpen);
      console.log("🚪 Is open controlled:", isOpenControlled);

      if (isOpenControlled && controlledOnOpenChange) {
        controlledOnOpenChange(newOpen);
      } else {
        setInternalOpen(newOpen);
      }
    },
    [isOpenControlled, controlledOnOpenChange]
  );

  const currentSearchValue =
    searchValue !== undefined ? searchValue : internalSearchValue;
  const setSearchValue =
    searchValue !== undefined
      ? onSearchChange || (() => {})
      : setInternalSearchValue;

  // Single select handler
  const handleSingleSelect = React.useCallback(
    (currentValue: string) => {
      console.log("🖱️ Combobox handleSingleSelect:", currentValue);
      const newValue = currentValue === value ? undefined : currentValue;
      setValue(newValue);

      if (shouldCloseOnSelect) {
        setOpen(false);
      }
    },
    [value, setValue, setOpen, shouldCloseOnSelect]
  );

  // Multi select handler
  const handleMultiSelect = React.useCallback(
    (currentValue: string) => {
      console.log("🖱️ Combobox handleMultiSelect:", currentValue);

      const newValues = selectedValues.includes(currentValue)
        ? selectedValues.filter((v) => v !== currentValue)
        : [...selectedValues, currentValue];

      setSelectedValues(newValues);

      if (shouldCloseOnSelect) {
        setOpen(false);
      }
    },
    [selectedValues, setSelectedValues, setOpen, shouldCloseOnSelect]
  );

  const handleSelect = multiple ? handleMultiSelect : handleSingleSelect;

  // Select All / Deselect All handler
  const handleSelectAll = React.useCallback(() => {
    if (!multiple) return;

    const allSelected = selectedValues.length === items.length;

    if (allSelected) {
      // Deselect all
      setSelectedValues([]);
    } else {
      // Select all
      const allValues = items.map((item) => item.value);
      setSelectedValues(allValues);
    }
  }, [multiple, selectedValues.length, items, setSelectedValues]);

  // Check if all items are selected
  const isAllSelected =
    multiple && items.length > 0 && selectedValues.length === items.length;
  const isSomeSelected =
    multiple &&
    selectedValues.length > 0 &&
    selectedValues.length < items.length;

  // Remove badge handler for multi-select
  const handleRemoveBadge = React.useCallback(
    (valueToRemove: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newValues = selectedValues.filter((v) => v !== valueToRemove);
      setSelectedValues(newValues);
    },
    [selectedValues, setSelectedValues]
  );

  // Get display text for button
  const getDisplayText = React.useCallback(() => {
    if (multiple) {
      if (selectedValues.length === 0) return placeholder;

      if (isAllSelected) return `All selected (${items.length})`;

      if (!showBadges) {
        return `${selectedValues.length} selected`;
      }

      return null; // Will show badges instead
    } else {
      const selectedItem = items.find((item) => item.value === value);
      return selectedItem ? selectedItem.label : placeholder;
    }
  }, [
    multiple,
    selectedValues,
    value,
    items,
    placeholder,
    showBadges,
    isAllSelected,
  ]);

  // Get visible badges
  const visibleBadges = React.useMemo(() => {
    if (!multiple || !showBadges || selectedValues.length === 0) return [];

    if (isAllSelected) return []; // Show text instead

    const selectedItems = selectedValues
      .map((val) => items.find((item) => item.value === val))
      .filter(Boolean) as ComboboxItem[];

    return selectedItems.slice(0, maxBadges);
  }, [multiple, showBadges, selectedValues, items, maxBadges, isAllSelected]);

  const remainingCount =
    multiple && selectedValues.length > maxBadges && !isAllSelected
      ? selectedValues.length - maxBadges
      : 0;

  // Improved scroll handler
  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!onReachEnd) return;

      const target = e.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = target;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage >= 0.8 && !isLoadingMore) {
        console.log("🔄 Scroll triggered at", scrollPercentage.toFixed(2));
        onReachEnd();
      }
    },
    [onReachEnd, isLoadingMore]
  );

  // IntersectionObserver for scroll detection
  React.useEffect(() => {
    if (!sentinelRef.current || !onReachEnd || !open) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore) {
          console.log("👁️ Intersection triggered");
          onReachEnd();
        }
      },
      {
        root: scrollRef.current,
        threshold: 1.0,
        rootMargin: "50px",
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onReachEnd, isLoadingMore, open, items.length]);

  const handleSearchValueChange = (search: string) => {
    setSearchValue(search);
  };

  // Reset search when dropdown closes
  React.useEffect(() => {
    if (!open && !onSearchChange) {
      setInternalSearchValue("");
    }
  }, [open, onSearchChange]);

  // Check if item is selected (works for both single and multi)
  const isSelected = React.useCallback(
    (itemValue: string) => {
      if (multiple) {
        return selectedValues.includes(itemValue);
      }
      return value === itemValue;
    },
    [multiple, selectedValues, value]
  );

  const displayText = getDisplayText();

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            width,
            "justify-between overflow-hidden",
            multiple &&
              showBadges &&
              selectedValues.length > 0 &&
              !isAllSelected
              ? "h-auto min-h-10 py-2"
              : "",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
            {multiple &&
            showBadges &&
            visibleBadges.length > 0 &&
            !isAllSelected ? (
              <>
                {visibleBadges.map((item) => (
                  <Badge
                    key={item.value}
                    variant="secondary"
                    className="mr-1 cursor-pointer hover:bg-secondary/80"
                  >
                    {item.label}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRemoveBadge(item.value, e as any);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => handleRemoveBadge(item.value, e)}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))}
                {remainingCount > 0 && (
                  <Badge variant="secondary" className="mr-1">
                    +{remainingCount} more
                  </Badge>
                )}
              </>
            ) : (
              <span className="truncate">{displayText}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(width, "p-0")}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        side="bottom"
        align="start"
        sideOffset={5}
        avoidCollisions={true}
        collisionPadding={10}
      >
        <Command
          filter={(value, search) => {
            if (onSearchChange) return 1;

            const item = items.find((item) => item.value === value);
            if (!item) return 0;

            const searchLower = search?.toLowerCase();
            const labelMatch = item.label?.toLowerCase()?.includes(searchLower);
            const valueMatch = item.value?.toLowerCase()?.includes(searchLower);

            return labelMatch || valueMatch ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9"
            value={currentSearchValue}
            onValueChange={handleSearchValueChange}
          />
          <CommandList
            ref={scrollRef}
            className="max-h-[300px] overflow-y-auto"
            onScroll={handleScroll}
          >
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {/* Select All Option */}
              {multiple && showSelectAll && items.length > 0 && (
                <>
                  <CommandItem
                    onSelect={handleSelectAll}
                    className="cursor-pointer font-medium"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isAllSelected
                          ? "bg-primary text-primary-foreground"
                          : isSomeSelected
                          ? "bg-primary/50 text-primary-foreground"
                          : "opacity-50"
                      )}
                    >
                      {isAllSelected && <Check className="h-4 w-4" />}
                      {isSomeSelected && !isAllSelected && (
                        <div className="h-2 w-2 bg-primary-foreground rounded-sm" />
                      )}
                    </div>
                    <span className="flex-1">
                      {isAllSelected ? "Deselect All" : selectAllLabel}
                      {selectedValues.length > 0 &&
                        ` (${selectedValues.length}/${items.length})`}
                    </span>
                  </CommandItem>
                  <Separator className="my-1" />
                </>
              )}

              {/* Regular Items */}
              {items.map((item, idx) => (
                <CommandItem
                  key={`${item.value}-${idx}`}
                  value={item.value}
                  onSelect={handleSelect}
                  className="cursor-pointer"
                >
                  {multiple && (
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected(item.value)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                  <span className="flex-1">{item.label}</span>
                  {!multiple && (
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        isSelected(item.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                  )}
                </CommandItem>
              ))}

              {items.length > 0 && <div ref={sentinelRef} className="h-1" />}

              {isLoadingMore && (
                <CommandItem
                  disabled
                  className="justify-center pointer-events-none"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Loading more...</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

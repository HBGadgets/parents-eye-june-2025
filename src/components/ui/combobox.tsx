"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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

export interface ComboboxItem {
  value: string;
  label: string;
}

interface ComboboxProps {
  items: ComboboxItem[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  width?: string;
  disabled?: boolean;
  infiniteScroll?: boolean;
  limit?: number;
  onReachEnd?: () => void;
  isLoadingMore?: boolean;
  onSearchChange?: (search: string) => void; // New prop for search handling
  searchValue?: string; // New prop to control search value
}

export function Combobox({
  items,
  value: controlledValue,
  onValueChange,
  placeholder = "Select item...",
  searchPlaceholder = "Search...",
  emptyMessage = "No item found.",
  className,
  width = "w-[200px]",
  disabled = false,
  infiniteScroll = false,
  limit = 20,
  onReachEnd,
  isLoadingMore = false,
  onSearchChange, // New prop
  searchValue, // New prop
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(limit);
  const [internalSearchValue, setInternalSearchValue] = React.useState("");

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue =
    controlledValue !== undefined
      ? onValueChange || (() => {})
      : setInternalValue;

  // Use controlled search value if provided, otherwise use internal state
  const currentSearchValue = searchValue !== undefined ? searchValue : internalSearchValue;
  const setSearchValue = searchValue !== undefined 
    ? (onSearchChange || (() => {}))
    : setInternalSearchValue;

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === value ? "" : currentValue;
    setValue(newValue);
    setOpen(false);
  };

  const selectedItem = items.find((item) => item.value === value);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!infiniteScroll) return;

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      if (visibleCount < items.length) {
        setVisibleCount((prev) => prev + limit);
      }
      if (onReachEnd) onReachEnd();
    }
  };

  const handleSearchValueChange = (search: string) => {
    setSearchValue(search);
    // Reset visible count when search changes
    if (infiniteScroll) {
      setVisibleCount(limit);
    }
  };

  const renderItems = infiniteScroll ? items.slice(0, visibleCount) : items;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(width, "justify-between", className)}
        >
          {selectedItem ? selectedItem.label : placeholder}
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
            // If we're using server-side search, don't filter here
            if (onSearchChange) return 1;
            
            const item = items.find((item) => item.value === value);
            if (!item) return 0;

            const searchLower = search.toLowerCase();
            const labelMatch = item.label.toLowerCase().includes(searchLower);
            const valueMatch = item.value.toLowerCase().includes(searchLower);

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
            className="max-h-[200px] overflow-y-auto"
            onScroll={handleScroll}
          >
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {renderItems.map((item, idx) => (
                <CommandItem
                  key={`${item.value}-${idx}`}
                  value={item.value}
                  onSelect={handleSelect}
                  className="cursor-pointer"
                >
                  {item.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
              {/* Show loading indicator when fetching more data */}
              {isLoadingMore && (
                <CommandItem className="justify-center">
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
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
  onReachEnd?: () => void;
  isLoadingMore?: boolean;
  onSearchChange?: (search: string) => void;
  searchValue?: string;
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
  onReachEnd,
  isLoadingMore = false,
  onSearchChange,
  searchValue,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState("");
  const [internalSearchValue, setInternalSearchValue] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue =
    controlledValue !== undefined
      ? onValueChange || (() => {})
      : setInternalValue;

  const currentSearchValue =
    searchValue !== undefined ? searchValue : internalSearchValue;
  const setSearchValue =
    searchValue !== undefined
      ? onSearchChange || (() => {})
      : setInternalSearchValue;

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === value ? "" : currentValue;
    setValue(newValue);
    setOpen(false);
  };

  const selectedItem = items.find((item) => item.value === value);

  // Improved scroll handler
  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!onReachEnd) return;

      const target = e.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = target;

      // Calculate scroll percentage
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      // Trigger at 80% scroll
      if (scrollPercentage >= 0.8 && !isLoadingMore) {
        console.log("🔄 Scroll triggered at", scrollPercentage.toFixed(2));
        onReachEnd();
      }
    },
    [onReachEnd, isLoadingMore]
  );

  // IntersectionObserver as backup for scroll detection
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
            "justify-between overflow-hidden text-ellipsis whitespace-nowrap",
            className
          )}
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
            // Server-side filtering when onSearchChange is provided
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
            ref={scrollRef}
            className="max-h-[300px] overflow-y-auto"
            onScroll={handleScroll}
          >
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {items.map((item, idx) => (
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

              {/* Sentinel div for IntersectionObserver */}
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

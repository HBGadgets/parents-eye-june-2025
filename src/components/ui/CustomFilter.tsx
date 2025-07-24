"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
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

type DataItem = Record<string, any> | string | number;

interface FilterState {
  [field: string]: string;
}

interface CustomFilterProps {
  data: DataItem[];
  filterFields: string[]; // Now supports multiple fields
  onFilter: (filtered: any[]) => void;
  originalData?: DataItem[]; // Pass the original unfiltered data
  placeholder?: string | ((field: string) => string); // Can be string or function
  className?: string;
  valueFormatter?: (value: any) => string;
  booleanToLable?: (value: any) => string;
  trueValue?: string;
  falseValue?: string;
}

export const CustomFilter: React.FC<CustomFilterProps> = ({
  data,
  filterFields,
  onFilter,
  originalData,
  placeholder,
  valueFormatter,
  booleanToLable,
  trueValue,
  falseValue,
  className = "w-[200px]",
}) => {
  const [selectedFilters, setSelectedFilters] = React.useState<FilterState>({});
  const [openPopover, setOpenPopover] = React.useState<string | null>(null);

  // Use original data if provided, otherwise use current data
  const sourceData = originalData || data;

  // Get unique values for each field based on currently filtered data
  const getUniqueValuesForField = React.useCallback(
    (field: string): string[] => {
      // For nested filtering, use data that's already been filtered by other fields
      let dataToUse = sourceData;

      // Apply all filters except the current field to get available options
      const otherFilters = Object.entries(selectedFilters).filter(
        ([key]) => key !== field
      );

      if (otherFilters.length > 0) {
        dataToUse = sourceData.filter((item) => {
          return otherFilters.every(([filterField, filterValue]) => {
            if (typeof item === "object" && item !== null) {
              const val = item[filterField];
              return (
                val?.toString().toLowerCase() === filterValue.toLowerCase()
              );
            }
            return true;
          });
        });
      }

      const values = dataToUse
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            const rawValue = item[field];
            return valueFormatter
              ? valueFormatter(rawValue)
              : rawValue?.toString();
          }
          return undefined;
        })
        .filter(Boolean) as string[];

      return Array.from(new Set(values)).sort();
    },
    [sourceData, selectedFilters, valueFormatter]
  );

  // Apply nested filtering
  const applyNestedFilter = React.useCallback(
    (filters: FilterState) => {
      if (Object.keys(filters).length === 0) {
        onFilter(sourceData); // Reset to original data if no filters
        return;
      }
      const filtered = sourceData.filter((item) => {
        if (typeof item === "object" && item !== null) {
          return Object.entries(filters).every(([field, value]) => {
            let actualValue = item[field];

            // Handle boolean-to-label mapping
            if (field === `${booleanToLable}`) {
              const formatted = actualValue ? `${trueValue}` : `${falseValue}`;
              return formatted.toLowerCase() === value.toLowerCase();
            }

            return (
              actualValue?.toString().toLowerCase() === value.toLowerCase()
            );
          });
        }
        return true;
      });

      onFilter(filtered);
    },
    [sourceData, onFilter]
  );

  // Apply filters whenever selectedFilters changes
  React.useEffect(() => {
    applyNestedFilter(selectedFilters);
  }, [selectedFilters, applyNestedFilter]);

  // Handle filter selection
  const handleSelect = React.useCallback((field: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setOpenPopover(null);
  }, []);

  // Handle clearing a specific filter
  const handleClearField = React.useCallback((field: string) => {
    setSelectedFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
    setOpenPopover(null);
  }, []);

  // Get placeholder text for a field
  const getPlaceholder = React.useCallback(
    (field: string): string => {
      if (typeof placeholder === "function") {
        return placeholder(field);
      }
      return placeholder || `Filter by ${field}`;
    },
    [placeholder]
  );

  return (
    <div className="flex flex-wrap gap-2">
      {filterFields.map((field) => {
        const uniqueValues = getUniqueValuesForField(field);
        const selectedValue = selectedFilters[field];
        const isOpen = openPopover === field;

        return (
          <Popover
            key={field}
            open={isOpen}
            onOpenChange={(open) => setOpenPopover(open ? field : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className={cn("justify-between", className)}
              >
                {selectedValue || getPlaceholder(field)}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className={cn("p-0", className)}>
              <Command>
                <CommandInput placeholder={`Search ${field}...`} />
                <CommandList>
                  <CommandEmpty>No value found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__clear__"
                      className="text-red-600"
                      onSelect={() => handleClearField(field)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Filter
                    </CommandItem>

                    {uniqueValues.map((val) => (
                      <CommandItem
                        key={val}
                        value={val}
                        onSelect={() => handleSelect(field, val)}
                      >
                        {val}
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            selectedValue === val ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
};

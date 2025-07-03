"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Option = {
  label: string;
  value: string;
};

type SearchableSelectProps = {
  options: Option[];
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
};

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  className = "w-[200px]",
  allowClear = true,
}) => {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (val: string) => {
    if (val === "__clear__") {
      onChange?.(undefined);
    } else {
      onChange?.(val);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("justify-between", className)}
        >
          {selectedOption?.label || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className={cn("p-0", className)}>
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => handleSelect("__clear__")}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Selection
                </CommandItem>
              )}

              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => handleSelect(opt.value)}
                >
                  {opt.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
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
};

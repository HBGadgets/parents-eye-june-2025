import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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

export interface DropdownItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SearchableDropdownProps<T = DropdownItem> {
  items: T[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onSelect?: (item: T) => void;
  value?: string;
  className?: string;
  valueKey?: keyof T;
  labelKey?: keyof T;
  iconKey?: keyof T;
}

export function SearchableDropdown<T = DropdownItem>({
  items,
  placeholder = "Select item...",
  searchPlaceholder = "Search items...",
  emptyMessage = "No items found.",
  onSelect,
  value,
  className,
  valueKey = "value" as keyof T,
  labelKey = "label" as keyof T,
  iconKey = "icon" as keyof T,
}: SearchableDropdownProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(value || "");

  // 🆕 Add this useEffect to sync with external value changes
  React.useEffect(() => {
    setSelectedValue(value || "");
  }, [value]);

  const getItemValue = (item: T) => String(item[valueKey]);
  const getItemLabel = (item: T) => String(item[labelKey]);
  const getItemIcon = (item: T) => item[iconKey] as React.ReactNode;

  const selectedItem = items.find(
    (item) => getItemValue(item) === selectedValue
  );

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === selectedValue ? "" : currentValue;
    setSelectedValue(newValue);
    setOpen(false);

    const item = items.find((item) => getItemValue(item) === currentValue);
    if (item && onSelect) {
      onSelect(item);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-background hover:bg-accent transition-all duration-200",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedItem ? getItemIcon(selectedItem) : null}
            {selectedValue
              ? selectedItem
                ? getItemLabel(selectedItem)
                : selectedValue
              : placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border shadow-lg">
        <Command>
          <div className="flex items-center border-b px-3">
            {/* <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" /> */}
            <CommandInput
              placeholder={searchPlaceholder}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={getItemValue(item)}
                  value={`${getItemValue(item)} ${getItemLabel(item)}`}
                  onSelect={(value) => handleSelect(value.split(" ")[0])}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
                >
                  {getItemIcon(item)}
                  <span className="flex-1 truncate">{getItemLabel(item)}</span>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedValue === getItemValue(item)
                        ? "opacity-100"
                        : "opacity-0"
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
}

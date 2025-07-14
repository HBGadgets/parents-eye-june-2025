"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ColumnSelectorProps<TData, TValue> {
  columns: (ColumnDef<TData, TValue> | false | null | undefined)[];
  selectedColumns: string[];
  onColumnsChange: (columns: string[]) => void;
  className?: string;
}

export function ColumnSelector<TData, TValue>({
  columns,
  selectedColumns,
  onColumnsChange,
  className,
}: ColumnSelectorProps<TData, TValue>) {
  // Filter out falsy columns and extract valid column definitions
  const validColumns = React.useMemo(() => {
    return columns
      .filter((col): col is ColumnDef<TData, TValue> => Boolean(col))
      .map((col, index) => ({
        id: col.id || `column-${index}`,
        header:
          typeof col.header === "string" ? col.header : `Column ${index + 1}`,
        column: col,
      }));
  }, [columns]);

  const handleColumnToggle = (columnId: string, checked: boolean) => {
    if (checked) {
      onColumnsChange([...selectedColumns, columnId]);
    } else {
      onColumnsChange(selectedColumns.filter((id) => id !== columnId));
    }
  };

  const handleSelectAll = () => {
    const allColumnIds = validColumns.map((col) => col.id);
    onColumnsChange(allColumnIds);
  };

  const handleDeselectAll = () => {
    onColumnsChange([]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("ml-auto hidden h-8 lg:flex", className)}
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Columns
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="end">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-sm">Toggle columns</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleSelectAll}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleDeselectAll}
              >
                None
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {validColumns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={selectedColumns.includes(column.id)}
                  onCheckedChange={(checked) =>
                    handleColumnToggle(column.id, !!checked)
                  }
                />
                <label
                  htmlFor={column.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {column.header}
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {selectedColumns.length} of {validColumns.length} columns selected
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

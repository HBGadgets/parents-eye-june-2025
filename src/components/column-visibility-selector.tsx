import { useState } from "react";
import { Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, Eye, EyeOff } from "lucide-react";

interface ColumnVisibilitySelectorProps<TData> {
  columns: Column<TData, unknown>[];
  className?: string;
  buttonVariant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  buttonSize?: "default" | "sm" | "lg" | "icon";
}

export function ColumnVisibilitySelector<TData>({
  columns,
  className = "",
  buttonVariant = "outline",
  buttonSize = "default",
}: ColumnVisibilitySelectorProps<TData>) {
  const [open, setOpen] = useState(false);

  // Get all columns that can be toggled (exclude columns without headers or that are always visible)
  const toggleableColumns = columns.filter(
    (column) =>
      column.getCanHide() &&
      column.columnDef.header &&
      typeof column.columnDef.header === "string"
  );

  const handleToggleAll = () => {
    const allVisible = toggleableColumns.every((column) =>
      column.getIsVisible()
    );
    toggleableColumns.forEach((column) => {
      column.toggleVisibility(!allVisible);
    });
  };

  const visibleCount = toggleableColumns.filter((column) =>
    column.getIsVisible()
  ).length;
  const totalCount = toggleableColumns.length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={className}>
          <Settings2 className="h-4 w-4" />
          <span className="ml-2">
            Columns ({visibleCount}/{totalCount})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Toggle Columns</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleAll}
            className="h-auto p-1"
          >
            {visibleCount === totalCount ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {toggleableColumns.map((column) => {
          const isVisible = column.getIsVisible();
          const columnHeader = column.columnDef.header as string;

          return (
            <DropdownMenuItem
              key={column.id}
              className="flex items-center space-x-2 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                column.toggleVisibility();
              }}
            >
              <Checkbox
                checked={isVisible}
                onCheckedChange={() => column.toggleVisibility()}
                className="pointer-events-none"
              />
              <span className="flex-1">{columnHeader}</span>
              {isVisible ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </DropdownMenuItem>
          );
        })}

        {toggleableColumns.length === 0 && (
          <DropdownMenuItem disabled>
            No toggleable columns available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Optional: Export a hook for programmatic column visibility management
export function useColumnVisibility<TData>(columns: Column<TData, unknown>[]) {
  const toggleableColumns = columns.filter(
    (column) =>
      column.getCanHide() &&
      column.columnDef.header &&
      typeof column.columnDef.header === "string"
  );

  const showAll = () => {
    toggleableColumns.forEach((column) => column.toggleVisibility(true));
  };

  const hideAll = () => {
    toggleableColumns.forEach((column) => column.toggleVisibility(false));
  };

  const toggleColumn = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId);
    if (column && column.getCanHide()) {
      column.toggleVisibility();
    }
  };

  const getVisibilityState = () => {
    return toggleableColumns.reduce((acc, column) => {
      acc[column.id] = column.getIsVisible();
      return acc;
    }, {} as Record<string, boolean>);
  };

  return {
    showAll,
    hideAll,
    toggleColumn,
    getVisibilityState,
    toggleableColumns,
  };
}

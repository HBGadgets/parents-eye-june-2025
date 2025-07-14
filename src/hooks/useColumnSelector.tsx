"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

interface UseColumnSelectorProps<TData, TValue> {
  columns: (ColumnDef<TData, TValue> | false | null | undefined)[];
  defaultSelected?: string[];
}

export function useColumnSelector<TData, TValue>({
  columns,
  defaultSelected = [],
}: UseColumnSelectorProps<TData, TValue>) {
  // Filter out falsy columns and create column map
  const validColumns = React.useMemo(() => {
    return columns
      .filter((col): col is ColumnDef<TData, TValue> => Boolean(col))
      .map((col, index) => ({
        id: col.id || `column-${index}`,
        column: col,
      }));
  }, [columns]);

  // Initialize selected columns
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(() => {
    if (defaultSelected.length > 0) {
      return defaultSelected;
    }
    // Default to all columns selected
    return validColumns.map((col) => col.id);
  });

  // Get filtered columns based on selection
  const filteredColumns = React.useMemo(() => {
    return validColumns
      .filter((col) => selectedColumns.includes(col.id))
      .map((col) => col.column);
  }, [validColumns, selectedColumns]);

  return {
    selectedColumns,
    setSelectedColumns,
    filteredColumns,
    validColumns: validColumns.map((col) => col.column),
  };
}

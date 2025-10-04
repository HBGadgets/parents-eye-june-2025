import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

// Re-export types for convenience
export type { ColumnDef, SortingState };

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

// Main props interface
export interface TravelTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  totalCount: number;
  loading?: boolean; // keep prop for compatibility, but won’t use loader
  onSortingChange?: (sorting: SortingState) => void;
  sorting?: SortingState;
  emptyMessage?: string;
  enableSorting?: boolean;
  manualSorting?: boolean;
  showSerialNumber?: boolean;
  serialNumberHeader?: string;
  maxHeight?: string;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
}

export function TravelTable<T extends Record<string, unknown>>({
  data,
  columns,
  // totalCount,
  // loading = false, // no effect now
  onSortingChange,
  sorting = [],
  emptyMessage = "No travel data available",
  enableSorting = true,
  manualSorting = true,
  showSerialNumber = true,
  serialNumberHeader = "SN",
  maxHeight = "500px",
  columnVisibility,
  onColumnVisibilityChange,
}: TravelTableProps<T>) {
  // Serial number column
  const serialNumberColumn: ColumnDef<T> = {
    id: "serialNumber",
    header: serialNumberHeader,
    cell: ({ row }) => {
      return <div className="text-center font-medium">{row.index + 1}</div>;
    },
    enableSorting: false,
    enableHiding: false,
    size: 60,
  };

  const [internalColumnVisibility, setInternalColumnVisibility] =
    useState<VisibilityState>({});

  // Controlled/uncontrolled column visibility
  const currentColumnVisibility = columnVisibility ?? internalColumnVisibility;
  const handleColumnVisibilityChange =
    onColumnVisibilityChange ?? setInternalColumnVisibility;

  // Merge serial number column
  const tableColumns = showSerialNumber
    ? [serialNumberColumn, ...columns]
    : columns;

  // Build react-table instance
  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting,
    enableSorting,
    state: {
      sorting,
      columnVisibility: currentColumnVisibility,
    },
    onSortingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
  });

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-y-auto" style={{ maxHeight }}>
          <Table>
            <TableHeader
              className="sticky top-0 z-10"
              style={{ backgroundColor: "#f3c623" }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-foreground px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium uppercase tracking-wider border-r last:border-r-0"
                      style={{
                        backgroundColor: "#f3c623",
                        width: header.id === "serialNumber" ? "60px" : "auto",
                        minWidth:
                          header.id === "serialNumber" ? "60px" : "auto",
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center justify-center gap-1 w-full ${
                            header.column.getCanSort()
                              ? "cursor-pointer select-none"
                              : ""
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span className="truncate">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {header.column.getCanSort() && (
                            <span className="ml-1">
                              {header.column.getIsSorted() === "desc" ? (
                                <ArrowDown className="h-4 w-4" />
                              ) : header.column.getIsSorted() === "asc" ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-b hover:bg-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm border-r last:border-r-0 text-center"
                        style={{
                          width:
                            cell.column.id === "serialNumber" ? "60px" : "auto",
                          minWidth:
                            cell.column.id === "serialNumber" ? "60px" : "auto",
                        }}
                      >
                        <div className="w-full">
                          <div className="break-words overflow-wrap-anywhere leading-relaxed">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </div>
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={tableColumns.length}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

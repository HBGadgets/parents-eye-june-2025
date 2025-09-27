import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Skeleton } from "./skeleton";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Button } from "./button";

// Re-export types for convenience
export type { ColumnDef, SortingState, PaginationState };

// Text wrapping options
export type TextWrapOption =
  | "wrap" // Normal text wrapping
  | "nowrap" // No wrapping (default)
  | "ellipsis" // Truncate with ellipsis
  | "break-word" // Break long words
  | "break-all"; // Break anywhere

export interface ColumnWrapConfig {
  wrap?: TextWrapOption;
  maxWidth?: string;
  minWidth?: string;
}

// Extend the meta property instead of the ColumnDef directly
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    wrapConfig?: ColumnWrapConfig;
  }
}

// Main props interface
export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[]; // Use standard ColumnDef
  pagination: PaginationState;
  totalCount: number;
  loading?: boolean;
  onPaginationChange: (pagination: PaginationState) => void;
  onSortingChange?: (sorting: SortingState) => void;
  sorting?: SortingState;
  emptyMessage?: string;
  pageSizeOptions?: number[];
  enableSorting?: boolean;
  manualSorting?: boolean;
  manualPagination?: boolean;
  showSerialNumber?: boolean;
  serialNumberHeader?: string;
  maxHeight?: string;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  onRowClick?: (row: T) => void;
  enableRowClick?: boolean;

  // New wrapping options
  defaultTextWrap?: TextWrapOption;
  enableColumnWrapping?: boolean;
}

export function CustomTableServerSidePagination<T extends Record<string, any>>({
  data,
  columns,
  pagination,
  totalCount,
  loading = false,
  onPaginationChange,
  onSortingChange,
  sorting = [],
  emptyMessage = "No data available",
  pageSizeOptions = [10, 20, 30, 40, 50],
  enableSorting = true,
  manualSorting = true,
  manualPagination = true,
  showSerialNumber = true,
  serialNumberHeader = "SN",
  maxHeight = "500px",
  columnVisibility,
  onColumnVisibilityChange,
  onRowClick,
  enableRowClick = true,
  defaultTextWrap = "nowrap",
  enableColumnWrapping = true,
}: DataTableProps<T>) {
  // Function to get wrapping classes based on wrap option
  const getWrapClasses = (wrapOption: TextWrapOption): string => {
    const baseClasses = "leading-relaxed";

    switch (wrapOption) {
      case "wrap":
        return `${baseClasses} whitespace-normal break-words`;
      case "nowrap":
        return `${baseClasses} whitespace-nowrap`;
      case "ellipsis":
        return `${baseClasses} whitespace-nowrap overflow-hidden text-ellipsis`;
      case "break-word":
        return `${baseClasses} whitespace-normal break-words overflow-wrap-anywhere`;
      case "break-all":
        return `${baseClasses} whitespace-normal break-all`;
      default:
        return `${baseClasses} whitespace-nowrap`;
    }
  };

  // Function to get inline styles for wrapping
  const getWrapStyles = (
    wrapConfig?: ColumnWrapConfig
  ): React.CSSProperties => {
    if (!wrapConfig) return {};

    return {
      maxWidth: wrapConfig.maxWidth,
      minWidth: wrapConfig.minWidth,
      width: wrapConfig.maxWidth || wrapConfig.minWidth,
    };
  };

  // Create serial number column
  const serialNumberColumn: ColumnDef<T> = {
    id: "serialNumber",
    header: serialNumberHeader,
    cell: ({ row }) => {
      const serialNumber =
        pagination.pageIndex * pagination.pageSize + row.index + 1;
      return <div className="text-center font-medium">{serialNumber}</div>;
    },
    enableSorting: false,
    enableHiding: false,
    size: 60,
    meta: {
      wrapConfig: { wrap: "nowrap" }, // Serial numbers should never wrap
    },
  };

  const [internalColumnVisibility, setInternalColumnVisibility] =
    useState<VisibilityState>({});

  // Use controlled visibility if provided, otherwise use internal state
  const currentColumnVisibility = columnVisibility ?? internalColumnVisibility;
  const handleColumnVisibilityChange =
    onColumnVisibilityChange ?? setInternalColumnVisibility;

  // Combine serial number column with user columns
  const tableColumns = showSerialNumber
    ? [serialNumberColumn, ...columns]
    : columns;

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting,
    manualPagination,
    enableSorting,
    state: {
      sorting,
      pagination,
      columnVisibility: currentColumnVisibility,
    },
    onSortingChange,
    onPaginationChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
  });

  const totalPages = Math.ceil(totalCount / pagination.pageSize);
  const hasNextPage = pagination.pageIndex < totalPages - 1;
  const hasPrevPage = pagination.pageIndex > 0;

  const goToPage = (pageIndex: number) => {
    onPaginationChange({
      ...pagination,
      pageIndex: Math.max(0, Math.min(pageIndex, totalPages - 1)),
    });
  };

  const changePageSize = (pageSize: string) => {
    onPaginationChange({
      pageIndex: 0,
      pageSize: parseInt(pageSize),
    });
  };

  // Helper function to check if a row is an expanded row
  const isExpandedRow = (rowData: any) => {
    return rowData.isLoading || rowData.isDetailTable || rowData.isEmpty;
  };

  // Row click handler
  const handleRowClick = (row: any, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const isInteractiveElement = target.closest(
      'button, a, input, select, [role="button"]'
    );

    if (isInteractiveElement) {
      return;
    }

    if (enableRowClick && onRowClick && !isExpandedRow(row.original)) {
      console.log("Row clicked:", row.original);
      onRowClick(row.original);
    }
  };

  return {
    table,
    tableElement: (
      <div className="space-y-4">
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-y-auto" style={{ maxHeight }}>
            <Table>
              <TableHeader className="sticky top-0 bg-[#f3c623] z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="bg-[#f3c623] text-foreground px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium uppercase tracking-wider border-r last:border-r-0"
                        style={{
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
              {loading ? (
                <TableBody>
                  {Array.from({ length: pagination.pageSize }).map(
                    (_, index) => (
                      <TableRow key={index}>
                        {tableColumns.map((_, colIndex) => (
                          <TableCell key={colIndex}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  )}
                </TableBody>
              ) : (
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => {
                      const rowData = row.original;
                      const isExpanded = isExpandedRow(rowData);

                      if (isExpanded) {
                        return (
                          <TableRow
                            key={row.id}
                            className="border-b hover:bg-muted/50"
                          >
                            <TableCell
                              colSpan={tableColumns.length}
                              className="p-0 border-r-0"
                            >
                              <div className="w-full">
                                {(() => {
                                  const vehicleNumberCell = row
                                    .getVisibleCells()
                                    .find(
                                      (cell) =>
                                        cell.column.id === "vehicleNumber"
                                    );
                                  if (vehicleNumberCell) {
                                    return flexRender(
                                      vehicleNumberCell.column.columnDef.cell,
                                      vehicleNumberCell.getContext()
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return (
                        <TableRow
                          key={row.id}
                          className={`border-b hover:bg-muted/50 ${
                            enableRowClick && onRowClick ? "cursor-pointer" : ""
                          }`}
                          onClick={(event) => handleRowClick(row, event)}
                        >
                          {row.getVisibleCells().map((cell) => {
                            // Get column-specific wrap config from meta
                            const wrapConfig = enableColumnWrapping
                              ? cell.column.columnDef.meta?.wrapConfig
                              : undefined;

                            const wrapOption =
                              wrapConfig?.wrap || defaultTextWrap;
                            const wrapClasses = getWrapClasses(wrapOption);
                            const wrapStyles = getWrapStyles(wrapConfig);

                            return (
                              <TableCell
                                key={cell.id}
                                className="px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm border-r last:border-r-0 text-center"
                                style={{
                                  width:
                                    cell.column.id === "serialNumber"
                                      ? "60px"
                                      : "auto",
                                  minWidth:
                                    cell.column.id === "serialNumber"
                                      ? "60px"
                                      : "auto",
                                  ...wrapStyles,
                                }}
                              >
                                <div className={`w-full ${wrapClasses}`}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
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
              )}
            </Table>
          </div>
        </div>

        {/* Pagination Controls remain the same */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>
              Showing {pagination.pageIndex * pagination.pageSize + 1} to{" "}
              {Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                totalCount
              )}{" "}
              of {totalCount} results
            </span>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
              <Select
                value={pagination.pageSize.toString()}
                onValueChange={changePageSize}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pagination.pageSize.toString()} />
                </SelectTrigger>
                <SelectContent side="top">
                  {pageSizeOptions.map((pageSize) => (
                    <SelectItem key={pageSize} value={pageSize.toString()}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {pagination.pageIndex + 1} of {Math.max(1, totalPages)}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(0)}
                  disabled={!hasPrevPage}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.pageIndex - 1)}
                  disabled={!hasPrevPage}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.pageIndex + 1)}
                  disabled={!hasNextPage}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages - 1)}
                  disabled={!hasNextPage}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  };
}

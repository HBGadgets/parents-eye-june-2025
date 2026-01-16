import React, { useState, useRef } from "react";
import { Checkbox } from "./checkbox";
import { useVirtualizer } from "@tanstack/react-virtual";

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

export type { ColumnDef, SortingState, PaginationState };

export type TextWrapOption =
  | "wrap"
  | "nowrap"
  | "ellipsis"
  | "break-word"
  | "break-all";

export interface ColumnWrapConfig {
  wrap?: TextWrapOption;
  maxWidth?: string;
  minWidth?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pagination: PaginationState;
  totalCount: number;
  loading?: boolean;
  onPaginationChange: (pagination: PaginationState) => void;
  onSortingChange?: (sorting: SortingState) => void;
  sorting?: SortingState;
  emptyMessage?: string;
  pageSizeOptions?: (number | string)[];
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

  defaultTextWrap?: TextWrapOption;
  enableColumnWrapping?: boolean;

  selectedRowId?: number | string | null;
  getRowId?: (row: T) => number | string;
  getRowClassName?: (row: T, isSelected: boolean) => string;
  selectedRowClassName?: string;

  enableMultiSelect?: boolean;

  enableVirtualization?: boolean;
  estimatedRowHeight?: number;
  overscan?: number;
}

export function CustomTableServerSidePagination<
  T extends Record<string, unknown>
>({
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
  maxHeight = "h-[full]",
  columnVisibility,
  onColumnVisibilityChange,
  onRowClick,
  enableRowClick = true,
  defaultTextWrap = "nowrap",
  enableColumnWrapping = true,
  selectedRowId = null,
  getRowId = (row: T) =>
    (row as any)._id ||
    (row as any).id ||
    (row as any).deviceId ||
    (row as any).key,
  enableMultiSelect = false,
  enableVirtualization = false,
  estimatedRowHeight = 50,
  overscan = 5,
}: DataTableProps<T>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

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

  const selectionColumn: ColumnDef<T> | null = enableMultiSelect
    ? {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 40,
        enableSorting: false,
      }
    : null;

  const serialNumberColumn: ColumnDef<T> = {
    id: "serialNumber",
    header: serialNumberHeader,
    cell: ({ row }) =>
      pagination.pageIndex * pagination.pageSize + row.index + 1,
    enableSorting: false,
    enableHiding: false,
    size: 60,
    meta: {
      wrapConfig: { wrap: "nowrap" },
    },
  };

  const [internalColumnVisibility, setInternalColumnVisibility] =
    useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const currentColumnVisibility = columnVisibility ?? internalColumnVisibility;
  const handleColumnVisibilityChange =
    onColumnVisibilityChange ?? setInternalColumnVisibility;

  const tableColumns: ColumnDef<T>[] = enableMultiSelect
    ? showSerialNumber
      ? [selectionColumn!, serialNumberColumn, ...columns]
      : [selectionColumn!, ...columns]
    : showSerialNumber
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
    enableRowSelection: enableMultiSelect,
    state: {
      sorting,
      pagination,
      columnVisibility: currentColumnVisibility,
      ...(enableMultiSelect ? { rowSelection } : {}),
    },
    onSortingChange,
    onPaginationChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: enableMultiSelect ? setRowSelection : undefined,
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

  const isExpandedRow = (rowData: any) => {
    return rowData?.isLoading || rowData?.isDetailTable || rowData?.isEmpty;
  };

  const handleRowClick = (row: any, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const isInteractiveElement = target.closest(
      'button, a, input, select, [role="button"]'
    );

    if (isInteractiveElement) return;

    if (enableRowClick && onRowClick && !isExpandedRow(row.original)) {
      onRowClick(row.original as T);
    }
  };

  const selectedRows = enableMultiSelect
    ? table.getSelectedRowModel().rows.map((row) => getRowId(row.original as T))
    : [];

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan,
    enabled: enableVirtualization,
  });

  const virtualRows = enableVirtualization
    ? rowVirtualizer.getVirtualItems()
    : [];

  const totalSize = enableVirtualization
    ? rowVirtualizer.getTotalSize()
    : undefined;

  const paddingTop =
    enableVirtualization && virtualRows.length > 0
      ? virtualRows[0]?.start || 0
      : 0;

  const paddingBottom =
    enableVirtualization && virtualRows.length > 0
      ? totalSize! - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  return {
    table,
    selectedRows,
    tableElement: (
      <div className="space-y-4">
        <div className="border rounded-lg overflow-hidden">
          <div
            ref={tableContainerRef}
            className="overflow-y-auto"
            style={{ maxHeight }}
          >
            <Table>
              <TableHeader className="sticky top-0 bg-[#f5da6c] z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="bg-[#f5da6c] text-foreground px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium uppercase tracking-wider border-r last:border-r-0"
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
                  {enableVirtualization && paddingTop > 0 && (
                    <tr>
                      <td style={{ height: `${paddingTop}px` }} />
                    </tr>
                  )}
                  {rows?.length
                    ? (enableVirtualization
                        ? virtualRows
                        : rows.map((_, index) => ({ index }))
                      ).map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        const rowData = row.original as T;
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

                        const rowId = getRowId(rowData);
                        const isSelected =
                          selectedRowId !== null && rowId === selectedRowId;

                        return (
                          <TableRow
                            key={row.id}
                            className={`border-b hover:bg-muted/50 ${
                              enableRowClick && onRowClick
                                ? "cursor-pointer"
                                : ""
                            }`}
                            onClick={(event) => handleRowClick(row, event)}
                            data-selected={isSelected}
                            data-row-id={rowId}
                          >
                            {row.getVisibleCells().map((cell) => {
                              const wrapConfig = enableColumnWrapping
                                ? (cell.column.columnDef.meta as any)
                                    ?.wrapConfig
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
                    : null}
                  {enableVirtualization && paddingBottom > 0 && (
                    <tr>
                      <td style={{ height: `${paddingBottom}px` }} />
                    </tr>
                  )}
                  {!rows?.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={tableColumns.length}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {emptyMessage}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              )}
            </Table>
          </div>
        </div>

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

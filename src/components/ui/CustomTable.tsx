"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  RowData,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CustomArrowUpDown } from "@/components/ui/customarrowupdown";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TablePagination from "@/components/ui/TablePagination";

export type CellContent =
  | { type: "text"; value: string }
  | { type: "icon"; icon: React.ReactNode }
  | { type: "button"; label: string; onClick: () => void; className?: string }
  | { type: "custom"; render: () => React.ReactNode }
  | { type: "group"; items: CellContent[] };

interface CustomTableProps<TData extends RowData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  pageSizeArray?: any[];
  maxHeight?: number | string;
  minHeight?: number | string;
  rowHeight?: number;
  showSerialNumber?: boolean;
  noDataMessage?: string;
  isLoading?: boolean;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  fullHeight?: boolean;
  autoFitRows?: boolean;
}

const renderCellContent = (content: unknown): React.ReactNode => {
  if (content === null || content === undefined) return "";
  if (
    typeof content === "string" ||
    typeof content === "number" ||
    typeof content === "boolean"
  ) {
    return content.toString();
  }
  if (React.isValidElement(content)) return content;

  if (typeof content === "object" && content.type) {
    switch (content.type) {
      case "text":
        return content.value;
      case "icon":
        return content.icon;
      case "button":
        return (
          <div className="flex justify-center items-center w-full">
            <Button
              size="sm"
              onClick={content.onClick}
              className={content.className || ""}
            >
              {content.label}
            </Button>
          </div>
        );
      case "custom":
        return content.render();
      case "group":
        return (
          <div className="flex flex-row justify-center items-center gap-1 w-full">
            {content.items.map((item: unknown, idx: number) => (
              <div key={idx} className="flex-shrink-0">
                {renderCellContent(item)}
              </div>
            ))}
          </div>
        );
      default:
        return content.toString();
    }
  }

  if (typeof content === "object") return JSON.stringify(content);
  return content.toString();
};

export function CustomTable<TData extends RowData>({
  data,
  columns,
  pageSizeArray = [20, 50, "All"],
  maxHeight,
  minHeight,
  rowHeight = 48,
  showSerialNumber = true,
  noDataMessage = "No data available",
  isLoading = false,
  columnVisibility,
  onColumnVisibilityChange,
  fullHeight = true,
  autoFitRows = true,
}: CustomTableProps<TData>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: typeof pageSizeArray[0] === "number" ? pageSizeArray[0] : 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] =
    useState<VisibilityState>({});
  const [isMobile, setIsMobile] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const userChangedPageSizeRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Auto-calculate optimal pageSize based on measured container height
  useEffect(() => {
    if (!autoFitRows) return;

    const calculateOptimalSize = () => {
      const el = containerRef.current;
      let availableRowsHeight = 0;
      if (el && el.clientHeight > 150) {
        // el.clientHeight minus table header (~48px) and pagination footer (~54px)
        availableRowsHeight = el.clientHeight - 105;
      } else {
        // Fallback using viewport height
        availableRowsHeight = window.innerHeight - 280;
      }
      const itemHeight = isMobile ? 65 : 52;
      return Math.max(5, Math.floor(availableRowsHeight / itemHeight));
    };

    const updateOptimalSize = () => {
      if (userChangedPageSizeRef.current) return;
      const optimal = calculateOptimalSize();
      setPagination((prev) => {
        if (prev.pageSize !== optimal) {
          return { ...prev, pageSize: optimal };
        }
        return prev;
      });
    };

    updateOptimalSize();
    const rafId = requestAnimationFrame(updateOptimalSize);

    let ro: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        updateOptimalSize();
      });
      ro.observe(containerRef.current);
    }

    window.addEventListener("resize", updateOptimalSize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateOptimalSize);
      if (ro) ro.disconnect();
    };
  }, [autoFitRows, isMobile]);

  // Use controlled visibility if provided, otherwise use internal state
  const currentColumnVisibility = columnVisibility ?? internalColumnVisibility;
  const handleColumnVisibilityChange =
    onColumnVisibilityChange ?? setInternalColumnVisibility;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    const observer = new ResizeObserver(([entry]) => {
      setIsMobile(entry.contentRect.width < 768);
      setContainerWidth(entry.contentRect.width);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
      updateWidth();
    }

    return () => observer.disconnect();
  }, []);

  const finalData = Array.isArray(data) ? data : [];

  // Handle "All" option - when pageSize equals data length, show all rows
  const isShowingAll = pagination.pageSize >= finalData.length;
  const pageCount = isShowingAll ? 1 : Math.ceil(finalData.length / pagination.pageSize);
  const paginatedData = isShowingAll
    ? finalData
    : finalData.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize
    );

  const serialNumberColumn: ColumnDef<TData, unknown> = {
    id: "serialNumber",
    header: () => <div className="text-center w-full">S.No.</div>,
    cell: ({ row }) => {
      const serialNumber =
        pagination.pageIndex * pagination.pageSize + row.index + 1;
      return (
        <div className="text-center w-full font-medium">{serialNumber}</div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    meta: { minWidth: 70, maxWidth: 80, flex: 0 },
  };

  const finalColumns = useMemo(() => {
    return showSerialNumber ? [serialNumberColumn, ...columns] : columns;
  }, [showSerialNumber, columns, pagination.pageIndex, pagination.pageSize]);

  const handlePaginationChange = useCallback(
    (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => {
      setPagination((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (next.pageSize !== prev.pageSize) {
          userChangedPageSizeRef.current = true;
        }
        return next;
      });
    },
    []
  );

  const table = useReactTable({
    data: paginatedData,
    columns: finalColumns,
    state: {
      pagination,
      sorting,
      columnVisibility: currentColumnVisibility,
    },
    onPaginationChange: handlePaginationChange,
    onSortingChange: setSorting,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    pageCount,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  const effectivePageSizeArray = useMemo(() => {
    const list = Array.isArray(pageSizeArray) ? [...pageSizeArray] : [10, 20, 50, "All"];
    if (
      typeof pagination.pageSize === "number" &&
      !list.includes(pagination.pageSize) &&
      !list.includes(pagination.pageSize.toString() as any)
    ) {
      const numericItems = list.filter((x): x is number => typeof x === "number");
      const stringItems = list.filter((x) => typeof x !== "number");
      return [...numericItems, pagination.pageSize].sort((a, b) => a - b).concat(stringItems as any);
    }
    return list;
  }, [pageSizeArray, pagination.pageSize]);

  const scrollStyle = useMemo<React.CSSProperties>(() => {
    const style: React.CSSProperties = {
      WebkitOverflowScrolling: "touch",
    };
    if (maxHeight !== undefined) {
      style.maxHeight = typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;
    }
    if (minHeight !== undefined) {
      style.minHeight = typeof minHeight === "number" ? `${minHeight}px` : minHeight;
    }
    return style;
  }, [maxHeight, minHeight]);

  const getColumnStyle = (col: unknown) => {
    const meta = (col as any)?.columnDef?.meta || {};
    const baseWidth = meta.minWidth || (isMobile ? 80 : 100);
    const maxWidth = meta.maxWidth || 2000;
    return {
      width: baseWidth + "px",
      minWidth: baseWidth + "px",
      maxWidth: maxWidth + "px",
      flexGrow: meta.flex ?? 1,
      flexShrink: 0,
    };
  };

  // Calculate if table should expand to fill container
  const headers = table.getHeaderGroups()[0]?.headers || [];
  const totalMinWidth = useMemo(() => {
    return headers.reduce((sum, header) => {
      const meta = (header.column.columnDef as any)?.meta || {};
      const width = meta.minWidth || (isMobile ? 80 : 100);
      return sum + width;
    }, 0);
  }, [headers, isMobile]);

  const shouldExpand = containerWidth > totalMinWidth;
  const tableWidth = shouldExpand ? "100%" : totalMinWidth + "px";

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden ${
        fullHeight ? "flex-1 min-h-0 flex flex-col" : ""
      }`}
    >
      <div
        className={`rounded-md border bg-background w-full overflow-hidden flex flex-col ${
          fullHeight ? "flex-1 min-h-0" : ""
        }`}
      >
        <div
          ref={tableScrollRef}
          className={`overflow-x-auto overflow-y-auto scrollbar-thin relative ${
            fullHeight ? "flex-1 min-h-0 flex flex-col" : ""
          }`}
          style={scrollStyle}
        >
          <div
            style={{ width: tableWidth, minWidth: totalMinWidth + "px" }}
            className={fullHeight ? "min-h-full flex-1 flex flex-col" : ""}
          >
            {/* Header */}
            <div className="sticky top-0 z-20 bg-primary border-b shrink-0">
              {table.getHeaderGroups().map((hg) => (
                <div key={hg.id} className="flex">
                  {hg.headers.map((header) => (
                    <div
                      key={header.id}
                      className="flex items-center px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium uppercase tracking-wider border-r last:border-r-0 text-black"
                      style={getColumnStyle(header.column)}
                    >
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
                          <CustomArrowUpDown
                            direction={header.column.getIsSorted()}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Body */}
            {isLoading ? (
              <div className="flex flex-col gap-2 px-4 py-4 flex-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-6 w-16 flex-shrink-0" />
                    {columns.map((_, j) => (
                      <Skeleton key={j} className="h-6 w-full" />
                    ))}
                  </div>
                ))}
              </div>
            ) : finalData.length === 0 ? (
              <div className="flex items-center justify-center flex-1 min-h-[150px]">
                <div className="text-center text-muted-foreground py-8">
                  <div className="text-lg font-medium mb-2">
                    {noDataMessage}
                  </div>
                  <div className="text-sm">No records found to display</div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className={`flex border-b last:border-b-0 hover:bg-muted/50 items-stretch transition-colors ${
                      fullHeight
                        ? "flex-1 min-h-[44px] max-h-[64px]"
                        : "min-h-[52px]"
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div
                        key={cell.id}
                        className="flex items-center justify-center px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm border-r last:border-r-0"
                        style={getColumnStyle(cell.column)}
                      >
                        <div className="w-full text-center">
                          <div className="break-words overflow-wrap-anywhere leading-relaxed">
                            {cell.column.id === "serialNumber"
                              ? flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )
                              : renderCellContent(cell.getValue())}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t bg-background shrink-0">
          <TablePagination
            table={table}
            pageSizeArray={effectivePageSizeArray}
            totalRecords={finalData.length}
          />
        </div>
      </div>
    </div>
  );
}

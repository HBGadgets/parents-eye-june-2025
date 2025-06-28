"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  RowData,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CustomArrowUpDown } from "@/components/ui/customarrowupdown";
import { Button } from "@/components/ui/button";
import TablePagination from "@/components/ui/TablePagination";

export type CellContent =
  | { type: "text"; value: string }
  | { type: "icon"; icon: React.ReactNode }
  | { type: "button"; label: string; onClick: () => void }
  | { type: "custom"; render: () => React.ReactNode }
  | { type: "group"; items: CellContent[] };

interface CustomTableProps<TData extends RowData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  pageSizeArray?: number[];
  maxHeight?: number;
  minHeight?: number;
  rowHeight?: number;
  showSerialNumber?: boolean;
  noDataMessage?: string;
}

const renderCellContent = (content: any): React.ReactNode => {
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
          <Button size="sm" onClick={content.onClick}>
            {content.label}
          </Button>
        );
      case "custom":
        return content.render();
      case "group":
        return (
          <div className="flex flex-row items-center gap-1 flex-nowrap">
            {content.items.map((item: any, idx: number) => (
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
  pageSizeArray = [10, 20, 30],
  maxHeight = 480,
  minHeight = 100,
  rowHeight = 48,
  showSerialNumber = true,
  noDataMessage = "No data available",
}: CustomTableProps<TData>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSizeArray[0],
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

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

  const finalData = data;
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [data]);
  const pageCount = Math.ceil(finalData.length / pagination.pageSize);
  const paginatedData = finalData.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  const serialNumberColumn: ColumnDef<TData, any> = {
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
    meta: { minWidth: 60, maxWidth: 80, flex: 0 },
  };

  const finalColumns = useMemo(() => {
    return showSerialNumber ? [serialNumberColumn, ...columns] : columns;
  }, [showSerialNumber, columns, pagination.pageIndex, pagination.pageSize]);

  const table = useReactTable({
    data: paginatedData,
    columns: finalColumns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    pageCount,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  const adaptiveHeight = useMemo(() => {
    if (finalData.length === 0) return Math.max(minHeight, 150);
    const actualRowHeight = isMobile
      ? Math.max(rowHeight, 80)
      : Math.max(rowHeight, 60);
    const calculatedHeight = rows.length * actualRowHeight;
    const headerHeight = 48;
    const totalContentHeight = calculatedHeight + headerHeight;
    return Math.max(minHeight, Math.min(maxHeight, totalContentHeight));
  }, [
    rows.length,
    rowHeight,
    isMobile,
    minHeight,
    maxHeight,
    finalData.length,
  ]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () =>
      isMobile ? Math.max(rowHeight, 80) : Math.max(rowHeight, 60),
    overscan: 5,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows[0]?.start || 0;
  const paddingBottom = totalSize - (virtualRows.at(-1)?.end || 0);

  const getColumnStyle = (col: any) => {
    const meta = col.columnDef?.meta || {};
    const baseWidth = meta.minWidth || (isMobile ? 80 : 100);
    const maxWidth = meta.maxWidth || 300;
    return {
      width: baseWidth + "px",
      minWidth: baseWidth + "px",
      maxWidth: maxWidth + "px",
      flexGrow: meta.flex || 1,
      flexShrink: 0,
    };
  };

  // Calculate if table should expand to fill container
  const headers = table.getHeaderGroups()[0]?.headers || [];
  const totalMinWidth = useMemo(() => {
    return headers.reduce((sum, header) => {
      const meta = header.column.columnDef?.meta || {};
      const width = meta.minWidth || (isMobile ? 80 : 100);
      return sum + width;
    }, 0);
  }, [headers, isMobile]);

  const [containerWidth, setContainerWidth] = useState(0);

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

  const shouldExpand = containerWidth > totalMinWidth;
  const tableWidth = shouldExpand ? "100%" : totalMinWidth + "px";

  return (
    <div ref={containerRef} className="w-full space-y-4 overflow-hidden">
      <div className="rounded-md border bg-background w-full overflow-hidden">
        <div
          ref={tableScrollRef}
          className="overflow-auto"
          style={{
            height: adaptiveHeight + "px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div style={{ width: tableWidth, minWidth: totalMinWidth + "px" }}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-muted border-b">
              {table.getHeaderGroups().map((hg) => (
                <div key={hg.id} className={shouldExpand ? "flex" : "flex"}>
                  {hg.headers.map((header) => (
                    <div
                      key={header.id}
                      className="flex bg-primary items-center px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium uppercase tracking-wider border-r last:border-r-0 text-white"
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
            {finalData.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[100px]">
                <div className="text-center text-muted-foreground">
                  <div className="text-lg font-medium mb-2">
                    {noDataMessage}
                  </div>
                  <div className="text-sm">No records found to display</div>
                </div>
              </div>
            ) : (
              <>
                {paddingTop > 0 && (
                  <div style={{ height: paddingTop + "px" }} />
                )}
                {virtualRows.map((vr) => {
                  const row = rows[vr.index];
                  return (
                    <div
                      key={row.id}
                      className={
                        shouldExpand
                          ? "flex border-b hover:bg-muted/50"
                          : "flex border-b hover:bg-muted/50"
                      }
                      style={{ height: vr.size + "px" }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <div
                          key={cell.id}
                          className="flex items-start px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm border-r last:border-r-0"
                          style={getColumnStyle(cell.column)}
                        >
                          <div className="w-full text-left">
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
                  );
                })}
                {paddingBottom > 0 && (
                  <div style={{ height: paddingBottom + "px" }} />
                )}
              </>
            )}
          </div>
        </div>

        <TablePagination
          table={table}
          pageSizeArray={pageSizeArray}
          totalRecords={finalData.length}
        />
      </div>
    </div>
  );
}

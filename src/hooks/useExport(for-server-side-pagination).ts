import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useState } from "react";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

interface ExportConfig<T, R> {
  fetchPage: (
    page: number,
    limit: number
  ) => Promise<{
    rows: T[];
    total: number;
  }>;
  mergeFn?: (data: T[]) => T[]; // ✅ optional
  mapFn: (data: T[]) => R[];
  fileName: string;
  sheetName?: string;
  pageSize?: number;
}

/* ---------------------------------------------
   HOOK
--------------------------------------------- */

export const usePaginatedExcelExport = <T, R>({
  fetchPage,
  mergeFn,
  mapFn,
  fileName,
  sheetName = "Report",
  pageSize = 100,
}: ExportConfig<T, R>) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportExcel = async () => {
    try {
      setIsExporting(true);

      let page = 1;
      let allRows: T[] = [];
      let hasMore = true;

      while (hasMore) {
        const { rows, total } = await fetchPage(page, pageSize);
        allRows.push(...rows);
        hasMore = allRows.length < total;
        page++;
      }

      // ✅ merge only if mergeFn exists
      const processedRows = mergeFn ? mergeFn(allRows) : allRows;

      // map to excel rows
      const excelData = mapFn(processedRows);

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const buffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `${fileName}_${Date.now()}.xlsx`);
    } catch (err) {
      console.error("Excel export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportExcel,
    isExporting,
  };
};

type ExportColumn = {
  key: string;
  header: string;
  formatter?: (value: any) => string;
};

/**
 * Converts columns and rows into export-ready format
 * @param columns - your column definition array
 * @param data - your raw table data (e.g. list of students)
 * @returns { exportColumns, exportData }
 */
export function prepareExportData<T>(columns: any[], data: T[]) {
  const exportColumns: ExportColumn[] = columns
    .filter((col) => col.header !== "Action")
    .map((col) => ({
      key: col.header,
      header: col.header,
      formatter: (value: any) => value?.value ?? "",
    }));

  const exportData = data.map((row) => {
    const flatRow: Record<string, any> = {};
    columns.forEach((col) => {
      if (col.header !== "Action") {
        const value = col.accessorFn(row); // { type, value }
        flatRow[col.header] = value;
      }
    });
    return flatRow;
  });

  return { exportColumns, exportData };
}

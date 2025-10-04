type ExportColumn = {
  key: string;
  header: string;
  formatter?: (value: unknown) => string;
};

// Define a typed column with accessor function
type ColumnDef<T, V = unknown> = {
  header: string;
  accessorFn: (row: T) => V;
  // Other props can be added if needed
};

/**
 * Converts columns and rows into export-ready format
 * @param columns - your typed column definition array
 * @param data - your raw table data (typed)
 * @returns { exportColumns, exportData }
 */
export function prepareExportData<T, V>(
  columns: Array<ColumnDef<T, V>>,
  data: T[]
): {
  exportColumns: ExportColumn[];
  exportData: Array<Record<string, V>>;
} {
  const exportColumns: ExportColumn[] = columns
    .filter((col) => col.header !== "Action")
    .map((col) => ({
      key: col.header,
      header: col.header,
      formatter: (value: unknown) => value ?? "",
    }));

  const exportData = data.map((row) => {
    const flatRow: Record<string, V> = {};
    columns.forEach((col) => {
      if (col.header !== "Action") {
        const value = col.accessorFn(row); // type V
        flatRow[col.header] = value;
      }
    });
    return flatRow;
  });

  return { exportColumns, exportData };
}

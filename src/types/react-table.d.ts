declare module "@tanstack/react-table" {
  interface ColumnMeta {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
    justifyContent?: "flex-start" | "center" | "flex-end";
  }
}

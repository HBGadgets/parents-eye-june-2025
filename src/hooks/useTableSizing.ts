/* hooks/useTableSizing.ts
   Extracted from the original CustomTable component */
import { useRef, useLayoutEffect, useState } from "react";

export const useTableSizing = (minHeight = 200, maxHeight = 480) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const [adaptiveHeight, setAdaptiveHeight] = useState<number>(maxHeight);
  const [tableWidth, setTableWidth] = useState<number | "auto">("auto");

  // --------------- layout calc -----------------
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      const availableHeight =
        window.innerHeight - el.getBoundingClientRect().top - 24; // 24 = bottom padding
      setAdaptiveHeight(
        Math.min(maxHeight, Math.max(minHeight, availableHeight))
      );
      setTableWidth(el.getBoundingClientRect().width);
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [minHeight, maxHeight]);

  // --------------- column sizing helper --------
  const getColumnStyle = (colOrCell: unknown): React.CSSProperties => {
    const meta = colOrCell.column.columnDef.meta as
      | { minW?: number; maxW?: number; w?: number }
      | undefined;

    if (!meta) return {};
    const style: React.CSSProperties = {};
    if (meta.w) style.width = meta.w;
    if (meta.minW) style.minWidth = meta.minW;
    if (meta.maxW) style.maxWidth = meta.maxW;
    return style;
  };

  return {
    containerRef,
    tableScrollRef,
    adaptiveHeight,
    getColumnStyle,
    tableWidth,
  };
};

import React, { memo, useCallback, useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import throttle from "lodash.throttle";
import { Line } from "react-chartjs-2";

interface SpeedTimelineGraphProps {
  data: any;
  options: any;
  onHoverSeek: (index: number) => void;
  isExpanded?: boolean;
  onRangeSelect?: (startIndex: number, endIndex: number) => void;
  onResetRange?: () => void;
}

export interface SpeedTimelineGraphHandle {
  /** Imperatively move the red dot to a given data index without a React re-render */
  seekToIndex: (index: number) => void;
}

const SpeedTimelineGraphInner = forwardRef<SpeedTimelineGraphHandle, SpeedTimelineGraphProps>(
  ({ data, options, onHoverSeek, isExpanded, onRangeSelect, onResetRange }, ref) => {
    const chartRef = useRef<any>(null);

    // Expose seekToIndex so the parent can imperatively update the dot position
    useImperativeHandle(ref, () => ({
      seekToIndex(index: number) {
        const chart = chartRef.current;
        if (!chart) return;
        const speeds: number[] = chart.data.datasets[0]?.data ?? [];
        const dotDataset = chart.data.datasets[1];
        if (!dotDataset) return;

        // Update the Current Position dataset in-place
        dotDataset.data = speeds.map((speed: number, i: number) =>
          i === index ? speed : null
        );
        dotDataset.pointRadius = speeds.map((_: number, i: number) =>
          i === index ? 8 : 0
        );

        // 'none' skips animation for zero-cost update
        chart.update("none");
      },
    }));
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [hoverBlocked, setHoverBlocked] = useState(false); // New state for blocking hover
    const [hasLeftGraph, setHasLeftGraph] = useState(false); // Track if mouse has left after blocking

    // Drag range selection states
    const [isSelecting, setIsSelecting] = useState(false);
    const [dragStartPos, setDragStartPos] = useState<number | null>(null);
    const [dragCurrentPos, setDragCurrentPos] = useState<number | null>(null);

    // Block hover when isExpanded changes from true to false
    useEffect(() => {
      if (isExpanded === false) {
        setHoverBlocked(true);
        setIsHovering(false);
        setMousePosition(null);
        setHasLeftGraph(false);
      }
    }, [isExpanded]);

    // Enhanced hover handler that respects blocking state
    const throttledHover = useCallback(
      throttle((event: any) => {
        if (!containerRef.current) return;
        const containerPosition = containerRef.current.getBoundingClientRect();

        // Update mouse position for selection drag if dragging
        const relativeMouseX = event.nativeEvent.clientX - containerPosition.left;

        if (isSelecting) {
          setDragCurrentPos(relativeMouseX);
        }

        // Don't process hover seek if blocked
        if (hoverBlocked || !chartRef.current) return;

        const chart = chartRef.current;
        const canvasPosition = chart.canvas.getBoundingClientRect();
        const mouseX = event.nativeEvent.clientX - canvasPosition.left;

        // Update mouse position for vertical line (relative to container)
        setMousePosition(relativeMouseX);

        // Get chart area dimensions
        const chartArea = chart.chartArea;
        if (!chartArea) return;

        // Calculate relative position (0 to 1) within the chart area
        const relativeX =
          (mouseX - chartArea.left) / (chartArea.right - chartArea.left);

        // Clamp between 0 and 1
        const clampedX = Math.max(0, Math.min(1, relativeX));

        // Calculate the corresponding data index
        const dataLength = data.labels?.length || 0;
        if (dataLength > 0) {
          const targetIndex = Math.round(clampedX * (dataLength - 1));
          onHoverSeek(targetIndex);
        }
      }, 50),
      [onHoverSeek, data, hoverBlocked, isSelecting]
    );

    // Mouse Down - Start range selection drag
    const handleMouseDown = useCallback(
      (event: React.MouseEvent) => {
        if (!containerRef.current || !onRangeSelect) return;
        const containerPosition = containerRef.current.getBoundingClientRect();
        const relativeX = event.clientX - containerPosition.left;
        setIsSelecting(true);
        setDragStartPos(relativeX);
        setDragCurrentPos(relativeX);
      },
      [onRangeSelect]
    );

    // Mouse Up - End range selection drag and select slice
    const handleMouseUp = useCallback(() => {
      if (
        isSelecting &&
        dragStartPos !== null &&
        dragCurrentPos !== null &&
        chartRef.current &&
        containerRef.current &&
        onRangeSelect
      ) {
        const chart = chartRef.current;
        const chartArea = chart.chartArea;
        if (chartArea) {
          const containerPosition = containerRef.current.getBoundingClientRect();
          const canvasPosition = chart.canvas.getBoundingClientRect();

          const offsetLeft = canvasPosition.left - containerPosition.left;
          const startCanvasX = dragStartPos - offsetLeft;
          const endCanvasX = dragCurrentPos - offsetLeft;

          const minCanvasX = Math.min(startCanvasX, endCanvasX);
          const maxCanvasX = Math.max(startCanvasX, endCanvasX);

          const relativeMinX =
            (minCanvasX - chartArea.left) / (chartArea.right - chartArea.left);
          const relativeMaxX =
            (maxCanvasX - chartArea.left) / (chartArea.right - chartArea.left);

          const clampedMinX = Math.max(0, Math.min(1, relativeMinX));
          const clampedMaxX = Math.max(0, Math.min(1, relativeMaxX));

          const dataLength = data.labels?.length || 0;
          if (dataLength > 1) {
            const startIndex = Math.round(clampedMinX * (dataLength - 1));
            const endIndex = Math.round(clampedMaxX * (dataLength - 1));

            if (
              Math.abs(dragCurrentPos - dragStartPos) >= 10 &&
              endIndex > startIndex
            ) {
              onRangeSelect(startIndex, endIndex);
            }
          }
        }
      }

      setIsSelecting(false);
      setDragStartPos(null);
      setDragCurrentPos(null);
    }, [isSelecting, dragStartPos, dragCurrentPos, onRangeSelect, data]);

    // Handle double-click to reset zoom / filter
    const handleDoubleClick = useCallback(() => {
      if (onResetRange) {
        onResetRange();
      }
    }, [onResetRange]);

    // Handle mouse enter - only works if not blocked
    const handleMouseEnter = useCallback(() => {
      if (hoverBlocked) {
        // If blocked but mouse has left before, unblock hover
        if (hasLeftGraph) {
          setHoverBlocked(false);
          setIsHovering(true);
        }
        // If blocked and mouse hasn't left, do nothing
        return;
      }

      // Normal hover behavior
      setIsHovering(true);
    }, [hoverBlocked, hasLeftGraph]);

    // Handle mouse leave
    const handleMouseLeave = useCallback(() => {
      if (isSelecting) {
        handleMouseUp();
      }
      setIsHovering(false);
      setMousePosition(null);

      // If hover was blocked, mark that mouse has left
      if (hoverBlocked) {
        setHasLeftGraph(true);
      }
    }, [hoverBlocked, isSelecting, handleMouseUp]);

    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          cursor: hoverBlocked && !hasLeftGraph ? "default" : "crosshair",
          userSelect: "none",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={throttledHover}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Chart */}
        <Line ref={chartRef} data={data} options={options} />

        {/* Drag Selection Box Overlay */}
        {isSelecting && dragStartPos !== null && dragCurrentPos !== null && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: Math.min(dragStartPos, dragCurrentPos),
              width: Math.abs(dragCurrentPos - dragStartPos),
              backgroundColor: "rgba(59, 130, 246, 0.25)",
              borderLeft: "2px solid #2563eb",
              borderRight: "2px solid #2563eb",
              pointerEvents: "none",
              zIndex: 20,
            }}
          />
        )}

        {/* Vertical hover line - only show if not blocked and not selecting */}
        {isHovering && mousePosition !== null && !hoverBlocked && !isSelecting && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: mousePosition,
              width: "2px",
              height: "100px",
              backgroundColor: "rgb(59, 130, 246)",
              pointerEvents: "none",
              zIndex: 10,
              boxShadow: "0 0 4px rgba(239, 68, 68, 0.4)",
              transition: "opacity 0.1s ease-out",
            }}
          />
        )}

        {/* Enhanced crosshair dot - only show if not blocked and not selecting */}
        {isHovering &&
          mousePosition !== null &&
          chartRef.current &&
          !hoverBlocked &&
          !isSelecting &&
          (() => {
            const chart = chartRef.current;
            const chartArea = chart.chartArea;
            if (!chartArea) return null;

            // Calculate which data point we're hovering over
            const relativeX =
              (mousePosition - chartArea.left) /
              (chartArea.right - chartArea.left);
            const clampedX = Math.max(0, Math.min(1, relativeX));
            const dataLength = data.labels?.length || 0;
            const targetIndex = Math.round(clampedX * (dataLength - 1));

            if (
              targetIndex >= 0 &&
              targetIndex < dataLength &&
              data.datasets[0]?.data
            ) {
              const speedValue = data.datasets[0].data[targetIndex];
              const maxSpeed = Math.max(...data.datasets[0].data);
              const yPosition =
                chartArea.bottom -
                (speedValue / maxSpeed) * (chartArea.bottom - chartArea.top);

              return (
                <div
                  style={{
                    position: "absolute",
                    left: mousePosition - 4,
                    top: yPosition - 4,
                    width: "8px",
                    height: "8px",
                    backgroundColor: "rgb(59, 130, 246)",
                    borderRadius: "50%",
                    border: "2px solid white",
                    pointerEvents: "none",
                    zIndex: 11,
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                  }}
                />
              );
            }
            return null;
          })()}
      </div>
    );
  }
);

SpeedTimelineGraphInner.displayName = "SpeedTimelineGraph";

export const SpeedTimelineGraph = memo(SpeedTimelineGraphInner);

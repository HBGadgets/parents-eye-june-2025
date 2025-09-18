import React, { memo, useCallback, useRef, useState, useEffect } from "react";
import throttle from "lodash.throttle";
import { Line } from "react-chartjs-2";

interface SpeedTimelineGraphProps {
  data: any;
  options: any;
  onHoverSeek: (index: number) => void;
  isExpanded?: boolean; // Add this prop
}

export const SpeedTimelineGraph = memo<SpeedTimelineGraphProps>(
  ({ data, options, onHoverSeek, isExpanded }) => {
    const chartRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [hoverBlocked, setHoverBlocked] = useState(false); // New state for blocking hover
    const [hasLeftGraph, setHasLeftGraph] = useState(false); // Track if mouse has left after blocking

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
        // Don't process hover if blocked
        if (hoverBlocked || !chartRef.current || !containerRef.current) return;

        const chart = chartRef.current;

        // Get the canvas position and mouse coordinates
        const canvasPosition = chart.canvas.getBoundingClientRect();
        const containerPosition = containerRef.current.getBoundingClientRect();
        const mouseX = event.nativeEvent.clientX - canvasPosition.left;

        // Update mouse position for vertical line (relative to container)
        const relativeMouseX =
          event.nativeEvent.clientX - containerPosition.left;
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
      [onHoverSeek, data, hoverBlocked]
    );

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
      setIsHovering(false);
      setMousePosition(null);

      // If hover was blocked, mark that mouse has left
      if (hoverBlocked) {
        setHasLeftGraph(true);
      }
    }, [hoverBlocked]);

    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          cursor: hoverBlocked && !hasLeftGraph ? "default" : "pointer",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={throttledHover}
      >
        {/* Chart */}
        <Line ref={chartRef} data={data} options={options} />

        {/* Vertical hover line - only show if not blocked */}
        {isHovering && mousePosition !== null && !hoverBlocked && (
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

        {/* Enhanced crosshair dot - only show if not blocked */}
        {isHovering &&
          mousePosition !== null &&
          chartRef.current &&
          !hoverBlocked &&
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

SpeedTimelineGraph.displayName = "SpeedTimelineGraph";

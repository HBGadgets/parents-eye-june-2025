import React, { useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DeviceHistoryItem } from "@/data/sampleData";

interface SpeedGraphProps {
  data: DeviceHistoryItem[];
  currentIndex: number;
  onHover: (index: number) => void;
}

const SpeedGraph: React.FC<SpeedGraphProps> = React.memo(
  ({ data, currentIndex, onHover }) => {
    // Create static chart data - sorted by time in ascending order
    const chartData = useMemo(() => {
      // First, sort data by createdAt in ascending order
      const sortedData = [...data].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const maxPoints = 200;
      const step = Math.max(1, Math.floor(sortedData.length / maxPoints));

      return sortedData
        .filter((_, index) => index % step === 0)
        .map((item, filteredIndex) => {
          const originalIndex = filteredIndex * step;
          const dateObj = new Date(item.createdAt);

          return {
            index: originalIndex,
            speed: item.speed,
            originalDate: dateObj,
            timestamp: dateObj.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
          };
        });
    }, [data]);

    // Immediate hover handler - no debouncing for instant playback control
    const handleMouseMove = useCallback(
      (state: any) => {
        if (state?.activePayload?.[0]) {
          const hoveredIndex = state.activePayload[0].payload.index;
          // Immediately call onHover for instant playback control
          onHover(hoveredIndex);
        }
      },
      [onHover]
    );

    // Handle mouse leave to prevent stuck state
    const handleMouseLeave = useCallback(() => {
      // Optional: You can reset to current position or do nothing
      // onHover(currentIndex);
    }, []);

    const CustomTooltip = useCallback(({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs">
            <p>Speed: {data.speed.toFixed(1)} kmph</p>
            <p className="text-muted-foreground">
              Time:{" "}
              {data.originalDate.toLocaleTimeString("en-US", { hour12: true })}
            </p>
            <p className="text-muted-foreground">
              Date: {data.originalDate.toLocaleDateString("en-US")}
            </p>
          </div>
        );
      }
      return null;
    }, []);

    return (
      <div className="w-full h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 50 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid strokeDasharray="5 5" stroke="#eee" />

            <XAxis
              dataKey="timestamp"
              tickLine={false}
              label={{
                value: "Time",
                angle: 360,
                position: "outsideTop",
                style: { textAnchor: "middle" },
                fontSize: 10,
              }}
              angle={-45}
              textAnchor="end"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              interval="preserveStartEnd"
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              label={{
                value: "Speed (kmph)",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
                fontSize: 10,
              }}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={60}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Reference line shows current playback position */}
            <ReferenceLine
              x={currentIndex}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="3 3"
            />

            <Line
              type="monotone"
              dataKey="speed"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls={true}
              strokeDasharray="0"
              activeDot={{
                r: 6, // Slightly larger for better hover feedback
                fill: "#3b82f6",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

export default SpeedGraph;

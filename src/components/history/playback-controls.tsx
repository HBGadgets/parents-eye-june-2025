"use client";
import React, { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Gauge, Clock } from "lucide-react";
import { DeviceHistoryItem } from "@/data/sampleData";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { SpeedTimelineGraph } from "./SpeedGraph";
import throttle from "lodash.throttle";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentIndex: number;
  totalPoints: number;
  onPlayPause: () => void;
  onSeek: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  currentData: DeviceHistoryItem;
  historyData: DeviceHistoryItem[]; // Full history data for graph
  isExpanded: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlayPause,
  playbackSpeed,
  onSpeedChange,
  currentData,
  currentIndex,
  onSeek,
  historyData,
  isExpanded,
}) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString("en-US"),
    };
  };

  const { date, time } = formatDateTime(currentData?.createdAt) || {
    date: "",
    time: "",
  };

  // Prepare chart data
  // Memoize base chart data (only recalculates when historyData changes)
  const baseChartData = useMemo(() => {
    const labels = historyData.map((item) => {
      const date = new Date(item.createdAt);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    });

    const speeds = historyData.map((item) => item.speed);

    return {
      labels,
      speeds,
      baseDataset: {
        label: "Speed (km/h)",
        data: speeds,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.1,
        fill: true,
      },
    };
  }, [historyData]);

  // Only update current position dataset when currentIndex changes
  const chartData = useMemo(
    () => ({
      labels: baseChartData.labels,
      datasets: [
        baseChartData.baseDataset,
        {
          label: "Current Position",
          data: baseChartData.speeds.map((speed, index) =>
            index === currentIndex ? speed : null
          ),
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgb(239, 68, 68)",
          pointRadius: 0,
          pointHoverRadius: 0,
          showLine: false,
          pointStyle: "circle",
        },
      ],
    }),
    [baseChartData, currentIndex]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false, // Disable animations for better performance
      interaction: {
        intersect: false,
        mode: "index" as const,
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 0,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          mode: "index" as const,
          intersect: false,
          position: "nearest",
          callbacks: {
            title: (context: any) => {
              const index = context[0].dataIndex;
              const date = new Date(historyData[index].createdAt);
              return date.toLocaleString();
            },
            label: (context: any) => {
              return `Speed: ${context.parsed.y.toFixed(1)} km/h`;
            },
          },
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "white",
          bodyColor: "white",
          borderColor: "rgb(239, 68, 68)",
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: false,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Timeline",
            font: { size: 12 },
          },
          ticks: {
            maxTicksLimit: 8,
            font: { size: 10 },
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Speed (km/h)",
            font: { size: 12 },
          },
          beginAtZero: true,
          ticks: {
            font: { size: 10 },
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
      },
      // Enhanced hover behavior
      onHover: (event: any, activeElements: any[]) => {
        if (event.native) {
          event.native.target.style.cursor = "pointer";
        }
      },
    }),
    [historyData]
  );

  // Remove the onClick handler from chartOptions
  delete chartOptions.onClick;

  const handleHoverSeek = useCallback(
    throttle((index: number) => {
      if (index !== currentIndex) {
        onSeek(index);
      }
    }, 100), // Reduced frequency to 100ms
    [currentIndex, onSeek]
  );

  return (
    <div className="space-y-3">
      {/* Playback Controls */}
      <div className="flex gap-5 items-center">
        {/* Playback Control Button */}
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={onPlayPause}
            className="size-8 p-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full cursor-pointer relative overflow-hidden group transform transition-all duration-200 active:scale-95 hover:scale-105"
            style={{
              boxShadow:
                "0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Ripple effect */}
            <span className="absolute inset-0 rounded-full bg-white/20 scale-0 group-active:scale-100 transition-transform duration-300 ease-out"></span>
            {isPlaying ? (
              <Pause className="w-5 h-5 relative z-10" />
            ) : (
              <Play className="w-5 h-5 relative z-10" />
            )}
          </Button>
        </div>

        {/* Speed Control Slider */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Speed:
          </span>
          <div className="flex items-center gap-2">
            <Slider
              value={[playbackSpeed]}
              max={200}
              min={4}
              step={0.5}
              onValueChange={(value) => onSpeedChange(value[0])}
              className="w-32 cursor-pointer"
            />
          </div>
        </div>

        {/* Speed Indicator */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Gauge className="w-4 h-4" />
          <span>Speed</span>
          <span className="bg-gray-200 px-2 py-1 rounded-sm">
            {currentData?.speed.toFixed(1)} kmph
          </span>
        </div>

        {/* Timestamp Info */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Clock className="w-4 h-4" />
          <span>Timestamp</span>
          <span className="bg-gray-200 px-2 py-1 rounded-sm">
            {date ? `${date} ${time}` : "N/A"}
          </span>
        </div>
      </div>

      <div className="w-full h-[1px] bg-gray-300"></div>

      {/* Speed vs Timeline Graph */}

      {!isExpanded && (
        <div style={{ height: "150px" }}>
          <SpeedTimelineGraph
            data={chartData}
            options={chartOptions}
            onHoverSeek={handleHoverSeek}
            isExpanded={isExpanded}
          />
        </div>
      )}

      {/* Custom CSS to ensure dropdown appears above Leaflet map */}
      <style jsx global>{`
        [data-radix-popper-content-wrapper] {
          z-index: 9999 !important;
        }
        .radix-dropdown-menu-content {
          z-index: 9999 !important;
        }
        /* Target Radix UI dropdown specifically */
        [data-state="open"][data-side] {
          z-index: 9999 !important;
        }
      `}</style>
    </div>
  );
};

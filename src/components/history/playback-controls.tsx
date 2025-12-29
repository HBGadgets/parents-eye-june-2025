"use client";
import React, { useMemo, useCallback } from "react";
import { Gauge, Clock } from "lucide-react";
import { DeviceHistoryItem } from "@/data/sampleData";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  // Tooltip,
  Legend,
} from "chart.js";
import { SpeedTimelineGraph } from "./SpeedGraph";
import throttle from "lodash.throttle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  // Tooltip,
  Legend
);

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackSpeed: number;
  progress: number;
  historyData: DeviceHistoryItem[];
  isExpanded: boolean;
  handleStop: () => void;
  handlePlayPause: () => void;
  handleProgressChange: (value: number) => void;
  handleSpeedChange: (speed: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  handlePlayPause,
  handleProgressChange,
  handleSpeedChange,
  playbackSpeed,
  progress,
  handleStop,
  isPlaying,
  historyData,
  isExpanded,
}) => {
  // ✅ Calculate current index and data from progress
  const currentIndex = useMemo(() => {
    if (!historyData || historyData.length === 0) return 0;
    return Math.round((progress / 100) * (historyData.length - 1));
  }, [progress, historyData]);

  const currentData = useMemo(() => {
    if (!historyData || historyData.length === 0) return null;
    return historyData[currentIndex];
  }, [historyData, currentIndex]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    console.log(date.toLocaleTimeString("en-US"));
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString("en-US"),
    };
  };

  const { date, time } = currentData
    ? formatDateTime(currentData.createdAt)
    : { date: "-- : --", time: "-- : --" };

  // Memoize base chart data (only recalculates when historyData changes)
  const baseChartData = useMemo(() => {
    if (!historyData || historyData.length === 0) {
      return {
        labels: [],
        speeds: [],
        baseDataset: {
          label: "Speed (km/h)",
          data: [],
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.1,
          fill: true,
        },
      };
    }

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
          pointRadius: 6,
          pointHoverRadius: 8,
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
      animation: false,
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
          callbacks: {
            title: (context: any) => {
              const index = context[0].dataIndex;
              if (!historyData[index]) return "";
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
      onHover: (event: any) => {
        if (event.native) {
          event.native.target.style.cursor = "pointer";
        }
      },
      // ✅ Add onClick to seek through graph
      onClick: (event: any, elements: any[]) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const newProgress = (index / (historyData.length - 1)) * 100;
          handleProgressChange(newProgress);
        }
      },
    }),
    [historyData, handleProgressChange]
  );

  // ✅ Handle hover seek on graph
  const handleHoverSeek = useCallback(
    throttle((index: number) => {
      if (index !== currentIndex && index >= 0 && index < historyData.length) {
        const newProgress = (index / (historyData.length - 1)) * 100;
        handleProgressChange(newProgress);
      }
    }, 100),
    [currentIndex, historyData, handleProgressChange]
  );

  return (
    <div className="space-y-3">
      {/* Playback Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 z-[1000] shadow-lg">
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handlePlayPause}
                  className="w-10 h-10 bg-primary cursor-pointer text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  {isPlaying ? (
                    // Pause Icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    // Play Icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </TooltipTrigger>

              <TooltipContent
                side="top"
                className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg"
              >
                <p>{isPlaying ? "Pause playback" : "Play playback"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleStop}
                  className="w-10 h-10 cursor-pointer bg-secondary text-secondary-foreground rounded-full flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              </TooltipTrigger>

              <TooltipContent
                side="top"
                className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg"
              >
                <p>Stop playback</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2 min-w-[200px]">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={(e) => handleProgressChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${progress}%, #e2e8f0 ${progress}%, #e2e8f0 100%)`,
              }}
            />
            <span className="text-xs text-muted-foreground min-w-[40px]">
              {progress?.toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center gap-1 border-l pl-3 border-border">
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-1 text-xs cursor-pointer rounded transition-colors ${
                  playbackSpeed === speed
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Animated Status Indicator */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent transition-opacity duration-300 rounded-b-lg"
          style={{ opacity: isPlaying ? 0.5 : 0 }}
        />
      </div>

      {/* ✅ Info Row - Only show if data is available */}
      {currentData && (
        <div className="flex gap-5 items-center">
          {/* Speed Indicator */}
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Gauge className="w-4 h-4" />
            <span>Speed</span>
            <span className="bg-gray-200 px-2 py-1 rounded-sm">
              {currentData.speed.toFixed(1)} kmph
            </span>
          </div>

          {/* Timestamp Info */}
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" />
            <span>Timestamp</span>
            <span className="bg-gray-200 px-2 py-1 rounded-sm">
              {date === "Invalid Date" ? "-- : --" : `${date} ${time}`}
            </span>
          </div>
        </div>
      )}

      <div className="w-full h-[1px] bg-gray-300"></div>

      {/* Speed vs Timeline Graph - Only show if not expanded and data available */}
      {!isExpanded && historyData && historyData.length > 0 && (
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
        [data-state="open"][data-side] {
          z-index: 9999 !important;
        }
      `}</style>
    </div>
  );
};

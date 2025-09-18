import React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Pause, ChevronDown, Gauge, Clock } from "lucide-react";
import { DeviceHistoryItem } from "@/data/sampleData";
import SpeedGraph from "./SpeedGraph";

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
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  currentIndex,
  totalPoints,
  onPlayPause,
  onSeek,
  onPrevious,
  onNext,
  playbackSpeed,
  onSpeedChange,
  currentData,
  historyData,
}) => {
  const speedOptions = [0.5, 1, 2, 4, 8];

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString("en-US"),
    };
  };

  const getSpeedColor = (speed: number) => {
    if (speed === 0) return "text-muted-foreground";
    if (speed <= 30) return "text-success";
    if (speed <= 60) return "text-warning";
    return "text-destructive";
  };

  const { date, time } = formatDateTime(currentData.createdAt);

  return (
    <div className="space-y-4">
      {/* Playback Controls */}

      <div className="flex gap-5 items-center">
        {/* Playback Control Buttons */}
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={onPlayPause}
            className="size-8 p-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full cursor-pointer relative overflow-hidden group transform transition-all duration-200 active:scale-95 hover:scale-105"
            style={{
              boxShadow: `
                  0 2px 8px rgba(0, 0, 0, 0.15),
                  0 1px 3px rgba(0, 0, 0, 0.1),
                  0 0 0 1px rgba(255, 255, 255, 0.05)
                `,
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

          {/* Timeline Slider */}
          <div>
            <Slider
              value={[currentIndex]}
              max={totalPoints - 1}
              min={0}
              step={1}
              onValueChange={(value) => onSeek(value[0])}
              className="w-40 cursor-pointer"
            />
          </div>
        </div>

        {/* Speed Control Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Speed:
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-20 justify-between"
              >
                {playbackSpeed}x
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-20"
              style={{ zIndex: 9999 }}
            >
              {speedOptions.map((speed) => (
                <DropdownMenuItem
                  key={speed}
                  onClick={() => onSpeedChange(speed)}
                  className={`cursor-pointer justify-center ${
                    playbackSpeed === speed
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                >
                  {speed}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Speed Indicator */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Gauge className="w-4 h-4" /> Speed
          <span className="bg-gray-200 px-2 py-1 rounded-sm">
            {currentData.speed.toFixed(1)} kmph
          </span>
        </div>

        {/* Timestamp Info */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Clock className="w-4 h-4" /> Timestamp
          <span className="bg-gray-200 px-2 py-1 rounded-sm">
            {date + " " + time}
          </span>
        </div>
      </div>

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

export default PlaybackControls;

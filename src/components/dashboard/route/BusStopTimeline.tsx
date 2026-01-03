import React from "react";
import { MapPin, Clock, CheckCircle2, Bus, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { BusStopWithStatus } from "@/interface/modal";

export interface BusStop {
  _id: string;
  geofenceName: string;
  pickupTime: string;
  dropTime: string;
  area: {
    center: [number, number];
    radius: number;
  };
  hasArrived?: boolean;
  isCurrent?: boolean;
  enteredAt?: string;
  exitedAt?: string;
  arrivedAt?: string;
}

interface BusStopTimelineProps {
  stops: (BusStop | BusStopWithStatus)[];
  currentStopIndex?: number;
}

export const BusStopTimeline: React.FC<BusStopTimelineProps> = ({
  stops,
  currentStopIndex = -1,
}) => {
  const [activeTab, setActiveTab] = React.useState<"pickup" | "drop">("pickup");

  const formatTime = (iso?: string) => {
    if (!iso) return "--";
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  };

  const getDurationUTC = (enteredAt?: string, exitedAt?: string) => {
    if (!enteredAt) return null;
    const start = new Date(enteredAt).getTime();
    const end = exitedAt ? new Date(exitedAt).getTime() : Date.now();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    let diff = Math.floor((end - start) / 1000);
    const hours = Math.floor(diff / 3600);
    diff %= 3600;
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const timeToMinutes = (time: string) => {
    const [hhmm, period] = time.split(" ");
    let [hours, minutes] = hhmm.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  return (
    <div className="relative pb-8">
      {/* Tabs */}
      {/* <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("pickup")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer",
            activeTab === "pickup"
              ? "bg-amber-500 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          )}
        >
          Pickup
        </button>
        <button
          onClick={() => setActiveTab("drop")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer",
            activeTab === "drop"
              ? "bg-amber-500 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          )}
        >
          Drop
        </button>
      </div> */}

      {stops.map((stop, index) => {
        const hasArrived = stop.hasArrived === true;
        const isCurrent = stop.isCurrent === true;
        const isPending = !hasArrived && !isCurrent;
        const isLast = index === stops.length - 1;
        const isCurrentSafe = isCurrent && !isLast;

        return (
          <div
            key={stop._id}
            // CHANGED: items-stretch ensures the left column (timeline) grows to match the card height
            className="relative flex items-stretch gap-4"
            style={{
              animation: `fade-in 0.4s ease-out ${index * 0.1}s forwards`,
              opacity: 0,
            }}
          >
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              {/* Dot indicator */}
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500 ease-out",
                  hasArrived &&
                    "bg-emerald-500 shadow-lg shadow-emerald-500/30",
                  isCurrentSafe &&
                    "bg-amber-500 shadow-lg shadow-amber-500/30 animate-pulse",
                  isPending &&
                    "bg-amber-500/15 border-2 border-amber-500 border-dashed"
                )}
              >
                {hasArrived ? (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                ) : isCurrentSafe ? (
                  <Bus className="h-5 w-5 text-white animate-bounce" />
                ) : (
                  <MapPin className="h-5 w-5 text-amber-500" />
                )}
              </div>

              {/* Connector Line */}
              {!isLast && (
                // CHANGED: Removed min-h-16. flex-1 now fills the space created by items-stretch
                <div className="relative w-0.5 flex-1 my-1">
                  <div
                    className={cn(
                      "absolute inset-0 w-full",
                      hasArrived
                        ? "bg-emerald-500"
                        : "border-l-2 border-dashed border-slate-300 left-1/2 -translate-x-1/2" // CHANGED: Dashed border implementation
                    )}
                  />
                  {/* Animated progress line for current stop */}
                  {isCurrentSafe && (
                    <div
                      className="absolute top-0 left-0 w-full bg-emerald-500 origin-top"
                      style={{
                        animation: "grow-line 2s ease-out forwards",
                        height: "50%",
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Stop details card */}
            <div className={cn("flex-1 pb-8 group", isLast && "pb-0")}>
              <div
                className={cn(
                  "rounded-xl p-4 transition-all duration-300",
                  hasArrived &&
                    "bg-emerald-500/10 border border-emerald-500/20",
                  isCurrentSafe &&
                    "bg-amber-500/10 border border-amber-500/30 shadow-lg",
                  isPending &&
                    "bg-card border border-border hover:border-amber-500/30 hover:shadow-md"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4
                      className={cn(
                        "font-semibold text-base truncate transition-colors",
                        hasArrived && "text-emerald-600",
                        isCurrentSafe && "text-foreground",
                        isPending && "text-muted-foreground"
                      )}
                    >
                      {stop.geofenceName || `Stop ${index + 1}`}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Pickup:{" "}
                          <span className="font-medium text-foreground">
                            {stop.pickupTime}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Drop:{" "}
                          <span className="font-medium text-foreground">
                            {stop.dropTime}
                          </span>
                        </span>
                      </div>
                      {stop.enteredAt && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600 font-medium">
                            Entered: {formatTime(stop.enteredAt)}
                          </span>
                        </div>
                      )}
                      {stop.exitedAt && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600 font-medium">
                            Exited: {formatTime(stop.exitedAt)}
                          </span>
                        </div>
                      )}
                      {stop.enteredAt && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Timer className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-blue-600 font-medium">
                            Halt:{" "}
                            {getDurationUTC(stop.enteredAt, stop.exitedAt)}
                          </span>
                        </div>
                      )}
                      {isCurrent && !stop.exitedAt && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Bus className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                          <span className="text-amber-600 font-medium">
                            Currently inside geofence
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all",
                      hasArrived && "bg-emerald-500 text-white",
                      isCurrentSafe && "bg-amber-500 text-white",
                      isPending && "bg-muted text-muted-foreground"
                    )}
                  >
                    {hasArrived
                      ? "Arrived"
                      : isCurrentSafe
                      ? "In Transit"
                      : "Pending"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes grow-line {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

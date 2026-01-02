import React from "react";
import { MapPin, Clock, CheckCircle2, Bus } from "lucide-react";
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
  return (
    <div className="relative py-4">
      {stops.map((stop, index) => {
        // Support both prop-based and data-based status determination
        const hasArrived =
          stop.hasArrived ||
          (currentStopIndex >= 0 && index < currentStopIndex);
        const isCurrent = stop.isCurrent || index === currentStopIndex;
        const isPending = !hasArrived && !isCurrent;
        const isLast = index === stops.length - 1;

        return (
          <div
            key={stop._id}
            className="relative flex items-start gap-4"
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
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500 ease-out",
                  hasArrived &&
                    "bg-emerald-500 shadow-lg shadow-emerald-500/30",
                  isCurrent &&
                    "bg-amber-500 shadow-lg shadow-amber-500/30 animate-pulse",
                  isPending &&
                    "bg-amber-500/15 border-2 border-amber-500 border-dashed"
                )}
              >
                {hasArrived ? (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                ) : isCurrent ? (
                  <Bus className="h-5 w-5 text-white animate-bounce" />
                ) : (
                  <MapPin className="h-5 w-5 text-amber-500" />
                )}
              </div>

              {/* Dotted line connector */}
              {!isLast && (
                <div className="relative w-0.5 flex-1 min-h-16">
                  <div
                    className={cn(
                      "absolute inset-0 w-0.5",
                      hasArrived ? "bg-emerald-500" : "bg-border"
                    )}
                    style={{
                      backgroundImage: hasArrived
                        ? undefined
                        : "repeating-linear-gradient(to bottom, hsl(var(--border)) 0px, hsl(var(--border)) 6px, transparent 6px, transparent 12px)",
                    }}
                  />
                  {/* Animated progress line for current stop */}
                  {isCurrent && (
                    <div
                      className="absolute top-0 left-0 w-0.5 bg-emerald-500 origin-top"
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
            <div className={cn("flex-1 pb-6 group", isLast && "pb-0")}>
              <div
                className={cn(
                  "rounded-xl p-4 transition-all duration-300",
                  hasArrived &&
                    "bg-emerald-500/10 border border-emerald-500/20",
                  isCurrent &&
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
                        isCurrent && "text-foreground",
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
                      {hasArrived && stop.arrivedAt && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600 font-medium">
                            Arrived:{" "}
                            {new Date(stop.arrivedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div
                    className={cn(
                      "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all",
                      hasArrived && "bg-emerald-500 text-white",
                      isCurrent && "bg-amber-500 text-white",
                      isPending && "bg-muted text-muted-foreground"
                    )}
                  >
                    {hasArrived
                      ? "Arrived"
                      : isCurrent
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
          from {
            transform: scaleY(0);
          }
          to {
            transform: scaleY(1);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

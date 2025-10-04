import React, { useEffect, useState, useRef } from "react";

interface DataRefreshIndicatorProps {
  onDataReceived?: () => void;
  intervalSeconds?: number;
  className?: string;
}

export const DataRefreshIndicator: React.FC<DataRefreshIndicatorProps> = ({
  onDataReceived,
  intervalSeconds = 10,
  className = "",
}) => {
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdown = () => {
    setCountdown(intervalSeconds);
    setIsActive(true);
    onDataReceived?.();
  };

  useEffect(() => {
    if (isActive && countdown > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            return intervalSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, countdown, intervalSeconds]);

  useEffect(() => {
    startCountdown();
  }, []);

  return (
    <div className="p-2 shadow rounded-l-full rounded-r-full">
      <div className={["inline-block", className].join(" ")}>
        <div
          className={[
            "relative flex items-center gap-1.5 px-3 py-1.5",

            "bg-white rounded-xl border-[4px] border-white",
          ].join(" ")}
        >
          {/* Glossy overlay */}
          <div
            className={[
              "pointer-events-none absolute inset-0 rounded-xl",
              "ring-[1.5px] ring-[#1c398e]",
              "bg-[linear-gradient(135deg,rgba(255,255,255,0.6)_0%,transparent_50%,rgba(255,255,255,0.2)_100%)]",
            ].join(" ")}
          />

          {/* Animated refresh icon - further reduced */}
          <div className="relative size-5 z-10">
            <svg
              className={[
                "size-full",
                "motion-safe:[animation-duration:2s]",
                isActive ? "motion-safe:animate-spin" : "",
                "drop-shadow-[0_1px_1px_rgba(30,58,138,0.15)]",
              ].join(" ")}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                className="stroke-blue-900 opacity-15"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M12 2.5C6.753 2.5 2.5 6.753 2.5 12"
                className="stroke-blue-900"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="1.5"
                className="fill-blue-900 opacity-30"
              />
            </svg>
          </div>

          {/* Text - compact sizing */}
          <div className="z-10 flex flex-col">
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-black leading-none text-blue-900 [text-shadow:1px_1px_0_rgba(30,58,138,0.1)]">
                {countdown}
              </span>
              <span className="text-[10px] font-bold text-blue-900/70">
                sec
              </span>
            </div>
          </div>

          {/* Accent dot - compact */}
          <div
            className={[
              "absolute -top-0.5 -right-0.5 size-3 rounded-full z-20",
              "bg-blue-900 border-2 border-white shadow-sm",
            ].join(" ")}
          />
        </div>

        {/* Peel corner - minimal */}
        <div
          className={[
            "pointer-events-none absolute -top-1 -right-1 size-5",
            "rounded-bl-[100%]",
            "bg-[linear-gradient(135deg,transparent_50%,rgba(0,0,0,0.05)_50%)]",
            "opacity-50",
          ].join(" ")}
        />
      </div>
    </div>
  );
};

export const useDataRefreshIndicator = (intervalSeconds = 10) => {
  const [key, setKey] = useState(0);
  const triggerRefresh = () => setKey((prev) => prev + 1);
  return { key, triggerRefresh };
};

export default DataRefreshIndicator;

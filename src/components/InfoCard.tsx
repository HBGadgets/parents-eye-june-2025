import * as React from "react";
import { cn } from "@/lib/utils";

interface InfoCardProps {
  color: string;
  label?: string;
  value?: string | number;
  icon: React.ReactNode;
  className?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  color,
  label,
  value,
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl shadow-md p-4 bg-white max-w-[170px] max-h-[88px] transition-transform hover:scale-105 cursor-pointer",
        className
      )}
      style={{
        borderLeft: `6px solid ${color}`,
      }}
    >
      <div className="flex flex-col justify-center">
        {label && (
          <div className="text-muted-foreground text-sm font-medium">
            {label}
          </div>
        )}
        {value !== undefined && (
          <div className="text-2xl font-bold text-foreground">{value}</div>
        )}
      </div>
      <div className="flex items-center justify-center">{icon}</div>
    </div>
  );
};

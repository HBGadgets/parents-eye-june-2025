import { reportService } from "@/services/api/reportService";
import { bleService } from "@/services/api/bleService";
import { calculateDistance } from "@/util/calculate-distance";
import { useQuery } from "@tanstack/react-query";

export interface HistoryReportFilters {
  uniqueId?: number | string;
  from?: string;
  to?: string;
  period?: string;
  isBle?: boolean;
  deviceCategory?: string;
}

export const useHistoryReport = (
  filters: HistoryReportFilters,
  enabled: boolean
) => {
  const isBle =
    Boolean(filters.isBle) ||
    filters.deviceCategory === "BLE" ||
    (typeof filters.uniqueId === "string" &&
      filters.uniqueId.startsWith("GeoTag-"));

  return useQuery({
    queryKey: [
      "history-report",
      filters.uniqueId,
      filters.from,
      filters.to,
      isBle,
    ],
    queryFn: async () => {
      if (isBle) {
        const identifier = String(filters.uniqueId);
        const beginTime = filters.from
          ? new Date(filters.from).getTime()
          : undefined;
        const endTime = filters.to
          ? new Date(filters.to).getTime()
          : undefined;

        const daysAgo = beginTime
          ? Math.max(7, Math.ceil((Date.now() - beginTime) / (24 * 3600 * 1000)) + 1)
          : 7;

        const params: Record<string, any> = {
          days: daysAgo,
        };
        if (beginTime && !isNaN(beginTime)) {
          params.beginTime = beginTime;
          params.from = filters.from;
        }
        if (endTime && !isNaN(endTime)) {
          params.endTime = endTime;
          params.to = filters.to;
        }

        const bleRes: any = await bleService.getDeviceHistory(identifier, params);
        const rawItems: any[] = Array.isArray(bleRes?.history)
          ? bleRes.history
          : Array.isArray(bleRes?.data?.history)
          ? bleRes.data.history
          : Array.isArray(bleRes?.data)
          ? bleRes.data
          : Array.isArray(bleRes)
          ? bleRes
          : [];

        // Robust timestamp parser (numeric ms, string number, or ISO string)
        const parseTime = (val: any): number => {
          if (!val) return 0;
          if (typeof val === "number") return val;
          const num = Number(val);
          if (!isNaN(num) && num > 0) return num;
          const ms = new Date(val).getTime();
          return isNaN(ms) ? 0 : ms;
        };

        // Filter items strictly within requested time range
        const historyItems = rawItems.filter((pt) => {
          const t = parseTime(pt.locationTime || pt.reportedTime);
          if (t === 0) return true;
          if (beginTime && !isNaN(beginTime) && t < beginTime) return false;
          if (endTime && !isNaN(endTime) && t > endTime) return false;
          return true;
        });

        // Sort chronologically ascending
        historyItems.sort((a, b) => {
          const tA = parseTime(a.locationTime || a.reportedTime);
          const tB = parseTime(b.locationTime || b.reportedTime);
          return tA - tB;
        });

        let cumulativeDistance = 0;
        const mappedPoints = historyItems.map((pt, idx) => {
          const t = parseTime(pt.locationTime || pt.reportedTime);
          const timestamp = t > 0 ? t : Date.now();
          const isoTime = new Date(timestamp).toISOString();

          let stepDistance = 0;
          if (idx > 0) {
            const prev = historyItems[idx - 1];
            stepDistance = calculateDistance(
              Number(prev.lat),
              Number(prev.lng),
              Number(pt.lat),
              Number(pt.lng)
            );
            cumulativeDistance += stepDistance;
          }

          return {
            deviceId: pt.sn || identifier,
            latitude: Number(pt.lat),
            longitude: Number(pt.lng),
            speed: 0,
            course: 0,
            createdAt: isoTime,
            deviceTime: isoTime,
            fixTime: isoTime,
            serverTime: isoTime,
            attributes: {
              ignition: true,
              distance: stepDistance,
              totalDistance: cumulativeDistance,
              battery: pt.battery,
              address: pt.address,
              accuracy: pt.accuracy,
              confidence: pt.confidence,
              batteryStatus: pt.batteryStatus,
            },
            address: pt.address,
            battery: pt.battery,
            rawBlePoint: pt,
          };
        });

        if (mappedPoints.length === 0) {
          return {
            deviceDataByTrips: [],
            isBle: true,
            rawBleHistory: bleRes,
          };
        }

        // Group points into trips if time gap between breadcrumbs > 60 minutes
        const trips: any[][] = [];
        let currentTrip: any[] = [];

        for (let i = 0; i < mappedPoints.length; i++) {
          const point = mappedPoints[i];
          if (currentTrip.length === 0) {
            currentTrip.push(point);
          } else {
            const lastPoint = currentTrip[currentTrip.length - 1];
            const prevTime = new Date(lastPoint.createdAt).getTime();
            const currTime = new Date(point.createdAt).getTime();

            if (currTime - prevTime > 60 * 60 * 1000) {
              trips.push(currentTrip);
              currentTrip = [point];
            } else {
              currentTrip.push(point);
            }
          }
        }
        if (currentTrip.length > 0) {
          trips.push(currentTrip);
        }

        return {
          deviceDataByTrips: trips,
          isBle: true,
          name: bleRes?.name,
          sn: bleRes?.sn,
          battery: bleRes?.battery,
          batteryStatus: bleRes?.batteryStatus,
          totalPoints: bleRes?.totalPoints,
          rawBleHistory: bleRes,
        };
      }

      return reportService.getHistoryReport({
        ...filters,
        period: "Custom",
      });
    },
    enabled: enabled && !!filters.uniqueId && !!filters.from && !!filters.to,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
};


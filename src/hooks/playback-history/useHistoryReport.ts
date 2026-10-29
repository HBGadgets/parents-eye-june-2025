import { reportService } from "@/services/api/reportService";
import { bleService } from "@/services/api/bleService";
import { calculateDistance } from "@/util/calculate-distance";
import { useQuery } from "@tanstack/react-query";

export interface HistoryReportFilters {
  uniqueId?: number | string;
  deviceId?: string;
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
      filters.deviceId || filters.uniqueId,
      filters.uniqueId,
      filters.from,
      filters.to,
      isBle,
    ],
    queryFn: async () => {
      if (isBle) {
        const targetDeviceId = String(filters.deviceId || filters.uniqueId);
        const beginTime = filters.from
          ? new Date(filters.from).getTime()
          : undefined;
        const endTime = filters.to
          ? new Date(filters.to).getTime()
          : undefined;

        const daysAgo = beginTime
          ? Math.max(7, Math.ceil((Date.now() - beginTime) / (24 * 3600 * 1000)) + 1)
          : 7;

        const formatToLocalLocationTime = (dateOrStr?: string | Date | number): string => {
          if (!dateOrStr) return "";
          const d = new Date(dateOrStr);
          if (isNaN(d.getTime())) return "";
          const YYYY = d.getFullYear();
          const MM = String(d.getMonth() + 1).padStart(2, "0");
          const DD = String(d.getDate()).padStart(2, "0");
          const HH = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          const ss = String(d.getSeconds()).padStart(2, "0");
          return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
        };

        const params: Record<string, any> = {
          startLocationTime: formatToLocalLocationTime(filters.from),
          endLocationTime: formatToLocalLocationTime(filters.to),
        };

        const bleRes: any = await bleService.getDeviceHistory(targetDeviceId, params);
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

        // Since backend already filters by startLocationTime and endLocationTime, keep all returned history items
        const historyItems = [...rawItems];

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
            deviceId: pt.sn || targetDeviceId || String(filters.uniqueId),
            latitude: Number(pt.lat),
            longitude: Number(pt.lng),
            speed: 0,
            course: 0,
            createdAt: isoTime,
            deviceTime: isoTime,
            fixTime: isoTime,
            serverTime: isoTime,
            locationTimeIST: pt.locationTimeIST,
            reportedTimeIST: pt.reportedTimeIST,
            attributes: {
              ignition: true,
              distance: stepDistance,
              totalDistance: cumulativeDistance,
              battery: pt.battery,
              address: pt.address,
              accuracy: pt.accuracy,
              confidence: pt.confidence,
              batteryStatus: pt.batteryStatus,
              locationTimeIST: pt.locationTimeIST,
              reportedTimeIST: pt.reportedTimeIST,
            },
            address: pt.address,
            battery: pt.battery,
            batteryStatus: pt.batteryStatus,
            accuracy: pt.accuracy,
            confidence: pt.confidence,
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
          totalPoints: bleRes?.total || bleRes?.totalPoints || mappedPoints.length,
          total: bleRes?.total || bleRes?.totalPoints || mappedPoints.length,
          timeRange: bleRes?.timeRange,
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


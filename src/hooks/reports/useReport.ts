"use client";

import { reportService } from "@/services/api/reportService";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginationState } from "@tanstack/react-table";

export const useReport = (
  pagination: PaginationState,
  filters: Record<string, any>,
  reportType?:
    | "status"
    | "stop"
    | "idle"
    | "distance"
    | "alerts-events"
    | "geofence-alerts"
    | "trip"
    | "travel-summary",
  hasGenerated?: boolean
) => {
  const isAll = pagination.pageSize === "all";

  const getStatusQuery = useQuery({
    queryKey: [
      "status-report",
      pagination.pageIndex,
      pagination.pageSize,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
    ],

    queryFn: () =>
      reportService.getStatusReport({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        uniqueId: filters?.uniqueId,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
      }),
    enabled:
      hasGenerated &&
      reportType === "status" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,

    staleTime: 10 * 60 * 1000,

    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const getStopReportQuery = useQuery({
    queryKey: [
      "stop-report",
      // pagination.pageIndex,
      // pagination.pageSize,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
      ...(isAll ? ["all"] : [pagination.pageIndex, pagination.pageSize]),
    ],

    queryFn: () =>
      reportService.getStopReport({
        // page: pagination.pageIndex + 1,
        // limit: pagination.pageSize,
        uniqueId: filters?.uniqueId,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
        ...(isAll
          ? { limit: "all" }
          : {
              page: pagination.pageIndex + 1,
              limit: pagination.pageSize,
            }),
      }),
    enabled:
      hasGenerated &&
      reportType === "stop" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,

    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const getIdleReportQuery = useQuery({
    queryKey: [
      "idle-report",
      pagination.pageIndex,
      pagination.pageSize,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
    ],

    queryFn: () =>
      reportService.getIdleReport({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        uniqueId: filters?.uniqueId,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
      }),
    enabled:
      hasGenerated &&
      reportType === "idle" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const getDistanceReportQuery = useQuery({
    queryKey: [
      "distance-report",
      pagination.pageIndex,
      pagination.pageSize,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
    ],

    queryFn: () =>
      reportService.getDistanceReport({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        uniqueIds: filters?.uniqueId,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
      }),
    enabled:
      hasGenerated &&
      reportType === "distance" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const getAertsAndEventsReportQuery = useQuery({
    queryKey: [
      "alerts-events-report",
      pagination.pageIndex,
      pagination.pageSize,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
    ],

    queryFn: () =>
      reportService.getAlertsEventsReport({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        uniqueId: filters?.uniqueId,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
      }),
    enabled:
      hasGenerated &&
      reportType === "alerts-events" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const getGeofenceAlertsReportQuery = useQuery({
    queryKey: [
      "geofence-alerts-report",
      pagination.pageIndex,
      pagination.pageSize,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
    ],

    queryFn: () =>
      reportService.getGeofenceAlertsReport({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        uniqueId: filters?.uniqueId,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
      }),
    enabled:
      hasGenerated &&
      reportType === "geofence-alerts" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const getTripReportQuery = useQuery({
    queryKey: [
      "trip-report",
      pagination.pageIndex,
      pagination.pageSize,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
    ],

    queryFn: () =>
      reportService.getTripReport({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        uniqueId: filters?.uniqueId,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
      }),
    enabled:
      hasGenerated &&
      reportType === "trip" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,

    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const getTravelSummaryReportQuery = useQuery({
    queryKey: [
      "travel-summary",
      pagination.pageIndex,
      pagination.pageSize,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
    ],

    queryFn: () =>
      reportService.getTripReport({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        uniqueId: filters?.uniqueId,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
      }),
    enabled:
      hasGenerated &&
      reportType === "travel-summary" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });

  return {
    statusReport: getStatusQuery.data?.data || [],
    stopReport: getStopReportQuery.data?.data || [],
    idleReport: getIdleReportQuery.data?.data || [],
    distanceReport: getDistanceReportQuery.data?.data || [],
    alertsAndEventsReport: getAertsAndEventsReportQuery.data?.data || [],
    geofenceAlertsReport: getGeofenceAlertsReportQuery.data?.data || [],
    tripReport: getTripReportQuery.data?.data || [],
    travelSummaryReport: getTravelSummaryReportQuery.data?.data || [],

    totalStatusReport: getStatusQuery.data?.total || 0,
    totalStopReport: getStopReportQuery.data?.total || 0,
    totalIdleReport: getIdleReportQuery.data?.total || 0,
    totalDistanceReport: getDistanceReportQuery.data?.total || 0,
    totalAlertsAndEventsReport: getAertsAndEventsReportQuery.data?.total || 0,
    totalGeofenceAlertsReport: getGeofenceAlertsReportQuery.data?.total || 0,
    totalTripReport: getTripReportQuery.data?.total || 0,
    totalTravelSummaryReport: getTravelSummaryReportQuery.data?.total || 0,

    isFetchingStatusReport: getStatusQuery.isFetching,
    isFetchingStopReport: getStopReportQuery.isFetching,
    isFetchingIdleReport: getIdleReportQuery.isFetching,
    isFetchingDistanceReport: getDistanceReportQuery.isFetching,
    isFetchingAlertsAndEventsReport: getAertsAndEventsReportQuery.isFetching,
    isFetchingGeofenceAlertsReport: getGeofenceAlertsReportQuery.isFetching,
    isFetchingTripReport: getTripReportQuery.isFetching,
    isFetchingTravelSummaryReport: getTravelSummaryReportQuery.isFetching,
  };
};

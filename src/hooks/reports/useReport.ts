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
    | "travel-summary"
) => {
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
    placeholderData: keepPreviousData,
    enabled:
      reportType === "status" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const getStopReportQuery = useQuery({
    queryKey: [
      "stop-report",
      pagination.pageIndex,
      pagination.pageSize,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
    ],

    queryFn: () =>
      reportService.getStopReport({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        uniqueId: filters?.uniqueId,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
      }),
    placeholderData: keepPreviousData,
    enabled:
      reportType === "stop" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    refetchOnWindowFocus: false,
    retry: false,
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
    placeholderData: keepPreviousData,
    enabled:
      reportType === "idle" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    refetchOnWindowFocus: false,
    retry: false,
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
    placeholderData: keepPreviousData,
    enabled:
      reportType === "distance" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    refetchOnWindowFocus: false,
    retry: false,
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
    placeholderData: keepPreviousData,
    enabled:
      reportType === "alerts-events" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    refetchOnWindowFocus: false,
    retry: false,
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
    placeholderData: keepPreviousData,
    enabled:
      reportType === "geofence-alerts" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    refetchOnWindowFocus: false,
    retry: false,
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
    placeholderData: keepPreviousData,
    enabled:
      reportType === "trip" &&
      !!filters?.uniqueId &&
      !!filters?.from &&
      !!filters?.to,
    refetchOnWindowFocus: false,
    retry: false,
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
     placeholderData: keepPreviousData,
     enabled:
       reportType === "travel-summary" &&
       !!filters?.uniqueId &&
       !!filters?.from &&
       !!filters?.to,
     refetchOnWindowFocus: false,
     retry: false,
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

import api from "@/lib/axios";

export const reportService = {
  getStatusReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/report/status", { params });
    return res.data;
  },

  getStopReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/report/stop-report", { params });
    return res.data;
  },

  getStoppageSummaryReport: async ({
    uniqueIds,
    ...params
  }: {
    uniqueIds?: number[];
    [key: string]: any;
  }): Promise<any> => {
    const res = await api.post(
      "/report/stoppage-summary",
      { uniqueIds },
      { params }
    );
    return res.data;
  },

  getIdleReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/report/idle-report", { params });
    return res.data;
  },

  getDistanceReport: async ({
    uniqueIds,
    ...params
  }: {
    uniqueIds: number[];
    page: number;
    limit: number;
    period: string;
    from: string;
    to: string;
  }): Promise<any> => {
    const res = await api.post(
      "/report/distance-report",
      { uniqueIds },
      { params }
    );

    return res.data;
  },

  getAlertsEventsReport: async ({
    uniqueId,
    ...params
  }: {
    uniqueId: number[];
    page: number;
    limit: number;
    period: string;
    from: string;
    to: string;
  }): Promise<any> => {
    const res = await api.post("/report/allevents", { uniqueId }, { params });
    return res.data;
  },

  getGeofenceAlertsReport: async ({
    uniqueIds,
    ...params
  }: {
    uniqueIds?: any;
    [key: string]: any;
  }): Promise<any> => {
    const res = await api.post(
      "/report/geofenceevent",
      { uniqueIds },
      { params }
    );
    return res.data;
  },

  getTripReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/report/trip-summary-report", { params });
    return res.data;
  },

  getTravelSummaryReport: async ({
    uniqueIds,
    ...params
  }: {
    uniqueIds: number[];
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    period: string;
    from: string;
    to: string;
  }): Promise<any> => {
    const res = await api.post(
      "/report/travel-summary-report",
      { uniqueIds },
      { params }
    );

    return res.data;
  },

  getRouteReport: async ({
    uniqueIds,
    ...params
  }: {
    uniqueIds: number[];
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    period: string;
    from: string;
    to: string;
  }): Promise<any> => {
    const res = await api.post(
      "/report/routeCompletion",
      { uniqueIds },
      { params }
    );
    return res.data;
  },

  getHistoryReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/device-trips-with-route", { params });
    return res.data;
  },
};

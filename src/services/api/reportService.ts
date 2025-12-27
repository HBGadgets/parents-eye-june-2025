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

  getIdleReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/report/idle-report", { params });
    return res.data;
  },

  getDistanceReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/report/distance-report", { params });
    return res.data;
  },

  getAlertsEventsReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/report/alerts-events-report", { params });
    return res.data;
  },

  getGeofenceAlertsReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/report/geofence-alerts-report", { params });
    return res.data;
  },

  getTripReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/report/trip-summary-report", { params }); 
    return res.data;
  },

  getTravelSummaryReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/report/travel-summary-report", { params }); 
    return res.data;
  },

  getRouteReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/report/route-report", { params }); 
    return res.data;
  },

  getHistoryReport: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("/device-trips-with-route", { params }); 
    return res.data;
  }
};

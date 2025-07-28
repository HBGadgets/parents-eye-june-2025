import { Geofence } from "@/interface/modal";
import { api } from "@/services/apiService";

// GET
export const fetchGeofences = async (): Promise<Geofence[]> => {
  const res = await api.get("/geofence");
  return res.data;
};

// POST
export const createGeofence = async (data: Omit<Geofence, "id">) => {
  const res = await api.post("/geofence", data);
  return res.data;
};

// PUT (Update)
export const updateGeofence = async (geofence: Geofence) => {
  const res = await api.put(`/geofence/${geofence._id}`, geofence);
  return res.data;
};

// DELETE
export const deleteGeofenceApi = async (id: string) => {
  const res = await api.delete(`geofence/${id}`);
  return res.data;
};

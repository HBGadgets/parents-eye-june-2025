import api from "@/lib/axios";

export interface RosterShift {
  _id?: string;
  routeObjId: {
    _id: string;
    routeNumber?: string;
    routeCompletionTime?: number;
    startPointGeoId?: {
      _id?: string;
      geofenceName?: string;
      address?: string;
    } | string;
    endPointGeoId?: {
      _id?: string;
      geofenceName?: string;
      address?: string;
    } | string;
  } | any;
  driverObjId?: {
    _id: string;
    driverName?: string;
    mobileNo?: string;
  } | null;
  startTime: string;
  endTime: string;
}

export interface RosterItem {
  _id: string;
  isActive: boolean;
  deviceObjId: {
    _id: string;
    name: string;
    uniqueId?: string;
  };
  schoolId?: any;
  branchId?: any;
  shifts: RosterShift[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRosterPayload {
  deviceObjId: string;
  shifts: {
    _id?: string;
    routeObjId: string;
    startTime: string;
    endTime: string;
  }[];
}

export interface UpdateRosterPayload {
  replaceShifts?: boolean;
  shifts: {
    _id?: string;
    routeObjId: string;
    startTime: string;
    endTime: string;
  }[];
}

export interface UpdateShiftPayload {
  routeObjId?: string;
  startTime?: string;
  endTime?: string;
}

export const rosterService = {
  getRosters: async (
    params?: Record<string, any>
  ): Promise<{ success: boolean; data: RosterItem[] }> => {
    const res = await api.get("/roster", { params });
    return res.data;
  },

  createRoster: async (payload: CreateRosterPayload) => {
    const res = await api.post("/roster", payload);
    return res.data;
  },

  updateRoster: async (
    id: string,
    payload: UpdateRosterPayload
  ) => {
    const res = await api.put(`/roster/${id}`, payload);
    return res.data;
  },

  updateShift: async (
    rosterId: string,
    shiftId: string,
    payload: UpdateShiftPayload
  ) => {
    const res = await api.put(`/roster/${rosterId}/shift/${shiftId}`, payload);
    return res.data;
  },

  deleteRoster: async (id: string) => {
    const res = await api.delete(`/roster/${id}`);
    return res.data;
  },

  deleteShift: async (rosterId: string, shiftId: string) => {
    const res = await api.delete(`/roster/${rosterId}/shift/${shiftId}`);
    return res.data;
  },

  toggleRosterStatus: async (id: string, isActive: boolean) => {
    const res = await api.patch(`/roster/${id}/status`, { isActive });
    return res.data;
  },
};


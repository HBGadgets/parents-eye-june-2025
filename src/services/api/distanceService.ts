import api from "@/lib/axios";

export const distanceService = {
    getDistance: async (params: Record<string, any>): Promise<any> => {
        const res = await api.get("/todayCurrentDistance", { params });
        return res.data;
    }
};
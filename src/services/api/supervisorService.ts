import api from "@/lib/axios";

export const supervisorService = {
    getSupervisor: async (params: Record<string, any>) => {
        const res = await api.get("/supervisor", { params });
        return res.data;
    },

    createSupervisor: async (payload: any) => {
        const res = await api.post("/supervisor", payload);
        return res.data;
    },

    updateSupervisor: async (id: string, payload: any) => {
        const res = await api.put(`/supervisor/${id}`, payload);
        return res.data;
    },

    deleteSupervisorById: async (id: string) => {
        const res = await api.delete(`/supervisor/${id}`);
        return res.data;
    },

    supervisorApprove: async (id: string, status: string) => {
        const res = await api.put(`/supervisor/approve/${id}`, { status });
        return res.data;
    },
};
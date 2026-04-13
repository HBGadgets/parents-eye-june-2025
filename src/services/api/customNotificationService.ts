import api from "@/lib/axios";


export const customNotificationService = {
    getCustomMessages: async (params?: any) => {
        const res = await api.get("/send/custom/msg", { params });
        return res.data;
    },

    sendCustomMessage: async (formData: FormData) => {
        const res = await api.post("/send/custom/msg", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    },
};

import api from "@/lib/axios";

export const subscriptionExpiryService = {
    getSubscriptionExpiry: async () => {
        const res = await api.get("/branch/subscription/expired");
        return res.data;
    },
}